import { renderHook, act } from '@testing-library/react';
import useLocalStorageState from '..';
import { makeStorageKey } from '../../useStorageState/utils/makeStorageKey';

describe('useLocalStorageState', () => {
  afterEach(() => {
    // 清理 localStorage，避免用例之间互相污染
    window.localStorage.clear();
    jest.restoreAllMocks();
  });

  /**
   * 1）初始化：localStorage 已有值时，应在 mount 读取并作为 state 初始值
   *
   * 场景：页面刷新/二次打开时，UI 应直接从 localStorage 恢复上次状态，而不是闪默认值。
   */
  it('should initialize state from localStorage when value exists', () => {
    const key = 'k-init';
    const storageKey = makeStorageKey(key, { prefix: 'demo', schema: 'v1' });

    window.localStorage.setItem(storageKey, JSON.stringify(123));

    const { result } = renderHook(() =>
      useLocalStorageState<number>(key, {
        prefix: 'demo',
        schema: 'v1',
        defaultValue: 0,
      }),
    );

    expect(result.current[0]).toBe(123);
  });

  /**
   * 2）set：应写入 localStorage，并更新 state
   *
   * 场景：用户修改配置（如主题/筛选条件）后，UI 立刻更新且落盘。
   */
  it('should set value and persist to localStorage', () => {
    const key = 'k-set';
    const storageKey = makeStorageKey(key, { prefix: 'demo', schema: 'v1' });

    const { result } = renderHook(() =>
      useLocalStorageState<number>(key, {
        prefix: 'demo',
        schema: 'v1',
        defaultValue: 0,
      }),
    );

    act(() => {
      result.current[1].set(5);
    });

    expect(result.current[0]).toBe(5);
    expect(window.localStorage.getItem(storageKey)).toBe(JSON.stringify(5));
  });

  /**
   * 3）remove：应删除 localStorage 项，并回退 defaultValue
   *
   * 场景：用户点击“清空配置/恢复初始”，存储项应被移除（raw 变 null），UI 回退默认值。
   */
  it('should remove value from localStorage and fallback to defaultValue', () => {
    const key = 'k-remove';
    const storageKey = makeStorageKey(key, { prefix: 'demo', schema: 'v1' });

    window.localStorage.setItem(storageKey, JSON.stringify(9));

    const { result } = renderHook(() =>
      useLocalStorageState<number>(key, {
        prefix: 'demo',
        schema: 'v1',
        defaultValue: 0,
      }),
    );

    expect(result.current[0]).toBe(9);

    act(() => {
      result.current[1].remove();
    });

    expect(window.localStorage.getItem(storageKey)).toBeNull();
    expect(result.current[0]).toBe(0);
  });

  /**
   * 4）reset：等价于 set(defaultValue)，应把默认值写回 localStorage 并更新 state
   *
   * 场景：与 remove 不同，reset 的语义是“写入默认配置”，因此 storage 项应存在且为默认值。
   */
  it('should reset to defaultValue and write it into localStorage', () => {
    const key = 'k-reset';
    const storageKey = makeStorageKey(key, { prefix: 'demo', schema: 'v1' });

    window.localStorage.setItem(storageKey, JSON.stringify(9));

    const { result } = renderHook(() =>
      useLocalStorageState<number>(key, {
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
    expect(window.localStorage.getItem(storageKey)).toBe(JSON.stringify(0));
  });

  /**
   * 5）同 tab 多实例同步（同 key）：
   * - 父组件 set 后，子组件（独立实例）应自动对齐
   *
   * 场景：同一页面里两个互不相干的模块都使用同一个偏好设置 key（没有 props/context 关系），也应保持一致。
   *
   * 关键点：同 tab 内浏览器不会对“本 tab 自己的 setItem/removeItem”触发 storage event，
   * 因此必须依赖内置 syncer 的 emit/subscribe 来同步其他实例。
   */
  it('should sync between multiple instances in the same tab (same key)', () => {
    const key = 'k-in-tab-sync';

    const a = renderHook(() =>
      useLocalStorageState<'light' | 'dark'>(key, {
        prefix: 'demo',
        schema: 'v1',
        defaultValue: 'light',
      }),
    );

    const b = renderHook(() =>
      useLocalStorageState<'light' | 'dark'>(key, {
        prefix: 'demo',
        schema: 'v1',
        defaultValue: 'light',
      }),
    );

    // 确保订阅 effect 已建立（renderHook 通常会自动 flush effect；这里用空 act 更稳）
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
   * 6）跨 tab 同步（模拟 storage event）：
   * - 其他 tab 写入 localStorage，会在本 tab 触发 window.storage 事件
   * - localStorageSyncer 会把该事件注入订阅者，从而驱动 state 对齐并 rerender
   *
   * 场景：Tab A 登录写入 token，Tab B 自动变为已登录（无需刷新）。
   */
  it('should sync across tabs by handling window storage events', () => {
    const key = 'k-cross-tab';
    const storageKey = makeStorageKey(key, { prefix: 'demo', schema: 'v1' });

    const { result } = renderHook(() =>
      useLocalStorageState<string | undefined>(key, {
        prefix: 'demo',
        schema: 'v1',
      }),
    );

    expect(result.current[0]).toBeUndefined();

    act(() => {
      // 模拟“其他 tab”写入 token：在当前 tab 触发 storage event
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: storageKey,
          oldValue: null,
          newValue: JSON.stringify('token123'),
          storageArea: window.localStorage,
        }),
      );
    });

    expect(result.current[0]).toBe('token123');

    act(() => {
      // 模拟“其他 tab”删除 token（登出）
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: storageKey,
          oldValue: JSON.stringify('token123'),
          newValue: null,
          storageArea: window.localStorage,
        }),
      );
    });

    expect(result.current[0]).toBeUndefined();
  });
});
