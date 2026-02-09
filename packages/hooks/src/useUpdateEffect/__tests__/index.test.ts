import useUpdateEffect from '../index';
import { act, renderHook } from '@testing-library/react';

describe('useUpdateEffect', () => {
  it('should skip the initial render', () => {
    const effect = jest.fn();
    renderHook(() => useUpdateEffect(effect, [1]));
    expect(effect).not.toHaveBeenCalled();
  });

  it('should run effect when deps change (after initial render)', () => {
    const effect = jest.fn();
    const { rerender } = renderHook(({ n }: { n: number }) => useUpdateEffect(effect, [n]), {
      initialProps: { n: 0 },
    });

    expect(effect).not.toHaveBeenCalled();

    act(() => {
      rerender({ n: 1 });
    });
    expect(effect).toHaveBeenCalledTimes(1);

    act(() => {
      rerender({ n: 2 });
    });
    expect(effect).toHaveBeenCalledTimes(2);
  });

  it('should never run when deps is an empty array', () => {
    const effect = jest.fn();
    const { rerender } = renderHook((_unusedProps: { n: number }) => useUpdateEffect(effect, []), {
      initialProps: { n: 0 },
    });

    expect(effect).not.toHaveBeenCalled();

    act(() => {
      rerender({ n: 1 });
    });
    act(() => {
      rerender({ n: 2 });
    });

    expect(effect).not.toHaveBeenCalled();
  });

  it('should run on every update when deps is omitted (after initial render)', () => {
    const effect = jest.fn();
    const { rerender } = renderHook((_unusedProps: { n: number }) => useUpdateEffect(effect), {
      initialProps: { n: 0 },
    });

    expect(effect).not.toHaveBeenCalled();

    act(() => {
      rerender({ n: 1 });
    });
    expect(effect).toHaveBeenCalledTimes(1);

    act(() => {
      rerender({ n: 2 });
    });
    expect(effect).toHaveBeenCalledTimes(2);
  });

  it('should run cleanup on deps change and on unmount (only after effect has run)', () => {
    const cleanup = jest.fn();
    const effect = jest.fn(() => cleanup);

    const { rerender, unmount } = renderHook(
      ({ n }: { n: number }) => useUpdateEffect(effect, [n]),
      { initialProps: { n: 0 } },
    );

    // 验证初始化副作用被跳过
    expect(effect).not.toHaveBeenCalled();
    expect(cleanup).not.toHaveBeenCalled();

    // 首次更新行为：运行 effect 函数，但是不运行 cleanup。
    // 因为这是第一次执行 effect，不存在上一次 effect 的 cleanup。
    act(() => {
      rerender({ n: 1 });
    });
    expect(effect).toHaveBeenCalledTimes(1);
    expect(cleanup).not.toHaveBeenCalled();

    // 第二次更新行为：先运行上一次 effect 的 cleanup，再运行本次的 effect 函数。
    act(() => {
      rerender({ n: 2 });
    });
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(effect).toHaveBeenCalledTimes(2);

    // 卸载时：运行前一次的 cleanup 函数。
    unmount();
    expect(cleanup).toHaveBeenCalledTimes(2);
  });
});
