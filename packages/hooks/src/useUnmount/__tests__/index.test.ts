import { renderHook } from '@testing-library/react';
import useUnmount from '../index';

describe('useUnmount', () => {
  it('should call the callback only on unmount', () => {
    const fn = jest.fn();

    const { rerender, unmount } = renderHook(({ cb }: { cb: () => void }) => useUnmount(cb), {
      initialProps: { cb: fn },
    });

    // not called on mount
    expect(fn).not.toHaveBeenCalled();

    // not called on rerender
    rerender({ cb: fn });
    expect(fn).not.toHaveBeenCalled();

    // called on unmount
    unmount();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should call the latest callback on unmount (useLatestRef)', () => {
    const fn1 = jest.fn();
    const fn2 = jest.fn();

    const { rerender, unmount } = renderHook(({ cb }: { cb: () => void }) => useUnmount(cb), {
      initialProps: { cb: fn1 },
    });

    rerender({ cb: fn2 });
    unmount();

    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).toHaveBeenCalledTimes(1);
  });

  it('should always call the most recently rendered callback after multiple rerenders', () => {
    const fn1 = jest.fn();
    const fn2 = jest.fn();
    const fn3 = jest.fn();

    const { rerender, unmount } = renderHook(({ cb }: { cb: () => void }) => useUnmount(cb), {
      initialProps: { cb: fn1 },
    });

    rerender({ cb: fn2 });
    rerender({ cb: fn3 });
    unmount();

    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).not.toHaveBeenCalled();
    expect(fn3).toHaveBeenCalledTimes(1);
  });
});
