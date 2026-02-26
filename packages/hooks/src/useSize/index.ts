import { useState } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import { useSafeLayoutEffect } from '../_internal/react/useSafeLayoutEffect';
import useTargetEffect from '../useTargetEffect';

/**
 * 说明：
 * - 这个 Hook 面向 Web / DOM 场景（仅观察元素尺寸，不处理 window）
 * - 内部使用 ResizeObserver 监听尺寸变化
 * - 同时会在挂载（或 target 变化）时主动测量一次，避免首屏必须等待 observer 回调
 */

/**
 * 可被测量尺寸的目标对象
 *
 * 为什么支持 null | undefined?
 * - ref.current 首轮渲染通常为 null
 * - 条件渲染 / 延迟挂载场景 target 可能暂不可用
 * - target 不可用时会安全跳过，待后续可用后自动生效
 */
export type SizeTarget = Element | null | undefined;

/**
 * 支持直接传元素，或传 ref（ref.current）
 */
export type SizeTargetInput = SizeTarget | RefObject<SizeTarget> | { current: SizeTarget };

type SizeEffectMode = 'effect' | 'layout';

export interface UseSizeOptions {
  /**
   * effect 执行时机：
   * - effect: 默认，渲染后测量/订阅
   * - layout: 渲染前同步测量/订阅（SSR 下自动降级）
   */
  effectMode?: SizeEffectMode;
}

export interface Size {
  width: number;
  height: number;
}

/**
 * useSize
 *
 * 观察元素尺寸并返回当前 width / height
 *
 * 设计要点：
 * 1) 首次挂载（或 target 变化）时主动测量一次尺寸
 * 2) 后续通过 ResizeObserver 监听变化并更新
 * 3) ref target 不会被提前解引用，避免首轮 commit 后漏绑
 * 4) 尺寸未变化时复用旧值，避免无意义 rerender
 */
function useSize(target: SizeTargetInput, options: UseSizeOptions = {}): Size | undefined {
  const { effectMode = 'effect' } = options;

  const [size, setSize] = useState<Size | undefined>(undefined);

  /**
   * 统一调度（语法糖）：
   * - direct target：按依赖精确重建 observation
   * - ref target：内部比较 ref.current，变化才 cleanup + re-run（避免每次 render 都重挂）
   *
   * 注意：
   * - 这里必须传原始 target（尤其是 ref），不要提前解引用
   * - layout 模式通过注入 useSafeLayoutEffect，实现 SSR 下自动降级
   */
  useTargetEffect(
    (resolvedTarget) => {
      return createSizeObservationEffect(resolvedTarget, setSize);
    },
    target,
    [],
    {
      effectMode,
      layoutEffectHook: useSafeLayoutEffect,
    },
  );

  return size;
}

/**
 * 创建“当前这一轮”的尺寸观察副作用：
 * - 先主动测量一次（初始化同步）
 * - 再尝试建立 ResizeObserver 订阅（若运行环境支持）
 *
 * 注意：
 * - resolvedTarget 是“解析后的真实目标”（Element | null | undefined）
 * - target 不可用时会清空 size（带去重）
 */
function createSizeObservationEffect(
  resolvedTarget: SizeTarget,
  setSize: Dispatch<SetStateAction<Size | undefined>>,
): (() => void) | undefined {
  if (!canMeasureSize(resolvedTarget)) {
    clearSize(setSize);
    return;
  }

  // 1) 初始化同步（避免首屏拿不到值）
  syncElementSize(resolvedTarget, setSize);

  // 2) 环境不支持 ResizeObserver：仅保留初始化测量
  if (typeof ResizeObserver === 'undefined') {
    return;
  }

  // 3) 建立尺寸观察订阅
  const resizeObserver = new ResizeObserver(() => {
    syncElementSize(resolvedTarget, setSize);
  });

  resizeObserver.observe(resolvedTarget);

  // 4) 清理当前订阅
  return () => {
    resizeObserver.disconnect();
  };
}

/**
 * 目标不可用时清空尺寸（带去重）
 */
function clearSize(setSize: Dispatch<SetStateAction<Size | undefined>>): void {
  setSize((previousSize) => (typeof previousSize === 'undefined' ? previousSize : undefined));
}

/**
 * 同步当前元素尺寸到 state（带去重）
 */
function syncElementSize(
  elementTarget: Element,
  setSize: Dispatch<SetStateAction<Size | undefined>>,
): void {
  const currentSize = readElementSize(elementTarget);

  setSize((previousSize) => getNextSize(previousSize, currentSize));
}

/**
 * 判断 target 是否可测量尺寸
 */
function canMeasureSize(target: SizeTarget): target is Element {
  return isElementTarget(target);
}

/**
 * 读取元素当前尺寸
 * - 使用 getBoundingClientRect 获取布局尺寸
 */
function readElementSize(elementTarget: Element): Size {
  const rect = elementTarget.getBoundingClientRect();

  return {
    width: rect.width,
    height: rect.height,
  };
}

/**
 * 计算下一次 state：
 * - 尺寸相同：复用 previousSize，避免无意义 rerender
 * - 尺寸变化：返回新值
 */
function getNextSize(previousSize: Size | undefined, currentSize: Size): Size {
  if (
    previousSize &&
    previousSize.width === currentSize.width &&
    previousSize.height === currentSize.height
  ) {
    return previousSize;
  }

  return currentSize;
}

/**
 * 判断是否为 Element
 */
function isElementTarget(value: unknown): value is Element {
  return !!value && typeof value === 'object' && (value as Element).nodeType === 1;
}

export default useSize;
