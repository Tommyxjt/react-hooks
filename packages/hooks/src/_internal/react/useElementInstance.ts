import { useCallback, useRef, useState } from 'react';

/**
 * 说明：
 * - 这个 Hook 基于 callback ref 工作（不是监听 RefObject.current）
 * - 它会把 React 在挂载 / 卸载 / 替换时传入的“实例”转换为 state
 * - 适用于 Web（DOM 实例）和 React Native（宿主实例）等场景
 *
 * 设计目标：
 * 1) 提供一个稳定的 callback ref（给 JSX 的 ref 使用）
 * 2) 返回当前实例（state），便于作为 useEffect 依赖或传给其他 Hook
 * 3) 仅在实例真的变化时更新 state（避免无意义 rerender）
 */

/**
 * callback ref 类型：
 * - React 在 commit 阶段会调用它：
 *   - 挂载时：instance
 *   - 卸载时：null
 *   - 替换时：旧实例 cleanup 后再传新实例
 */
export type ElementInstanceRef<TInstance = unknown> = (instance: TInstance | null) => void;

/**
 * 返回值：
 * - [0] callback ref（用于接收实例）
 * - [1] 当前实例（state 化）
 */
export type UseElementInstanceResult<TInstance = unknown> = readonly [
  ElementInstanceRef<TInstance>,
  TInstance | null,
];

/**
 * useElementInstance
 *
 * 把“实例变化”转成 React state
 *
 * 为什么它有用？
 * - 普通 RefObject.current 的变化不会触发 rerender
 * - callback ref 是 React commit 阶段的“实例变更通知入口”
 * - 这里把它封装为 state，外层就可以声明式使用：
 *   - useEffect(..., [elementInstance])
 *   - useEventListener(..., elementInstance)
 *   - useSize(..., elementInstance)
 */
function useElementInstance<TInstance = unknown>(): UseElementInstanceResult<TInstance> {
  /**
   * 当前实例（state）
   * - 用于驱动 React 更新流
   * - 外层可以把它当作普通 state 使用
   */
  const [elementInstance, setElementInstance] = useState<TInstance | null>(null);

  /**
   * 命令式保存“当前实例”
   * - 用于 callback ref 内做去重
   * - 避免同一个实例重复 setState 触发无意义 rerender
   */
  const currentElementInstanceRef = useRef<TInstance | null>(null);

  /**
   * 稳定的「函数 ref（callback ref）」：
   * - React 会在实例变化时调用它
   * - 只有实例真的变化时才更新 state
   */
  const elementInstanceRef = useCallback((nextElementInstance: TInstance | null) => {
    if (currentElementInstanceRef.current === nextElementInstance) {
      return;
    }

    currentElementInstanceRef.current = nextElementInstance;
    setElementInstance(nextElementInstance);
  }, []);

  return [elementInstanceRef, elementInstance] as const;
}

export default useElementInstance;
