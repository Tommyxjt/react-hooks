import type { RefObject } from 'react';
import { useStableCallback } from '../_internal/react/useStableCallback';
import { useSafeLayoutEffect } from '../_internal/react/useSafeLayoutEffect';
import useTargetEffect from '../useTargetEffect';

/**
 * 说明：
 * - 这个 Hook 只处理 Web / EventTarget 风格的事件订阅（addEventListener / removeEventListener）
 * - 不处理 React Native 的 addListener / remove 模型
 *
 * TODO：后续单独做 useSubscription 作为更为跨平台的事件订阅 hook
 */

/**
 * 可被监听的目标对象
 *  - window / document / HTMLElement / WebSocket / EventSource ...
 *
 * 为什么支持 null | undefined?
 *  - 组件初始化时，DOM 还没挂载，ref.current 通常就是 null
 *  - 条件启用 / 延迟注入 target的场景可能会先传 undefined
 *  - 当 target 为 null | undefined 时，会直接跳过此次绑定，等下次 render target 可用再进行绑定
 */
export type NativeListenerTarget = EventTarget | null | undefined;

/**
 * 支持直接传目标对象，或传 ref（ref.current）
 */
type ListenerTargetInput =
  | NativeListenerTarget
  | RefObject<NativeListenerTarget>
  | { current: NativeListenerTarget };

/**
 * effect 执行时机：
 * - effect: 默认，渲染后绑定
 * - layout: 渲染前同步绑定（用于布局测量 / 防闪烁）
 */
type ListenerEffectMode = 'effect' | 'layout';

/**
 * useEventListener 配置项
 */
export interface UseEventListenerOptions {
  /** 是否启用监听（建议默认 true） */
  isEnabled?: boolean;

  /** addEventListener 配置：capture */
  useCapture?: boolean;

  /** addEventListener 配置：passive */
  isPassive?: boolean;

  /** addEventListener 配置：once */
  shouldTriggerOnce?: boolean;

  /**
   * 选择 useEffect / useLayoutEffect
   * - SSR 下 layout 会自动降级为 effect（通过 layoutEffectHook 注入实现）
   */
  effectMode?: ListenerEffectMode;
}

/**
 * 主 Hook：声明式管理原生事件订阅生命周期
 *
 * 设计要点：
 * 1) handler 用 useStableCallback 包装，保证引用稳定 + 内部逻辑始终最新
 * 2) target 支持直接对象 / ref.current
 * 3) SSR 下 layout 自动降级
 * 4) 仅在“需要重绑”的场景触发 add/remove（由 useTargetEffect 负责 target/ref.current 比较）
 * 5) ref target 为了兼容条件挂载场景，会采用“每次 render 检查一次 + 精准重建”的模式（useRefTargetEffect 内部实现）
 */
function useEventListener<EventPayload extends Event = Event>(
  eventName: string,
  listenerHandler: (event: EventPayload) => void,
  listenerTarget: ListenerTargetInput,
  listenerOptions: UseEventListenerOptions = {},
): void {
  const {
    isEnabled = true,
    useCapture = false,
    isPassive,
    shouldTriggerOnce,
    effectMode = 'effect',
  } = listenerOptions;

  /**
   * 关键点：
   * - stableListenerHandler 的函数引用稳定（方便 add / remove 成对）
   * - 但内部执行逻辑始终是最新的 listenerHandler（避免闭包陷阱）
   */
  const stableListenerHandler = useStableCallback(listenerHandler);

  /**
   * 这里需要把业务 handler 视为原生 EventListener 使用。
   * EventPayload 已约束 extends Event，因此这里做一次类型收敛即可。
   */
  const nativeEventListener = stableListenerHandler as unknown as EventListener;

  /**
   * useTargetEffect 会自动处理：
   * - direct target：按 deps 精确重建
   * - ref target：比较 ref.current + deps，变化才 cleanup/re-run（避免每次 render 都重挂）
   */
  useTargetEffect(
    (resolvedListenerTarget) => {
      // 1) 订阅配置：关闭状态 => 不创建订阅
      if (!isEnabled) {
        return;
      }

      // 2) target 不可用（null / SSR / 非 EventTarget）=> 不创建订阅
      if (!canAttachEventListener(resolvedListenerTarget)) {
        return;
      }

      // 3) 根据订阅配置生成原生监听参数
      const nativeListenerOptions = buildNativeListenerOptions({
        useCapture,
        isPassive,
        shouldTriggerOnce,
      });

      // 4) 创建当前订阅（attach）
      attachEventListener(
        resolvedListenerTarget,
        eventName,
        nativeEventListener,
        nativeListenerOptions,
      );

      // 5) 结束当前订阅（cleanup / detach）
      return () => {
        detachEventListener(
          resolvedListenerTarget,
          eventName,
          nativeEventListener,
          nativeListenerOptions,
        );
      };
    },
    listenerTarget,
    [eventName, isEnabled, useCapture, isPassive, shouldTriggerOnce],
    {
      effectMode,
      layoutEffectHook: useSafeLayoutEffect,
    },
  );
}

/**
 * 判断 target 是否支持 addEventListener / removeEventListener
 * - null / undefined / 非 EventTarget => false
 * - SSR 场景下如果没有真实 target，也会安全返回 false
 */
function canAttachEventListener(target: NativeListenerTarget): target is EventTarget {
  return (
    !!target &&
    typeof (target as EventTarget).addEventListener === 'function' &&
    typeof (target as EventTarget).removeEventListener === 'function'
  );
}

/**
 * 构建 addEventListener 的配置对象
 * 注意：
 * - removeEventListener 实际匹配关键主要是 capture
 * - 这里仍然传同一份对象，语义更清晰、也更不容易写错
 */
function buildNativeListenerOptions(config: {
  useCapture: boolean;
  isPassive?: boolean;
  shouldTriggerOnce?: boolean;
}): AddEventListenerOptions {
  return {
    capture: config.useCapture,
    passive: config.isPassive,
    once: config.shouldTriggerOnce,
  };
}

/**
 * 统一执行 addEventListener
 * 作用：
 *  - 让主 Hook 流程更清楚（attach / detach 成对）
 *  - 后续如果要加调试日志或兼容处理，这里是统一入口
 */
function attachEventListener(
  listenerTarget: EventTarget,
  eventName: string,
  nativeEventListener: EventListener,
  nativeListenerOptions?: AddEventListenerOptions,
): void {
  listenerTarget.addEventListener(eventName, nativeEventListener, nativeListenerOptions);
}

/**
 * 统一执行 removeEventListener
 */
function detachEventListener(
  listenerTarget: EventTarget,
  eventName: string,
  nativeEventListener: EventListener,
  nativeListenerOptions?: AddEventListenerOptions,
): void {
  listenerTarget.removeEventListener(eventName, nativeEventListener, nativeListenerOptions);
}

export default useEventListener;
