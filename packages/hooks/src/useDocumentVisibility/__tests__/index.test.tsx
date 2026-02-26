import { renderHook, act } from '@testing-library/react';
import useDocumentVisibility from '..';

type MockDocumentVisibilityState = DocumentVisibilityState | undefined;

describe('useDocumentVisibility', () => {
  let currentVisibilityState: MockDocumentVisibilityState = 'visible';

  const mockDocumentVisibilityState = (nextVisibilityState: MockDocumentVisibilityState) => {
    currentVisibilityState = nextVisibilityState;

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => currentVisibilityState,
    });

    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => currentVisibilityState !== 'visible',
    });
  };

  beforeEach(() => {
    mockDocumentVisibilityState('visible');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    Reflect.deleteProperty(document, 'visibilityState');
    Reflect.deleteProperty(document, 'hidden');
  });

  // 1）挂载时应返回当前 document.visibilityState
  it('should return current document visibility state on mount', () => {
    mockDocumentVisibilityState('visible');

    const { result } = renderHook(() => {
      return useDocumentVisibility();
    });

    expect(result.current).toBe('visible');
  });

  // 2）visibilitychange 触发时应更新为 hidden
  it('should update state to hidden when visibility changes', () => {
    const { result } = renderHook(() => {
      return useDocumentVisibility();
    });

    expect(result.current).toBe('visible');

    mockDocumentVisibilityState('hidden');

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(result.current).toBe('hidden');
  });

  // 3）visibilitychange 触发时应更新为最新状态（hidden -> visible）
  it('should update state to latest visibility value when visibility changes again', () => {
    const { result } = renderHook(() => {
      return useDocumentVisibility();
    });

    mockDocumentVisibilityState('hidden');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(result.current).toBe('hidden');

    mockDocumentVisibilityState('visible');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(result.current).toBe('visible');
  });

  // 4）卸载时应清理 visibilitychange 订阅
  it('should clean up visibilitychange subscription on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

    const { unmount } = renderHook(() => {
      return useDocumentVisibility();
    });

    unmount();

    const visibilityChangeRemoveCalls = removeEventListenerSpy.mock.calls.filter(
      ([eventName]) => eventName === 'visibilitychange',
    );

    expect(visibilityChangeRemoveCalls.length).toBe(1);
  });

  // 5）重复 rerender 时不应重复创建订阅
  it('should not re-subscribe on rerender', () => {
    const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

    const { rerender } = renderHook(() => {
      return useDocumentVisibility();
    });

    rerender();
    rerender();

    const visibilityChangeAddCalls = addEventListenerSpy.mock.calls.filter(
      ([eventName]) => eventName === 'visibilitychange',
    );

    expect(visibilityChangeAddCalls.length).toBe(1);
  });

  // 6）当 visibilityState 不可用时应返回 undefined
  it('should return undefined when document.visibilityState is unavailable', () => {
    mockDocumentVisibilityState(undefined);

    const { result } = renderHook(() => {
      return useDocumentVisibility();
    });

    expect(result.current).toBeUndefined();
  });
});
