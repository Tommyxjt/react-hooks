import { renderHook, act } from '@testing-library/react-hooks';
import { useLayoutEffect, useRef } from 'react';
import useScroll from '..';

describe('useScroll', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    jest.restoreAllMocks();
  });

  // 1）挂载时应主动同步一次元素滚动位置（无需先触发 scroll 事件）
  it('should sync element scroll position on mount', () => {
    const container = document.createElement('div');
    container.scrollLeft = 12;
    container.scrollTop = 34;

    document.body.appendChild(container);

    const { result } = renderHook(() => {
      return useScroll(container);
    });

    expect(result.current).toEqual({ x: 12, y: 34 });
  });

  // 2）元素触发 scroll 事件时应更新滚动位置
  it('should update position when element scroll event is triggered', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const { result } = renderHook(() => {
      return useScroll(container);
    });

    act(() => {
      container.scrollLeft = 56;
      container.scrollTop = 78;
      container.dispatchEvent(new Event('scroll'));
    });

    expect(result.current).toEqual({ x: 56, y: 78 });
  });

  // 3）window 作为目标时应读取 scrollX / scrollY
  it('should read window scroll position when target is window', () => {
    const originalScrollXDescriptor = Object.getOwnPropertyDescriptor(window, 'scrollX');
    const originalScrollYDescriptor = Object.getOwnPropertyDescriptor(window, 'scrollY');

    Object.defineProperty(window, 'scrollX', {
      configurable: true,
      value: 20,
    });

    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 40,
    });

    const { result } = renderHook(() => {
      return useScroll(window);
    });

    expect(result.current).toEqual({ x: 20, y: 40 });

    act(() => {
      Object.defineProperty(window, 'scrollX', {
        configurable: true,
        value: 88,
      });
      Object.defineProperty(window, 'scrollY', {
        configurable: true,
        value: 166,
      });

      window.dispatchEvent(new Event('scroll'));
    });

    expect(result.current).toEqual({ x: 88, y: 166 });

    if (originalScrollXDescriptor) {
      Object.defineProperty(window, 'scrollX', originalScrollXDescriptor);
    }

    if (originalScrollYDescriptor) {
      Object.defineProperty(window, 'scrollY', originalScrollYDescriptor);
    }
  });

  // 4）isEnabled = false 时不应初始化同步，也不应响应后续滚动
  it('should not sync or update when isEnabled is false', () => {
    const container = document.createElement('div');
    container.scrollLeft = 10;
    container.scrollTop = 20;
    document.body.appendChild(container);

    const { result } = renderHook(() => {
      return useScroll(container, { isEnabled: false });
    });

    expect(result.current).toBeUndefined();

    act(() => {
      container.scrollLeft = 100;
      container.scrollTop = 200;
      container.dispatchEvent(new Event('scroll'));
    });

    expect(result.current).toBeUndefined();
  });

  // 5）isEnabled 从 false -> true 时应开始同步并响应滚动
  it('should start syncing when isEnabled changes from false to true', () => {
    const container = document.createElement('div');
    container.scrollLeft = 11;
    container.scrollTop = 22;
    document.body.appendChild(container);

    const { result, rerender } = renderHook(
      ({ isEnabled }: { isEnabled: boolean }) => {
        return useScroll(container, { isEnabled });
      },
      {
        initialProps: { isEnabled: false },
      },
    );

    expect(result.current).toBeUndefined();

    rerender({ isEnabled: true });

    expect(result.current).toEqual({ x: 11, y: 22 });

    act(() => {
      container.scrollLeft = 33;
      container.scrollTop = 44;
      container.dispatchEvent(new Event('scroll'));
    });

    expect(result.current).toEqual({ x: 33, y: 44 });
  });

  // 6）target 变化时应迁移到新的滚动目标
  it('should migrate subscription when target changes', () => {
    const containerA = document.createElement('div');
    const containerB = document.createElement('div');

    document.body.appendChild(containerA);
    document.body.appendChild(containerB);

    const { result, rerender } = renderHook(
      ({ target }: { target: Element }) => {
        return useScroll(target);
      },
      {
        initialProps: { target: containerA as Element },
      },
    );

    act(() => {
      containerA.scrollLeft = 5;
      containerA.scrollTop = 6;
      containerA.dispatchEvent(new Event('scroll'));
    });

    expect(result.current).toEqual({ x: 5, y: 6 });

    rerender({ target: containerB });

    act(() => {
      containerA.scrollLeft = 50;
      containerA.scrollTop = 60;
      containerA.dispatchEvent(new Event('scroll'));
    });

    // 旧目标滚动不应再影响结果（仍为迁移时同步到的新目标初始值，默认 0/0）
    expect(result.current).toEqual({ x: 0, y: 0 });

    act(() => {
      containerB.scrollLeft = 7;
      containerB.scrollTop = 8;
      containerB.dispatchEvent(new Event('scroll'));
    });

    expect(result.current).toEqual({ x: 7, y: 8 });
  });

  // 7）ref.current 初始为 null 时应安全跳过，后续变为节点后自动生效
  it('should safely skip when ref.current is null and bind later', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const targetRef = { current: null as HTMLDivElement | null };

    const { result, rerender } = renderHook(() => {
      return useScroll(targetRef);
    });

    expect(result.current).toBeUndefined();

    targetRef.current = container;
    rerender();

    // rerender 后会进行初始化同步
    expect(result.current).toEqual({ x: 0, y: 0 });

    act(() => {
      container.scrollLeft = 15;
      container.scrollTop = 25;
      container.dispatchEvent(new Event('scroll'));
    });

    expect(result.current).toEqual({ x: 15, y: 25 });
  });

  // 8）ref 目标在首轮 commit（layout 阶段）才可用时，应无需手动 rerender 也能生效（回归用例）
  it('should bind and sync when ref.current becomes available in layout phase on first mount', () => {
    const container = document.createElement('div');
    container.scrollLeft = 21;
    container.scrollTop = 31;
    document.body.appendChild(container);

    const { result } = renderHook(() => {
      const targetRef = useRef<HTMLDivElement | null>(null);

      useLayoutEffect(() => {
        targetRef.current = container;
      }, []);

      return useScroll(targetRef);
    });

    // 首轮挂载后应已完成初始化同步（无需手动 rerender）
    expect(result.current).toEqual({ x: 21, y: 31 });

    act(() => {
      container.scrollLeft = 41;
      container.scrollTop = 51;
      container.dispatchEvent(new Event('scroll'));
    });

    expect(result.current).toEqual({ x: 41, y: 51 });
  });

  // 9）卸载时应清理订阅
  it('should clean up subscription on unmount', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const removeEventListenerSpy = jest.spyOn(container, 'removeEventListener');

    const { unmount } = renderHook(() => {
      return useScroll(container);
    });

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalled();
  });
});
