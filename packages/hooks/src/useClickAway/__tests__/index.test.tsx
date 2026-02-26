import { renderHook, act } from '@testing-library/react';
import { useLayoutEffect, useRef } from 'react';
import useClickAway from '..';

describe('useClickAway', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    jest.restoreAllMocks();
  });

  // 1）点击白名单区域外部时应触发 onClickAway
  it('should trigger onClickAway when clicking outside protected target', () => {
    const protectedNode = document.createElement('div');
    const outsideNode = document.createElement('div');

    document.body.appendChild(protectedNode);
    document.body.appendChild(outsideNode);

    const fn = jest.fn();

    renderHook(() => {
      useClickAway(protectedNode, fn, { eventName: 'click' });
    });

    act(() => {
      outsideNode.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(fn).toHaveBeenCalledTimes(1);
  });

  // 2）点击白名单区域内部时不应触发 onClickAway
  it('should not trigger onClickAway when clicking inside protected target', () => {
    const protectedNode = document.createElement('div');
    const innerNode = document.createElement('button');

    protectedNode.appendChild(innerNode);
    document.body.appendChild(protectedNode);

    const fn = jest.fn();

    renderHook(() => {
      useClickAway(protectedNode, fn, { eventName: 'click' });
    });

    act(() => {
      innerNode.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(fn).toHaveBeenCalledTimes(0);
  });

  // 3）卸载时应清理订阅
  it('should clean up subscription on unmount', () => {
    const protectedNode = document.createElement('div');
    const outsideNode = document.createElement('div');

    document.body.appendChild(protectedNode);
    document.body.appendChild(outsideNode);

    const fn = jest.fn();

    const { unmount } = renderHook(() => {
      useClickAway(protectedNode, fn, { eventName: 'click' });
    });

    unmount();

    act(() => {
      outsideNode.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(fn).toHaveBeenCalledTimes(0);
  });

  // 4）handler 更新时不应重建订阅，且应使用最新逻辑
  it('should use latest onClickAway logic without re-subscribing', () => {
    const protectedNode = document.createElement('div');
    const outsideNode = document.createElement('div');

    document.body.appendChild(protectedNode);
    document.body.appendChild(outsideNode);

    const fnA = jest.fn();
    const fnB = jest.fn();

    const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

    const { rerender } = renderHook(
      ({ handler }: { handler: (event: MouseEvent) => void }) => {
        useClickAway<MouseEvent>(protectedNode, handler, { eventName: 'click' });
      },
      {
        initialProps: { handler: fnA },
      },
    );

    act(() => {
      outsideNode.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(fnA).toHaveBeenCalledTimes(1);

    rerender({ handler: fnB });

    act(() => {
      outsideNode.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(fnA).toHaveBeenCalledTimes(1);
    expect(fnB).toHaveBeenCalledTimes(1);

    const clickAddCalls = addEventListenerSpy.mock.calls.filter(
      ([eventName]) => eventName === 'click',
    );
    expect(clickAddCalls.length).toBe(1);
  });

  // 5）多白名单区域时，点击任一白名单内部都不应触发
  it('should not trigger when clicking inside any protected target in array', () => {
    const triggerNode = document.createElement('button');
    const panelNode = document.createElement('div');
    const panelInnerNode = document.createElement('span');
    const outsideNode = document.createElement('div');

    panelNode.appendChild(panelInnerNode);

    document.body.appendChild(triggerNode);
    document.body.appendChild(panelNode);
    document.body.appendChild(outsideNode);

    const fn = jest.fn();

    renderHook(() => {
      useClickAway([triggerNode, panelNode], fn, { eventName: 'click' });
    });

    act(() => {
      triggerNode.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    act(() => {
      panelInnerNode.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    act(() => {
      outsideNode.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(fn).toHaveBeenCalledTimes(1);
  });

  // 6）isEnabled 为 false 时不应触发；变为 true 后应生效
  it('should respect isEnabled option', () => {
    const protectedNode = document.createElement('div');
    const outsideNode = document.createElement('div');

    document.body.appendChild(protectedNode);
    document.body.appendChild(outsideNode);

    const fn = jest.fn();

    const { rerender } = renderHook(
      ({ isEnabled }: { isEnabled: boolean }) => {
        useClickAway(protectedNode, fn, { eventName: 'click', isEnabled });
      },
      {
        initialProps: { isEnabled: false },
      },
    );

    act(() => {
      outsideNode.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(fn).toHaveBeenCalledTimes(0);

    rerender({ isEnabled: true });

    act(() => {
      outsideNode.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  // 7）ref.current 初始为 null 时应安全跳过；后续变为节点后自动生效
  it('should safely skip when ref.current is null and bind later when ref becomes available', () => {
    const outsideNode = document.createElement('div');
    const protectedNode = document.createElement('div');

    document.body.appendChild(outsideNode);
    document.body.appendChild(protectedNode);

    const fn = jest.fn();

    const targetRef = { current: null as HTMLDivElement | null };

    const { rerender } = renderHook(() => {
      useClickAway(targetRef, fn, { eventName: 'click' });
    });

    act(() => {
      outsideNode.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(fn).toHaveBeenCalledTimes(0);

    targetRef.current = protectedNode;
    rerender();

    act(() => {
      outsideNode.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  // 8）listenerContainer 自定义容器时，应只在该容器范围内监听
  it('should listen on custom listenerContainer only', () => {
    const listenerContainer = document.createElement('div');
    const protectedNode = document.createElement('div');
    const outsideInsideContainerNode = document.createElement('div');
    const outsideGlobalNode = document.createElement('div');

    listenerContainer.appendChild(protectedNode);
    listenerContainer.appendChild(outsideInsideContainerNode);

    document.body.appendChild(listenerContainer);
    document.body.appendChild(outsideGlobalNode);

    const fn = jest.fn();

    renderHook(() => {
      useClickAway(protectedNode, fn, {
        eventName: 'click',
        listenerContainer,
      });
    });

    // 容器外部点击：因为监听不在 document 上，所以不触发
    act(() => {
      outsideGlobalNode.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(fn).toHaveBeenCalledTimes(0);

    // 容器内部且在白名单外：应触发
    act(() => {
      outsideInsideContainerNode.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  // 9）eventName 配置应生效（只响应指定事件）
  it('should respond only to configured eventName', () => {
    const protectedNode = document.createElement('div');
    const outsideNode = document.createElement('div');

    document.body.appendChild(protectedNode);
    document.body.appendChild(outsideNode);

    const fn = jest.fn();

    renderHook(() => {
      useClickAway(protectedNode, fn, { eventName: 'mousedown' });
    });

    act(() => {
      outsideNode.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(fn).toHaveBeenCalledTimes(0);

    act(() => {
      outsideNode.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  // 10）应优先使用 composedPath 判断白名单命中（兼容 Shadow DOM 场景）
  it('should prefer composedPath when available', () => {
    const protectedNode = document.createElement('div');
    const outsideNode = document.createElement('div');

    document.body.appendChild(protectedNode);
    document.body.appendChild(outsideNode);

    const fn = jest.fn();

    renderHook(() => {
      useClickAway(protectedNode, fn, { eventName: 'click' });
    });

    const syntheticEvent = new Event('click', { bubbles: true });

    Object.defineProperty(syntheticEvent, 'composedPath', {
      configurable: true,
      value: () => [protectedNode, document, window],
    });

    act(() => {
      outsideNode.dispatchEvent(syntheticEvent);
    });

    expect(fn).toHaveBeenCalledTimes(0);
  });

  // 11）ref 对象形式的 listenerContainer 应在 current 可用后自动生效
  it('should bind when listenerContainer ref.current becomes available', () => {
    const protectedNode = document.createElement('div');
    const listenerContainer = document.createElement('div');
    const outsideInsideContainerNode = document.createElement('div');

    listenerContainer.appendChild(protectedNode);
    listenerContainer.appendChild(outsideInsideContainerNode);

    document.body.appendChild(listenerContainer);

    const fn = jest.fn();

    const listenerContainerRef = { current: null as HTMLDivElement | null };

    const { rerender } = renderHook(() => {
      useClickAway(protectedNode, fn, {
        eventName: 'click',
        listenerContainer: listenerContainerRef,
      });
    });

    act(() => {
      outsideInsideContainerNode.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(fn).toHaveBeenCalledTimes(0);

    listenerContainerRef.current = listenerContainer;
    rerender();

    act(() => {
      outsideInsideContainerNode.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  // 12）listenerContainer 的 ref 在首轮 commit 后可用时，应立即绑定（无需 rerender）
  it('should bind on first mount when listenerContainer ref.current becomes available in layout phase', () => {
    const listenerContainer = document.createElement('div');
    const protectedNode = document.createElement('div');
    const outsideInsideContainerNode = document.createElement('div');

    listenerContainer.appendChild(protectedNode);
    listenerContainer.appendChild(outsideInsideContainerNode);
    document.body.appendChild(listenerContainer);

    const fn = jest.fn();

    renderHook(() => {
      const listenerContainerRef = useRef<HTMLDivElement | null>(null);

      // 模拟真实 DOM ref 挂载时机：commit 后（layout 阶段）ref.current 才可用
      useLayoutEffect(() => {
        listenerContainerRef.current = listenerContainer;
      }, []);

      useClickAway(protectedNode, fn, {
        eventName: 'click',
        listenerContainer: listenerContainerRef,
      });
    });

    // 不触发 rerender，直接验证首轮挂载后是否已完成绑定
    act(() => {
      outsideInsideContainerNode.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(fn).toHaveBeenCalledTimes(1);
  });

  // 13）真实 useRef 场景下，protectedTargets 传 ref 应正常工作
  it('should support protected target passed as useRef object', () => {
    const protectedNode = document.createElement('div');
    const outsideNode = document.createElement('div');

    document.body.appendChild(protectedNode);
    document.body.appendChild(outsideNode);

    const fn = jest.fn();

    renderHook(() => {
      const targetRef = useRef<HTMLDivElement | null>(protectedNode);
      useClickAway(targetRef, fn, { eventName: 'click' });
    });

    act(() => {
      protectedNode.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(fn).toHaveBeenCalledTimes(0);

    act(() => {
      outsideNode.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
