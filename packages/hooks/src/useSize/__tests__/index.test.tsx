import { renderHook, act } from '@testing-library/react';
import { useLayoutEffect, useRef } from 'react';
import useSize from '..';

interface MutableRect {
  width: number;
  height: number;
}

class MockResizeObserver {
  static instances: MockResizeObserver[] = [];

  static reset(): void {
    MockResizeObserver.instances = [];
  }

  static triggerFor(element: Element): void {
    MockResizeObserver.instances.forEach((instance) => {
      if (instance.hasObserved(element)) {
        instance.trigger();
      }
    });
  }

  observe = jest.fn((element: Element) => {
    this.observedElements.add(element);
  });

  unobserve = jest.fn((element: Element) => {
    this.observedElements.delete(element);
  });

  disconnect = jest.fn(() => {
    this.observedElements.clear();
  });

  private readonly callback: ResizeObserverCallback;

  private readonly observedElements = new Set<Element>();

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    MockResizeObserver.instances.push(this);
  }

  private hasObserved(element: Element): boolean {
    return this.observedElements.has(element);
  }

  private trigger(): void {
    this.callback([], this as unknown as ResizeObserver);
  }
}

function bindElementRect(element: Element, rect: MutableRect): void {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: jest.fn(() => {
      const domRectLike: DOMRect = {
        width: rect.width,
        height: rect.height,
        top: 0,
        right: rect.width,
        bottom: rect.height,
        left: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      };

      return domRectLike;
    }),
  });
}

describe('useSize', () => {
  const originalResizeObserver = globalThis.ResizeObserver;

  beforeEach(() => {
    MockResizeObserver.reset();
    globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.restoreAllMocks();
    globalThis.ResizeObserver = originalResizeObserver;
  });

  // 1）挂载时应主动测量一次尺寸（无需等待 ResizeObserver 回调）
  it('should measure size on mount', () => {
    const element = document.createElement('div');
    const rect = { width: 120, height: 56 };

    bindElementRect(element, rect);
    document.body.appendChild(element);

    const { result } = renderHook(() => {
      return useSize(element);
    });

    expect(result.current).toEqual({ width: 120, height: 56 });
  });

  // 2）ResizeObserver 回调触发时应更新尺寸
  it('should update size when ResizeObserver callback is triggered', () => {
    const element = document.createElement('div');
    const rect = { width: 100, height: 40 };

    bindElementRect(element, rect);
    document.body.appendChild(element);

    const { result } = renderHook(() => {
      return useSize(element);
    });

    expect(result.current).toEqual({ width: 100, height: 40 });

    act(() => {
      rect.width = 220;
      rect.height = 88;
      MockResizeObserver.triggerFor(element);
    });

    expect(result.current).toEqual({ width: 220, height: 88 });
  });

  // 3）尺寸未变化时应复用旧值（避免无意义更新）
  it('should reuse previous size object when width and height do not change', () => {
    const element = document.createElement('div');
    const rect = { width: 140, height: 70 };

    bindElementRect(element, rect);
    document.body.appendChild(element);

    const { result } = renderHook(() => {
      return useSize(element);
    });

    const previousSize = result.current;

    act(() => {
      MockResizeObserver.triggerFor(element);
    });

    expect(result.current).toBe(previousSize);
  });

  // 4）target 变化时应迁移观察对象，并清理旧订阅
  it('should migrate observer when target changes', () => {
    const elementA = document.createElement('div');
    const rectA = { width: 80, height: 30 };
    bindElementRect(elementA, rectA);

    const elementB = document.createElement('div');
    const rectB = { width: 160, height: 90 };
    bindElementRect(elementB, rectB);

    document.body.appendChild(elementA);
    document.body.appendChild(elementB);

    const { result, rerender } = renderHook(
      ({ target }: { target: Element }) => {
        return useSize(target);
      },
      {
        initialProps: { target: elementA as Element },
      },
    );

    expect(result.current).toEqual({ width: 80, height: 30 });

    rerender({ target: elementB });

    // target 切换后会立即进行一次初始化测量
    expect(result.current).toEqual({ width: 160, height: 90 });

    act(() => {
      rectA.width = 999;
      rectA.height = 999;
      MockResizeObserver.triggerFor(elementA);
    });

    // 旧目标触发不应再影响结果
    expect(result.current).toEqual({ width: 160, height: 90 });

    act(() => {
      rectB.width = 200;
      rectB.height = 120;
      MockResizeObserver.triggerFor(elementB);
    });

    expect(result.current).toEqual({ width: 200, height: 120 });
  });

  // 5）ref.current 初始为 null 时应安全跳过，后续变为节点后自动生效
  it('should safely skip when ref.current is null and bind later', () => {
    const element = document.createElement('div');
    const rect = { width: 130, height: 66 };

    bindElementRect(element, rect);
    document.body.appendChild(element);

    const targetRef = { current: null as HTMLDivElement | null };

    const { result, rerender } = renderHook(() => {
      return useSize(targetRef);
    });

    expect(result.current).toBeUndefined();

    targetRef.current = element;
    rerender();

    expect(result.current).toEqual({ width: 130, height: 66 });

    act(() => {
      rect.width = 180;
      rect.height = 90;
      MockResizeObserver.triggerFor(element);
    });

    expect(result.current).toEqual({ width: 180, height: 90 });
  });

  // 6）ref 在首轮 commit（layout 阶段）才可用时，应无需手动 rerender 也能生效（回归用例）
  it('should bind and measure when ref.current becomes available in layout phase on first mount', () => {
    const element = document.createElement('div');
    const rect = { width: 210, height: 110 };

    bindElementRect(element, rect);
    document.body.appendChild(element);

    const { result } = renderHook(() => {
      const targetRef = useRef<HTMLDivElement | null>(null);

      useLayoutEffect(() => {
        targetRef.current = element;
      }, []);

      return useSize(targetRef);
    });

    expect(result.current).toEqual({ width: 210, height: 110 });

    act(() => {
      rect.width = 240;
      rect.height = 140;
      MockResizeObserver.triggerFor(element);
    });

    expect(result.current).toEqual({ width: 240, height: 140 });
  });

  // 7）卸载时应断开 ResizeObserver 订阅
  it('should disconnect ResizeObserver on unmount', () => {
    const element = document.createElement('div');
    const rect = { width: 100, height: 50 };

    bindElementRect(element, rect);
    document.body.appendChild(element);

    const { unmount } = renderHook(() => {
      return useSize(element);
    });

    const latestObserver = MockResizeObserver.instances[MockResizeObserver.instances.length - 1];

    unmount();

    expect(latestObserver.disconnect).toHaveBeenCalledTimes(1);
  });
});
