import type { RefObject } from 'react';
import useEventListener, { NativeListenerTarget } from '../useEventListener';

/**
 * 说明：
 * - 这个 Hook 面向 Web / DOM 场景（点击外部关闭）
 * - 内部复用 useEventListener 做事件订阅生命周期管理
 * - 本 Hook 只负责“是否点击到白名单区域之外”的语义判断
 *
 * 设计拆分：
 * 1) listenerContainer（外层监听容器）：事件绑在哪里（默认 document）
 * 2) protectedTargets（白名单区域）：哪些节点算“内部区域”
 */

/**
 * 白名单区域目标：
 * - 语义：这些节点都算“内部区域”
 * - 点击命中其中任意一个节点（或其子节点）时，不触发 onClickAway
 *
 * 这里收敛为 Node（而不是宽泛 EventTarget）：
 * - click-away 的 inside/outside 判断依赖 contains / composedPath
 * - 这些能力都基于 DOM Node
 */
export type ClickAwayProtectedTarget = Node | null | undefined;

interface ClickAwayProtectedTargetRef {
  readonly current: ClickAwayProtectedTarget;
}

/**
 * 支持：
 * - 单个节点 / ref
 * - 多个节点 / ref（常用于 trigger + panel）
 */
export type ClickAwayProtectedTargetsInput =
  | ClickAwayProtectedTarget
  | RefObject<ClickAwayProtectedTarget>
  | { current: ClickAwayProtectedTarget }
  | Array<
      | ClickAwayProtectedTarget
      | RefObject<ClickAwayProtectedTarget>
      | { current: ClickAwayProtectedTarget }
    >;

/**
 * 外层监听容器：
 * - 语义：事件订阅绑在哪里（默认 document）
 * - 常见值：document / 某个局部容器节点
 */
export type ClickAwayListenerContainer = NativeListenerTarget;

interface ClickAwayListenerContainerRef {
  readonly current: ClickAwayListenerContainer;
}

export type ClickAwayListenerContainerInput =
  | ClickAwayListenerContainer
  | RefObject<ClickAwayListenerContainer>
  | { current: ClickAwayListenerContainer };

/**
 * 支持的事件名（单个）
 * - 故意不支持数组，避免一次用户操作触发多个事件时产生重复触发/行为不一致
 * - 如确有多事件需求，建议调用方自行组合多个 useEventListener
 */
export type ClickAwayEventName =
  | 'pointerdown'
  | 'mousedown'
  | 'mouseup'
  | 'click'
  | 'touchstart'
  | 'touchend';

type ClickAwayEffectMode = 'effect' | 'layout';

export interface UseClickAwayOptions {
  /** 是否启用监听 */
  isEnabled?: boolean;

  /**
   * 监听事件名（单个）
   * - 默认 pointerdown（更适合 click-away 场景）
   */
  eventName?: ClickAwayEventName;

  /**
   * 外层监听容器（事件绑定位置）
   * - 默认 document
   * - 可配置为某个局部容器节点
   */
  listenerContainer?: ClickAwayListenerContainerInput;

  /**
   * 是否使用捕获阶段
   * - 默认 true（更稳，能避免内部 stopPropagation 导致监听不到）
   */
  useCapture?: boolean;

  /**
   * 是否使用 passive
   * - 默认 true（click/pointer/touch 场景通常合适）
   */
  isPassive?: boolean;

  /** 是否只触发一次 */
  shouldTriggerOnce?: boolean;

  /**
   * effect 执行时机
   * - effect: 默认，渲染后绑定
   * - layout: 渲染前同步绑定（SSR 下自动降级由 useEventListener 内部处理）
   */
  effectMode?: ClickAwayEffectMode;
}

/**
 * 主 Hook：监听“外层容器”的原生事件，并在点击发生在白名单区域之外时触发回调
 *
 * 设计要点：
 * 1) 直接复用 useEventListener（不重复造订阅生命周期轮子）
 * 2) listenerContainer 与 protectedTargets 语义分离
 * 3) protectedTargets 在事件触发时动态解析（兼容 ref.current 变化）
 * 4) SSR 安全：默认容器是 document，但在 SSR 下会自动跳过绑定
 */
