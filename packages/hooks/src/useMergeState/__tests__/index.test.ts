import { act, renderHook } from '@testing-library/react';
import useMergeState from '../index';

describe('useMergeState', () => {
  //  1）初始化：首次渲染应返回 initialState
  it('should return initial state on first render', () => {
    const { result } = renderHook(() => useMergeState({ a: 1, b: 2 }));

    const [state] = result.current;
    expect(state).toEqual({ a: 1, b: 2 });
  });

  //  2）浅合并：传入 partial 时应只更新对应字段，其它字段保持不变
  it('should shallow merge partial patch into previous state', () => {
    const { result } = renderHook(() => useMergeState({ a: 1, b: 2 }));

    act(() => {
      const [, setMergeState] = result.current;
      setMergeState({ b: 99 });
    });

    const [state] = result.current;
    expect(state).toEqual({ a: 1, b: 99 });
  });

  //  3）函数式 patch：支持 (prev) => patch，且应基于最新 prev 计算
  it('should support functional patch', () => {
    const { result } = renderHook(() => useMergeState({ count: 0, text: 'x' }));

    act(() => {
      const [, setMergeState] = result.current;
      setMergeState((prev) => ({ count: prev.count + 1 }));
    });

    act(() => {
      const [, setMergeState] = result.current;
      setMergeState((prev) => ({ count: prev.count + 10, text: `${prev.text}y` }));
    });

    const [state] = result.current;
    expect(state).toEqual({ count: 11, text: 'xy' });
  });

  //  4）无变化 patch：当 patch 不会带来字段变化时，应保持 state 引用不变
  it('should keep the same state reference if patch does not change any field', () => {
    const { result } = renderHook(() => useMergeState({ a: 1, b: 2 }));

    const [firstState] = result.current;

    act(() => {
      const [, setMergeState] = result.current;
      setMergeState({ a: 1 });
    });

    const [nextState] = result.current;
    expect(nextState).toBe(firstState);
    expect(nextState).toEqual({ a: 1, b: 2 });
  });

  //  5）浅合并语义：嵌套对象更新时不会深合并，nested 会整体替换
  it('should not deep merge nested objects (replace nested object as a whole)', () => {
    interface State {
      nested: { a: number; b?: number };
    }

    const { result } = renderHook(() => useMergeState<State>({ nested: { a: 1, b: 100 } }));

    act(() => {
      const [, setMergeState] = result.current;
      setMergeState({ nested: { a: 2 } });
    });

    const [state] = result.current;
    expect(state.nested).toEqual({ a: 2 });
    expect(state.nested.b).toBeUndefined();
  });
});
