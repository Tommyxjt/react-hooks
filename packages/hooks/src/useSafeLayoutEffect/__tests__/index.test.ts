import { renderHook } from '@testing-library/react';
import useSafeLayoutEffect from '..';

describe('useSafeLayoutEffect', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // 1）挂载时应执行副作用
  it('should execute effect on mount', () => {
    const effectFn = jest.fn();

    renderHook(() => {
      useSafeLayoutEffect(() => {
        effectFn();
      }, []);
    });

    expect(effectFn).toHaveBeenCalledTimes(1);
  });

  // 2）卸载时应执行清理函数
  it('should execute cleanup on unmount', () => {
    const cleanupFn = jest.fn();

    const { unmount } = renderHook(() => {
      useSafeLayoutEffect(() => {
        return () => {
          cleanupFn();
        };
      }, []);
    });

    unmount();

    expect(cleanupFn).toHaveBeenCalledTimes(1);
  });

  // 3）依赖变化时应先清理上一次副作用，再执行新副作用
  it('should cleanup previous effect and run next effect when deps change', () => {
    const effectFn = jest.fn();
    const cleanupFn = jest.fn();

    const { rerender } = renderHook(
      ({ value }: { value: number }) => {
        useSafeLayoutEffect(() => {
          effectFn(value);

          return () => {
            cleanupFn(value);
          };
        }, [value]);
      },
      {
        initialProps: { value: 1 },
      },
    );

    expect(effectFn).toHaveBeenCalledTimes(1);
    expect(effectFn).toHaveBeenLastCalledWith(1);

    rerender({ value: 2 });

    expect(cleanupFn).toHaveBeenCalledTimes(1);
    expect(cleanupFn).toHaveBeenLastCalledWith(1);

    expect(effectFn).toHaveBeenCalledTimes(2);
    expect(effectFn).toHaveBeenLastCalledWith(2);
  });

  // 4）依赖未变化时不应重复执行副作用
  it('should not re-run effect when deps do not change', () => {
    const effectFn = jest.fn();
    const cleanupFn = jest.fn();

    const { rerender } = renderHook(
      ({ value }: { value: number }) => {
        useSafeLayoutEffect(() => {
          effectFn(value);

          return () => {
            cleanupFn(value);
          };
        }, [value]);
      },
      {
        initialProps: { value: 1 },
      },
    );

    rerender({ value: 1 });

    expect(effectFn).toHaveBeenCalledTimes(1);
    expect(cleanupFn).toHaveBeenCalledTimes(0);
  });
});
