/**
 * Internal only:
 *
 * 必须使用 @see useTargetEffect 进行调用，
 * 如需暴露需要添加冻结 effectMode 的相关代码，
 * 防止使用者运行时切换导致 hook 类型漂移。
 */
import { useEffect, useLayoutEffect, useRef } from 'react';
import type { DependencyList, RefObject } from 'react';
import { useUnmount } from './useUnmount';

type RefTargetEffectMode = 'effect' | 'layout';

export interface UseRefTargetEffectOptions {
  effectMode?: RefTargetEffectMode;

  /**
   * layout effect hook 注入点：
   * - 默认：useLayoutEffect
   * - Web SSR 场景：可传 useSafeLayoutEffect（内部降级到 useEffect）
   */
  layoutEffectHook?: typeof useEffect | typeof useLayoutEffect;
}

export type NativeRefTarget<TTarget> = TTarget | null | undefined;

/**
 * RefTarget（ref.current）
 * - current 在真实使用中一定会经历 null/undefined（初始/卸载/SSR）
 */
export type RefTarget<TTarget> =
  | RefObject<NativeRefTarget<TTarget>>
  | { current: NativeRefTarget<TTarget> };

type Cleanup = undefined | (() => void);
export type RefTargetEffectCallback<TTarget> = (target: NativeRefTarget<TTarget>) => Cleanup;

/**
 * 专门用于 ref.current 场景的副作用管理（对齐 ahooks/useEffectWithTarget 思路）
 *
 * 设计要点：
 * 1) 每次 render 后都“检查一次” ref.current（确保不漏掉 commit 后变化）
 * 2) cleanup / re-run 由内部托管（不 return cleanup 给这个无依赖 effect）
 * 3) 只有 target 或 deps 真的变化时，才执行 cleanup + 重新执行 effect
 *
 * 注意：
 * - 这个 Hook 是内部基础设施，给 useTargetEffect/useEventListener/... 复用
 * - 支持 refTarget = null：用于外层无条件调用 Hook 时的“禁用分支”
 */
function useRefTargetEffect<TTarget>(
  createTargetEffect: RefTargetEffectCallback<TTarget>,
  refTarget: RefTarget<TTarget> | null | undefined,
  dependencies: DependencyList,
  options: UseRefTargetEffectOptions = {},
): void {
  const { effectMode = 'effect', layoutEffectHook = useLayoutEffect } = options;

  const hasInitializedRef = useRef(false);
  const lastTargetRef = useRef<NativeRefTarget<TTarget> | undefined>(undefined);
  const lastDependenciesRef = useRef<DependencyList>([]);
  const cleanupRef = useRef<Cleanup>(undefined);

  const useTargetEffect = effectMode === 'layout' ? layoutEffectHook : useEffect;

  /**
   * 这里故意不传 deps：每次 render 后都检查一次 ref.current
   * 但不 return cleanup，避免每次 render 都被 React 自动 cleanup
   */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useTargetEffect(() => {
    /**
     * 外层可能在 direct target 模式下传入 null（为了保持 Hook 调用顺序一致）
     * 这时需要：
     * - 清理此前 ref 模式残留的副作用（如果有）
     * - 并重置内部状态机
     */
    if (!refTarget) {
      if (hasInitializedRef.current) {
        cleanupRef.current?.();
        cleanupRef.current = undefined;

        hasInitializedRef.current = false;
        lastTargetRef.current = undefined;
        lastDependenciesRef.current = [];
      }
      return;
    }

    const currentTarget = refTarget.current;

    // init run
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      lastTargetRef.current = currentTarget;
      lastDependenciesRef.current = [...dependencies];
      cleanupRef.current = createTargetEffect(currentTarget);
      return;
    }

    const isTargetChanged = !Object.is(lastTargetRef.current, currentTarget);
    const isDependenciesChanged = !depsAreSame(lastDependenciesRef.current, dependencies);

    if (!isTargetChanged && !isDependenciesChanged) {
      return;
    }

    cleanupRef.current?.();

    lastTargetRef.current = currentTarget;
    lastDependenciesRef.current = [...dependencies];
    cleanupRef.current = createTargetEffect(currentTarget);
  });

  useUnmount(() => {
    cleanupRef.current?.();
    cleanupRef.current = undefined;
    hasInitializedRef.current = false;
  });
}

function depsAreSame(
  previousDependencies: DependencyList,
  nextDependencies: DependencyList,
): boolean {
  if (previousDependencies.length !== nextDependencies.length) {
    return false;
  }

  for (let index = 0; index < previousDependencies.length; index += 1) {
    if (!Object.is(previousDependencies[index], nextDependencies[index])) {
      return false;
    }
  }

  return true;
}

export default useRefTargetEffect;
