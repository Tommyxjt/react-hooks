import { useState } from 'react';
import type { RefObject } from 'react';
import { useSafeLayoutEffect } from '../_internal/react/useSafeLayoutEffect';
import useEventListener, { NativeListenerTarget } from '../useEventListener';
import useTargetEffect from '../useTargetEffect';

/**
 * 说明：
 * - 这个 Hook 面向 Web / DOM 场景（window / document / element 的滚动位置）
 * - 内部复用 useEventListener 管理 scroll 事件订阅生命周期
 * - 本 Hook 只负责“读取当前滚动位置 + 同步到 React 状态”
 *
 * TODO：
 * - 可通过与 useThrottle / useRaf 系列组合额外暴露一些语法糖 hooks
 */

/**
 * 可读取滚动位置的目标对象：
 * - window
 * - document
 * - element（含 HTMLElement）
 *
 * 为什么支持 null | undefined?
 * - ref.current 首轮渲染通常是 null
 * - 条件渲染 / 延迟挂载场景 target 可能暂不可用
 * - target 不可用时会安全跳过，待后续可用时自动生效
 */
export type ScrollTarget = Window | Document | Element | null | undefined;

interface ScrollTargetRef {
  readonly current: ScrollTarget;
}

export type ScrollTargetInput = ScrollTarget | RefObject<ScrollTarget> | { current: ScrollTarget };

type ScrollEffectMode = 'effect' | 'layout';

export interface UseScrollOptions {
  /** 是否启用监听 */
  isEnabled?: boolean;

  /**
   * effect 执行时机：
   * - effect: 默认，渲染后绑定/同步
   * - layout: 渲染前同步绑定/同步（SSR 下自动降级）
   */
  effectMode?: ScrollEffectMode;
}

export interface ScrollPosition {
  x: number;
  y: number;
}

/**
 * 主 Hook：订阅滚动事件并返回当前滚动位置
 *
 * 设计要点：
 * 1) 复用 useEventListener 管理原生 scroll 订阅
 * 2) 支持 window / document / element / ref.current
 * 3) 首次挂载（或 target 变化）时主动同步一次当前位置（避免必须先滚动一次才拿到值）
 * 4) ref target 不会被提前解引用，避免首轮 commit 后漏绑
 */
function useScroll(
  scrollTarget: ScrollTargetInput,
  options: UseScrollOptions = {},
): ScrollPosition | undefined {
  const { isEnabled = true, effectMode = 'effect' } = options;

  const [scrollPosition, setScrollPosition] = useState<ScrollPosition | undefined>(undefined);

  /**
   * 订阅层：
   * - 直接复用 useEventListener
   * - 注意：这里必须传原始 scrollTarget（尤其是 ref），不要提前解引用
   */
  useEventListener(
    'scroll',
    () => {
      if (!isEnabled) {
        return;
      }

      const currentPosition = readCurrentScrollPositionFromInput(scrollTarget);

      setScrollPosition((previousPosition) =>
        getNextScrollPosition(previousPosition, currentPosition),
      );
    },
    scrollTarget as NativeListenerTarget | { current: NativeListenerTarget },
    {
      isEnabled,
      useCapture: false,
      isPassive: true,
      effectMode,
    },
  );

  /**
   * 初始化同步：
   * - 挂载时（或 target 变化时）主动读取一次当前位置
   * - 否则可能要等用户滚动一次才有值
   *
   * 对 ref target 的处理策略：
   * - ref target：每次 render 都检查一次（依赖省略），避免漏掉“commit 后 ref.current 才可用”的时机
   * - 直接 target：按依赖精确同步
   */
  const syncScrollPosition = () => {
    if (!isEnabled) {
      return;
    }

    const currentPosition = readCurrentScrollPositionFromInput(scrollTarget);

    setScrollPosition((previousPosition) =>
      getNextScrollPosition(previousPosition, currentPosition),
    );
  };

  useTargetEffect(
    () => {
      syncScrollPosition();
    },
    scrollTarget,
    [isEnabled],
    {
      effectMode,
      layoutEffectHook: useSafeLayoutEffect,
    },
  );

  return scrollPosition;
}

