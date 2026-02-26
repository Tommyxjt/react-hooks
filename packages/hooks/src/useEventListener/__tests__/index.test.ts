import { renderHook, act } from '@testing-library/react';
import useEventListener, { NativeListenerTarget } from '..';
import { useRef } from 'react';

describe('useEventListener', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // 1）挂载时应创建订阅（直接 target）
  it('should create subscription when mounted with direct target', () => {
    const fn = jest.fn();
    renderHook(() => {
      useEventListener('click', fn, window);
    });

    // 手动触发事件
    act(() => {
      const event = new MouseEvent('click');
      window.dispatchEvent(event);
    });

    expect(fn).toHaveBeenCalledTimes(1);
  });

  // 2）触发事件时应执行 handler
  it('should execute handler when event is triggered', () => {
    const fn = jest.fn();
    renderHook(() => {
      useEventListener('click', fn, window);
    });

    // 手动触发事件
    act(() => {
      const event = new MouseEvent('click');
      window.dispatchEvent(event);
    });

    expect(fn).toHaveBeenCalledTimes(1);
  });

  // 3）卸载时应清理订阅
  it('should clean up subscription on unmount', () => {
    const fn = jest.fn();
    const { unmount } = renderHook(() => {
      useEventListener('click', fn, window);
    });

    unmount();

    // 手动触发事件
    act(() => {
      const event = new MouseEvent('click');
      window.dispatchEvent(event);
    });

    expect(fn).toHaveBeenCalledTimes(0); // 确保已经卸载
  });

  // 4）handler 更新时不重建订阅，且使用最新逻辑
  it('should use latest handler logic without re-subscribing', () => {
    const fnA = jest.fn();
    const fnB = jest.fn();
    const { rerender } = renderHook(
      ({ handler }) => {
        useEventListener('click', handler, window);
      },
      {
        initialProps: { handler: fnA },
      },
    );

    // 触发事件，确保执行 fnA
    act(() => {
      const event = new MouseEvent('click');
      window.dispatchEvent(event);
    });
    expect(fnA).toHaveBeenCalledTimes(1);

    // 改变 handler 为 fnB
    rerender({ handler: fnB });

    // 触发事件，确保执行 fnB
    act(() => {
      const event = new MouseEvent('click');
      window.dispatchEvent(event);
    });
    expect(fnB).toHaveBeenCalledTimes(1);
    expect(fnA).toHaveBeenCalledTimes(1); // 确保 fnA 没有再次触发
  });

  // 5）eventName 变化时应清理旧订阅并创建新订阅
  it('should re-subscribe when eventName changes', () => {
    const fn = jest.fn();
    const { rerender } = renderHook(
      ({ eventName }) => {
        useEventListener(eventName, fn, window);
      },
      {
        initialProps: { eventName: 'click' },
      },
    );

    // 触发第一次 click 事件
    act(() => {
      const event = new MouseEvent('click');
      window.dispatchEvent(event);
    });

    expect(fn).toHaveBeenCalledTimes(1);

    // 改变 eventName 为 'mousedown'
    rerender({ eventName: 'mousedown' });

    // 触发 mousedown 事件
    act(() => {
      const event = new MouseEvent('mousedown');
      window.dispatchEvent(event);
    });

    expect(fn).toHaveBeenCalledTimes(2); // 确保触发了新事件
  });

  // 6）listenerTarget 变化时应迁移订阅
  it('should migrate subscription when listenerTarget changes', () => {
    const fn = jest.fn();
    const { rerender } = renderHook(
      ({ target }: { target: EventTarget }) => {
        useEventListener('click', fn, target);
      },
      {
        initialProps: { target: window as EventTarget },
      },
    );

    // 触发事件，应该触发 fn
    act(() => {
      const event = new MouseEvent('click');
      window.dispatchEvent(event);
    });
    expect(fn).toHaveBeenCalledTimes(1);

    // 改变 target 为 document
    rerender({ target: document });

    // 触发事件，应该触发 fn
    act(() => {
      const event = new MouseEvent('click');
      document.dispatchEvent(event);
    });

    expect(fn).toHaveBeenCalledTimes(2); // 确保在新 target 上触发
  });

  // 7）isEnabled = false 时不应创建订阅
  it('should not create subscription when isEnabled is false', () => {
    const fn = jest.fn();
    renderHook(() => {
      useEventListener('click', fn, window, { isEnabled: false });
    });

    // 手动触发事件
    act(() => {
      const event = new MouseEvent('click');
      window.dispatchEvent(event);
    });

    expect(fn).toHaveBeenCalledTimes(0); // 确保未触发
  });

  // 8）isEnabled 从 false -> true 时应创建订阅
  it('should create subscription when isEnabled changes from false to true', () => {
    const fn = jest.fn();
    const { rerender } = renderHook(
      ({ isEnabled }) => {
        useEventListener('click', fn, window, { isEnabled });
      },
      {
        initialProps: { isEnabled: false },
      },
    );

    // 手动触发事件，确保未触发
    act(() => {
      const event = new MouseEvent('click');
      window.dispatchEvent(event);
    });
    expect(fn).toHaveBeenCalledTimes(0);

    // 改变 isEnabled 为 true
    rerender({ isEnabled: true });

    // 手动触发事件，确保触发了
    act(() => {
      const event = new MouseEvent('click');
      window.dispatchEvent(event);
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  // 9）ref.current 初始为 null 时应安全跳过绑定
  it('should safely skip subscription when ref.current is initially null', () => {
    const fn = jest.fn();
    renderHook(() => {
      const ref = useRef<HTMLElement | null>(null);
      useEventListener('click', fn, ref);
    });

    // 手动触发事件，确保未触发
    act(() => {
      const event = new MouseEvent('click');
      window.dispatchEvent(event);
    });

    expect(fn).toHaveBeenCalledTimes(0); // 确保未触发
  });

  // 10）ref.current 后续变为真实节点时应自动绑定
  it('should automatically bind subscription when ref.current becomes a valid target', () => {
    const fn = jest.fn();
    const { rerender } = renderHook(
      ({ ref }) => {
        useEventListener('click', fn, ref);
      },
      {
        initialProps: { ref: { current: null as NativeListenerTarget } },
      },
    );

    // 手动触发事件，确保未触发
    act(() => {
      const event = new MouseEvent('click');
      window.dispatchEvent(event);
    });
    expect(fn).toHaveBeenCalledTimes(0); // 确保未触发

    // 更新 ref.current
    rerender({ ref: { current: document as EventTarget } });

    // 手动触发事件，确保触发
    act(() => {
      const event = new MouseEvent('click');
      document.dispatchEvent(event);
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  // 11）shouldTriggerOnce 为 true 时应只触发一次
  it('should trigger once and not again', () => {
    const fn = jest.fn();
    renderHook(() => {
      useEventListener('click', fn, window, { shouldTriggerOnce: true });
    });

    // 手动触发两次
    act(() => {
      const event = new MouseEvent('click');
      window.dispatchEvent(event);
    });

    act(() => {
      const event = new MouseEvent('click');
      window.dispatchEvent(event);
    });

    expect(fn).toHaveBeenCalledTimes(1); // 确保只触发一次
  });
});
