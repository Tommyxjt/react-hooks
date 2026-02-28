import { renderHook, act } from '@testing-library/react';
import useSessionStorageState from '..';
import { makeStorageKey } from '../../useStorageState/utils/makeStorageKey';

describe('useSessionStorageState', () => {
  afterEach(() => {
    // 清理 sessionStorage，避免用例之间互相污染（sessionStorage 语义是“tab 会话内”）
    window.sessionStorage.clear();
    jest.restoreAllMocks();
  });

  /**
   * 1）初始化：sessionStorage 已有值时，应在 mount 读取并作为 state 初始值
   *
   * 场景：用户刷新页面时，希望当前 tab 的临时流程（向导 step、临时草稿）能恢复。
   */
  it('should initialize state from sessionStorage when value exists', () => {
    const key = 'k-init';
    const storageKey = makeStorageKey(key, { prefix: 'demo', schema: 'v1' });

    window.sessionStorage.setItem(storageKey, JSON.stringify(123));

    const { result, unmount } = renderHook(() =>
      useSessionStorageState<number>(key, {
        prefix: 'demo',
        schema: 'v1',
        defaultValue: 0,
      }),
    );

    expect(result.current[0]).toBe(123);
    unmount();
  });

  /**
   * 2）set：应写入 sessionStorage，并更新 state
   *
   * 场景：用户在当前 tab 的向导中点击 Next，进度应立刻更新且落盘到 sessionStorage。
   */
  it('should set value and persist to sessionStorage', () => {
    const key = 'k-set';
    const storageKey = makeStorageKey(key, { prefix: 'demo', schema: 'v1' });

    const { result, unmount } = renderHook(() =>
      useSessionStorageState<number>(key, {
        prefix: 'demo',
        schema: 'v1',
        defaultValue: 0,
      }),
    );

    act(() => {
      result.current[1].set(5);
    });

    expect(result.current[0]).toBe(5);
    expect(window.sessionStorage.getItem(storageKey)).toBe(JSON.stringify(5));
    unmount();
  });

  /**
   * 3）remove：应删除 sessionStorage 项，并回退 defaultValue
   *
   * 场景：用户点击“清空/重来”，存储项应被移除（raw 变 null），UI 回退默认值。
   */
  it('should remove value from sessionStorage and fallback to defaultValue', () => {
    const key = 'k-remove';
    const storageKey = makeStorageKey(key, { prefix: 'demo', schema: 'v1' });

    window.sessionStorage.setItem(storageKey, JSON.stringify(9));

    const { result, unmount } = renderHook(() =>
      useSessionStorageState<number>(key, {
        prefix: 'demo',
        schema: 'v1',
        defaultValue: 0,
      }),
    );

    expect(result.current[0]).toBe(9);

    act(() => {
      result.current[1].remove();
    });

    expect(window.sessionStorage.getItem(storageKey)).toBeNull();
    expect(result.current[0]).toBe(0);
    unmount();
  });

  /**
   * 4）reset：等价于 set(defaultValue)，应把默认值写回 sessionStorage 并更新 state
   *
   * 场景：reset 的语义是“写入默认配置”，因此 storage 项应存在且为默认值。
   */
  it('should reset to defaultValue and write it into sessionStorage', () => {
    const key = 'k-reset';
    const storageKey = makeStorageKey(key, { prefix: 'demo', schema: 'v1' });

    window.sessionStorage.setItem(storageKey, JSON.stringify(9));

    const { result, unmount } = renderHook(() =>
      useSessionStorageState<number>(key, {
        prefix: 'demo',
        schema: 'v1',
        defaultValue: 0,
      }),
    );

    expect(result.current[0]).toBe(9);

    act(() => {
      result.current[1].reset();
    });

    expect(result.current[0]).toBe(0);
    expect(window.sessionStorage.getItem(storageKey)).toBe(JSON.stringify(0));
    unmount();
  });

  /**
   * 5）同 tab 多实例同步（同 key）：
   * - A 实例 set 后，B 实例应自动对齐
   *
   * 场景：同一页面内两个互不相干模块都用同一个 sessionStorage key（无 props/context 关系），也应保持一致。
   *
   * 关键点：
   * - 同 tab 内浏览器不会对“本 tab 自己的 setItem/removeItem”触发 storage event；
   * - useSessionStorageState 默认通过内部 syncer 的 emit/subscribe 广播变更，驱动其他实例对齐。
   */
  it('should sync between multiple instances in the same tab (same key)', () => {
    const key = 'k-in-tab-sync';

    const a = renderHook(() =>
      useSessionStorageState<'light' | 'dark'>(key, {
        prefix: 'demo',
        schema: 'v1',
        defaultValue: 'light',
      }),
    );

    const b = renderHook(() =>
      useSessionStorageState<'light' | 'dark'>(key, {
        prefix: 'demo',
        schema: 'v1',
        defaultValue: 'light',
      }),
    );

    // 确保订阅 effect 已建立（renderHook 通常会自动 flush effect；空 act 作为稳健兜底）
    act(() => {});

    expect(a.result.current[0]).toBe('light');
    expect(b.result.current[0]).toBe('light');

    act(() => {
      a.result.current[1].set('dark');
    });

    expect(a.result.current[0]).toBe('dark');
    expect(b.result.current[0]).toBe('dark');

    a.unmount();
    b.unmount();
  });

  /**
   * 6）不跨 tab（保持 sessionStorage 原生语义）：
   * - useSessionStorageState 不监听 window.storage 来扩张语义；
   * - 因此手动派发 storage event 不应影响 state（没有 listener 注入 external 变更）。
   *
   * 场景：sessionStorage 用于“当前 tab 会话内”的临时状态；新 tab 不应被动同步。
   */
  it('should not react to window storage events (sessionStorage keeps tab-scoped semantics)', () => {
    const key = 'k-no-cross-tab';
    const storageKey = makeStorageKey(key, { prefix: 'demo', schema: 'v1' });

    const { result, unmount } = renderHook(() =>
      useSessionStorageState<string | undefined>(key, {
        prefix: 'demo',
        schema: 'v1',
      }),
    );

    expect(result.current[0]).toBeUndefined();

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: storageKey,
          oldValue: null,
          newValue: JSON.stringify('token123'),
          storageArea: window.sessionStorage,
        }),
      );
    });

    // 由于 sessionStorageSyncer 不桥接 storage event，因此 state 不应变化
    expect(result.current[0]).toBeUndefined();
    unmount();
  });
});
