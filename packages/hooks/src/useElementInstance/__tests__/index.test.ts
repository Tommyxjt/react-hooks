import { act, renderHook } from '@testing-library/react';
import { useEffect, useRef } from 'react';
import useElementInstance from '..';

describe('useElementInstance', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // 1）初始状态应为 null
  it('should return null instance initially', () => {
    const { result } = renderHook(() => useElementInstance<HTMLDivElement>());

    expect(result.current[1]).toBeNull();
  });

  // 2）callback ref 接收到实例时应更新 state
  it('should update instance state when callback ref receives a node', () => {
    const { result } = renderHook(() => useElementInstance<HTMLDivElement>());
    const [boxRef] = result.current;

    const node = document.createElement('div');

    act(() => {
      boxRef(node);
    });

    expect(result.current[1]).toBe(node);
  });

  // 3）实例变为 null（卸载）时应更新 state
  it('should update instance state to null when callback ref receives null', () => {
    const { result } = renderHook(() => useElementInstance<HTMLDivElement>());
    const [boxRef] = result.current;

    const node = document.createElement('div');

    act(() => {
      boxRef(node);
    });

    expect(result.current[1]).toBe(node);

    act(() => {
      result.current[0](null);
    });

    expect(result.current[1]).toBeNull();
  });

  // 4）同一个实例重复赋值时不应触发额外 rerender
  it('should not re-render when the same instance is assigned repeatedly', () => {
    const { result } = renderHook(() => {
      const renderCountRef = useRef(0);
      renderCountRef.current += 1;

      const [boxRef, boxElement] = useElementInstance<HTMLDivElement>();

      return {
        boxRef,
        boxElement,
        renderCount: renderCountRef.current,
      };
    });

    const node = document.createElement('div');

    expect(result.current.renderCount).toBe(1);

    act(() => {
      result.current.boxRef(node);
    });

    expect(result.current.boxElement).toBe(node);
    expect(result.current.renderCount).toBe(2);

    act(() => {
      result.current.boxRef(node);
    });

    expect(result.current.boxElement).toBe(node);
    expect(result.current.renderCount).toBe(2);
  });

  // 5）实例替换时应更新 state
  it('should update instance state when node instance is replaced', () => {
    const { result } = renderHook(() => useElementInstance<HTMLDivElement>());

    const nodeA = document.createElement('div');
    const nodeB = document.createElement('div');

    act(() => {
      result.current[0](nodeA);
    });

    expect(result.current[1]).toBe(nodeA);

    act(() => {
      result.current[0](nodeB);
    });

    expect(result.current[1]).toBe(nodeB);
  });

  // 6）callback ref 在重渲染前后应保持引用稳定
  it('should keep callback ref identity stable across rerenders', () => {
    const { result, rerender } = renderHook(() => useElementInstance<HTMLDivElement>());

    const firstRef = result.current[0];

    rerender();

    const secondRef = result.current[0];

    expect(firstRef).toBe(secondRef);
  });

  // 7）elementInstance 可作为 useEffect 依赖使用
  it('should support using elementInstance as useEffect dependency', () => {
    const effectSpy = jest.fn();

    const { result } = renderHook(() => {
      const [boxRef, boxElement] = useElementInstance<HTMLDivElement>();

      useEffect(() => {
        effectSpy(boxElement);
      }, [boxElement]);

      return [boxRef, boxElement] as const;
    });

    // 初始 effect（boxElement = null）
    expect(effectSpy).toHaveBeenCalledTimes(1);
    expect(effectSpy).toHaveBeenLastCalledWith(null);

    const node = document.createElement('div');

    act(() => {
      result.current[0](node);
    });

    expect(effectSpy).toHaveBeenCalledTimes(2);
    expect(effectSpy).toHaveBeenLastCalledWith(node);
  });

  // 8）应能与普通 RefObject 配合（通过合并 ref）
  it('should work with a normal RefObject via merged callback ref', () => {
    const { result } = renderHook(() => {
      const [reactiveRef, boxElement] = useElementInstance<HTMLDivElement>();
      const boxRef = useRef<HTMLDivElement | null>(null);

      const mergedRef = (node: HTMLDivElement | null) => {
        boxRef.current = node;
        reactiveRef(node);
      };

      return {
        mergedRef,
        boxRef,
        boxElement,
      };
    });

    const node = document.createElement('div');

    act(() => {
      result.current.mergedRef(node);
    });

    expect(result.current.boxRef.current).toBe(node);
    expect(result.current.boxElement).toBe(node);

    act(() => {
      result.current.mergedRef(null);
    });

    expect(result.current.boxRef.current).toBeNull();
    expect(result.current.boxElement).toBeNull();
  });
});