/**
 * 读取“当前输入”对应的滚动位置（兼容 ref / 直接对象）
 */
function readCurrentScrollPositionFromInput(
  scrollTargetInput: ScrollTargetInput,
): ScrollPosition | undefined {
  const resolvedScrollTarget = resolveScrollTarget(scrollTargetInput);

  return readScrollPosition(resolvedScrollTarget);
}

/**
 * 解析滚动目标：
 * - 传 ref：返回 ref.current
 * - 直接传对象：原样返回
 */
function resolveScrollTarget(scrollTargetInput: ScrollTargetInput): ScrollTarget {
  if (isRefObject(scrollTargetInput)) {
    return scrollTargetInput.current;
  }

  return scrollTargetInput;
}

/**
 * 读取具体 target 的滚动位置
 * - window: 使用 scrollX / scrollY（并兼容 pageXOffset / pageYOffset）
 * - document: 使用 scrollingElement（回退 documentElement / body）
 * - element: 使用 scrollLeft / scrollTop
 */
function readScrollPosition(scrollTarget: ScrollTarget): ScrollPosition | undefined {
  if (!scrollTarget) {
    return undefined;
  }

  if (isWindowTarget(scrollTarget)) {
    return {
      x: readWindowScrollX(scrollTarget),
      y: readWindowScrollY(scrollTarget),
    };
  }

  if (isDocumentTarget(scrollTarget)) {
    const scrollingElement =
      scrollTarget.scrollingElement || scrollTarget.documentElement || scrollTarget.body;

    if (!scrollingElement) {
      return undefined;
    }

    return {
      x: scrollingElement.scrollLeft,
      y: scrollingElement.scrollTop,
    };
  }

  if (isElementTarget(scrollTarget)) {
    return {
      x: scrollTarget.scrollLeft,
      y: scrollTarget.scrollTop,
    };
  }

  return undefined;
}

/**
 * 计算下一次 state：
 * - 值相同：复用 previousPosition，避免无意义 rerender
 * - 值变化：返回新对象
 * - 目标不可用：返回 undefined（并在必要时清空旧值）
 */
function getNextScrollPosition(
  previousPosition: ScrollPosition | undefined,
  currentPosition: ScrollPosition | undefined,
): ScrollPosition | undefined {
  if (!currentPosition) {
    return typeof previousPosition === 'undefined' ? previousPosition : undefined;
  }

  if (
    previousPosition &&
    previousPosition.x === currentPosition.x &&
    previousPosition.y === currentPosition.y
  ) {
    return previousPosition;
  }

  return currentPosition;
}

/**
 * 判断一个值是否为 ref 对象
 */
function isRefObject(value: unknown): value is ScrollTargetRef {
  return typeof value === 'object' && value !== null && 'current' in value;
}

/**
 * 判断是否为 window
 */
function isWindowTarget(value: unknown): value is Window {
  if (!value || typeof value !== 'object') {
    return false;
  }

  /**
   * 经典判断：
   * - window.window === window
   */
  return (value as Window).window === value;
}

/**
 * 判断是否为 document
 */
function isDocumentTarget(value: unknown): value is Document {
  return !!value && typeof value === 'object' && (value as Document).nodeType === 9;
}

/**
 * 判断是否为 Element
 */
function isElementTarget(value: unknown): value is Element {
  return !!value && typeof value === 'object' && (value as Element).nodeType === 1;
}

/**
 * 安全读取 window.scrollX / scrollY（兼容旧属性）
 */
function readWindowScrollX(windowTarget: Window): number {
  if (typeof windowTarget.scrollX === 'number') {
    return windowTarget.scrollX;
  }

  if (typeof windowTarget.pageXOffset === 'number') {
    return windowTarget.pageXOffset;
  }

  return 0;
}

function readWindowScrollY(windowTarget: Window): number {
  if (typeof windowTarget.scrollY === 'number') {
    return windowTarget.scrollY;
  }

  if (typeof windowTarget.pageYOffset === 'number') {
    return windowTarget.pageYOffset;
  }

  return 0;
}

export default useScroll;
