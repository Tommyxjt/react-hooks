import { renderHook } from '@testing-library/react';
import useLatestRef from '../index';

describe('useLatestRef', () => {
  it('should set ref.current to the initial value on first render', () => {
    const { result } = renderHook(() => useLatestRef(1));
    expect(result.current.current).toBe(1);
  });

  it('should keep the same ref object between renders and update current to latest value', () => {
    const { result, rerender } = renderHook(({ value }: { value: number }) => useLatestRef(value), {
      initialProps: { value: 1 },
    });

    const firstRef = result.current;
    expect(firstRef.current).toBe(1);

    rerender({ value: 2 });
    expect(result.current).toBe(firstRef);
    expect(result.current.current).toBe(2);

    rerender({ value: 3 });
    expect(result.current).toBe(firstRef);
    expect(result.current.current).toBe(3);
  });

  it('should overwrite manual mutation on next render (sync every render)', () => {
    const { result, rerender } = renderHook(({ value }: { value: string }) => useLatestRef(value), {
      initialProps: { value: 'a' },
    });

    const ref = result.current;
    expect(ref.current).toBe('a');

    // 用户手动变更
    ref.current = 'manual';
    expect(ref.current).toBe('manual');

    // next render should sync back to latest value
    rerender({ value: 'b' });
    expect(result.current).toBe(ref);
    expect(ref.current).toBe('b');
  });

  it('should work with object values', () => {
    const obj1 = { a: 1 };
    const obj2 = { a: 2 };

    const { result, rerender } = renderHook(
      ({ value }: { value: { a: number } }) => useLatestRef(value),
      { initialProps: { value: obj1 } },
    );

    const ref = result.current;
    expect(ref.current).toBe(obj1);

    rerender({ value: obj2 });
    expect(result.current).toBe(ref);
    expect(ref.current).toBe(obj2);
  });

  interface Props {
    value: null | undefined;
  }
  it('should support null/undefined values', () => {
    const initialProps: Props = { value: null };
    const { result, rerender } = renderHook(({ value }: Props) => useLatestRef(value), {
      initialProps,
    });

    const ref = result.current;
    expect(ref.current).toBeNull();

    rerender({ value: undefined });
    expect(result.current).toBe(ref);
    expect(ref.current).toBeUndefined();
  });
});
