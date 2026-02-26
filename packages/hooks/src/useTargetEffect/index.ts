import { useEffect, useLayoutEffect, useRef } from 'react';
import type { DependencyList, RefObject } from 'react';
import { useStableCallback } from '../_internal/react/useStableCallback';
import useRefTargetEffect, {
  NativeRefTarget,
  RefTarget,
  RefTargetEffectCallback,
  UseRefTargetEffectOptions,
} from '../_internal/react/useRefTargetEffect';

export type NativeTarget<TTarget> = NativeRefTarget<TTarget>;

export type TargetInput<TTarget> =
  | NativeTarget<TTarget>
  | RefObject<NativeTarget<TTarget>>
  | { current: NativeTarget<TTarget> };

export type TargetEffectCallback<TTarget> = RefTargetEffectCallback<TTarget>;
export type UseTargetEffectOptions = UseRefTargetEffectOptions;

const isRefObject = <TTarget>(value: TargetInput<TTarget>): value is RefTarget<TTarget> => {
  return typeof value === 'object' && value !== null && 'current' in value;
};

/**
 * useTargetEffect：对外语法糖
 *
 * - direct target：走标准 useEffect / useLayoutEffect + deps
 * - ref target：走 useRefTargetEffect（内部做 ref.current 比较 + 精准重建）
 *
 * 这样上层 Hook（useEventListener / useSize ...）只需要写一套逻辑，不用自己维护两套。
 */
function useTargetEffect<TTarget>(
  createTargetEffect: TargetEffectCallback<TTarget>,
  target: TargetInput<TTarget>,
  dependencies: DependencyList,
  options: UseTargetEffectOptions = {},
): undefined {
  const { effectMode = 'effect', layoutEffectHook = useLayoutEffect } = options;

  /**
   * 不支持运行时切换：
   * - 冻结首次值，避免行为漂移
   * - dev 下给出 warning（让使用者意识到写法不对）
   */
  const initialEffectModeRef = useRef(effectMode);
  const initialLayoutEffectHookRef = useRef(layoutEffectHook);

  if (process.env.NODE_ENV !== 'production') {
    if (initialEffectModeRef.current !== effectMode) {
      // eslint-disable-next-line no-console
      console.warn(
        '[useTargetEffect] effectMode is not supported to change at runtime. It will be ignored after the first render.',
      );
    }

    if (initialLayoutEffectHookRef.current !== layoutEffectHook) {
      // eslint-disable-next-line no-console
      console.warn(
        '[useTargetEffect] layoutEffectHook is not supported to change at runtime. It will be ignored after the first render.',
      );
    }
  }

  const resolvedEffectMode = initialEffectModeRef.current;
  const resolvedLayoutEffectHook = initialLayoutEffectHookRef.current;

  /**
   * 让回调引用稳定（避免把 createTargetEffect 当成“变化条件”）
   * - 外层只需要声明 dependencies + target
   * - 逻辑更新通过 stable callback 解决闭包问题
   */
  const stableCreateTargetEffect = useStableCallback(
    createTargetEffect as unknown as (...args: unknown[]) => unknown,
  ) as unknown as TargetEffectCallback<TTarget>;

  const isRefTarget = isRefObject(target);
  const refTarget: RefTarget<TTarget> | null = isRefTarget ? (target as RefTarget<TTarget>) : null;

  const directTarget: NativeTarget<TTarget> = isRefTarget
    ? undefined
    : (target as NativeTarget<TTarget>);

  /**
   * ref target 分支（无条件调用 Hook，保持顺序稳定）
   * - direct target 时传 null，内部会自动 cleanup 并 reset
   */
  useRefTargetEffect(stableCreateTargetEffect, refTarget, dependencies, {
    effectMode: resolvedEffectMode,
    layoutEffectHook: resolvedLayoutEffectHook,
  });

  /**
   * direct target 分支（无条件调用 Hook）
   * - 冻结后可以放心用三元选择 Hook（hook 类型不会漂移）
   * - ref target 时直接跳过，避免重复调度
   */
  const useDirectTargetEffect =
    resolvedEffectMode === 'layout' ? resolvedLayoutEffectHook : useEffect;

  useDirectTargetEffect(() => {
    if (isRefTarget) {
      return;
    }

    return stableCreateTargetEffect(directTarget);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRefTarget, directTarget, stableCreateTargetEffect, ...dependencies]);
}

export default useTargetEffect;