function useClickAway<EventPayload extends Event = Event>(
  protectedTargets: ClickAwayProtectedTargetsInput,
  onClickAway: (event: EventPayload) => void,
  options: UseClickAwayOptions = {},
): void {
  const {
    isEnabled = true,
    eventName = 'pointerdown',
    listenerContainer,
    useCapture = true,
    isPassive = true,
    shouldTriggerOnce,
    effectMode = 'effect',
  } = options;

  function getListenerContainerTarget(
    listenerContainerInput?: ClickAwayListenerContainerInput,
  ): ClickAwayListenerContainerInput | NativeListenerTarget {
    if (typeof listenerContainerInput === 'undefined') {
      return typeof document !== 'undefined' ? document : undefined;
    }

    // 关键：不要在这里解引用 ref.current，直接把 ref 对象传给 useEventListener
    return listenerContainerInput;
  }

  /**
   * 解析外层监听容器：
   * - 未传 listenerContainer：默认 document（SSR 下为 undefined）
   * - 传 ref：返回 ref.current
   * - 传对象：原样返回
   */
  const listenerContainerTarget = getListenerContainerTarget(listenerContainer);

  useEventListener<EventPayload>(
    eventName,
    (event) => {
      const resolvedProtectedTargetNodes = resolveProtectedTargetNodes(protectedTargets);

      /**
       * 没有任何可用白名单节点时，默认跳过：
       * - 常见于 ref.current 初始为 null 的过渡态
       * - 避免在目标尚未挂载时误判为“外部点击”
       */
      if (resolvedProtectedTargetNodes.length === 0) {
        return;
      }

      const isInsideProtectedTargets = isEventInsideProtectedTargets(
        event,
        resolvedProtectedTargetNodes,
      );

      if (isInsideProtectedTargets) {
        return;
      }

      onClickAway(event);
    },
    listenerContainerTarget,
    {
      isEnabled,
      useCapture,
      isPassive,
      shouldTriggerOnce,
      effectMode,
    },
  );
}

/**
 * 解析白名单区域输入，收敛为 Node[]
 * - 过滤 null / undefined
 */
function resolveProtectedTargetNodes(protectedTargets: ClickAwayProtectedTargetsInput): Node[] {
  const protectedTargetItems = Array.isArray(protectedTargets)
    ? protectedTargets
    : [protectedTargets];

  const resolvedProtectedTargetNodes: Node[] = [];

  protectedTargetItems.forEach((protectedTargetItem) => {
    const resolvedProtectedTarget = resolveProtectedTarget(protectedTargetItem);

    if (!isNodeTarget(resolvedProtectedTarget)) {
      return;
    }

    resolvedProtectedTargetNodes.push(resolvedProtectedTarget);
  });

  return resolvedProtectedTargetNodes;
}

/**
 * 解析单个白名单目标：
 * - ref => ref.current
 * - 直接对象 => 原样返回
 */
function resolveProtectedTarget(
  protectedTarget:
    | ClickAwayProtectedTarget
    | RefObject<ClickAwayProtectedTarget>
    | { current: ClickAwayProtectedTarget },
): ClickAwayProtectedTarget {
  if (isRefObject(protectedTarget)) {
    return protectedTarget.current;
  }

  return protectedTarget;
}

/**
 * 判断事件是否命中白名单区域
 *
 * 判断顺序：
 * 1) 优先用 composedPath（兼容 Shadow DOM）
 * 2) 降级方案：回退到 Node.contains(event.target)
 */
function isEventInsideProtectedTargets(event: Event, protectedTargetNodes: Node[]): boolean {
  if (protectedTargetNodes.length === 0) {
    return false;
  }

  const eventComposedPath = getEventComposedPath(event);

  if (eventComposedPath && eventComposedPath.length > 0) {
    return protectedTargetNodes.some((protectedTargetNode) =>
      eventComposedPath.includes(protectedTargetNode),
    );
  }

  const eventTarget = event.target;

  if (!isNodeTarget(eventTarget)) {
    return false;
  }

  return protectedTargetNodes.some((protectedTargetNode) =>
    protectedTargetNode.contains(eventTarget),
  );
}

/**
 * 安全读取 composedPath（部分环境可能不存在）
 */
function getEventComposedPath(event: Event): EventTarget[] | undefined {
  if (typeof event.composedPath !== 'function') {
    return undefined;
  }

  const eventComposedPath = event.composedPath();

  return Array.isArray(eventComposedPath) ? eventComposedPath : undefined;
}

/**
 * 判断一个值是否为 ref 对象
 */
function isRefObject(
  value: unknown,
): value is ClickAwayProtectedTargetRef | ClickAwayListenerContainerRef {
  return typeof value === 'object' && value !== null && 'current' in value;
}

/**
 * 判断 target 是否是 Node（用于 contains / composedPath 判断）
 */
function isNodeTarget(target: unknown): target is Node {
  return !!target && typeof (target as Node).nodeType === 'number';
}

export default useClickAway;
