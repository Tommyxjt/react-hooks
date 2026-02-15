import { useCallback, useState } from 'react';

export type Mergemerge<T extends Record<string, any>> = Partial<T> | ((prevState: T) => Partial<T>);

export type SetMergeState<T extends Record<string, any>> = (merge: Mergemerge<T>) => void;

/**
 * useMergeState
 * - 适用于对象 state 的“浅合并更新”
 * - setMergeState({ a: 1 }) => next = { ...prev, a: 1 }
 * - setMergeState(prev => ({ a: prev.a + 1 })) 也支持
 */
export default function useMergeState<T extends Record<string, any>>(
  initialState: T | (() => T),
): [T, SetMergeState<T>] {
  const [state, setState] = useState<T>(initialState);

  const setMergeState = useCallback<SetMergeState<T>>((merge) => {
    setState((prev) => {
      const partial = typeof merge === 'function' ? merge(prev) : merge;

      // 忽略空 merge（避免异常输入导致报错）
      if (partial == null) return prev;

      // 若 merge 不会带来任何字段变化，直接返回 prev，避免不必要 rerender
      const keys = Object.keys(partial) as Array<keyof T>;
      let changed = false;
      for (const k of keys) {
        if (!Object.is(prev[k], partial[k])) {
          changed = true;
          break;
        }
      }
      if (!changed) return prev;

      return { ...prev, ...partial };
    });
  }, []);

  return [state, setMergeState];
}
