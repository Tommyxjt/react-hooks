import { renderHook, act } from '@testing-library/react';
import useCookieState from '..';
import { makeStorageKey } from '../../useStorageState/utils/makeStorageKey';
import * as SharedReact from 'react';

type UseCookieStateHook = typeof useCookieState;

interface BCMessageEvent {
  data: unknown;
}

function getCookieValue(name: string): string | null {
  const cookie = document.cookie ?? '';
  const parts = cookie.split(';').map((x) => x.trim());

  for (const part of parts) {
    if (!part) continue;

    const eq = part.indexOf('=');
    if (eq <= 0) continue;

    const k = part.slice(0, eq).trim();
    if (k !== name) continue;

    return part.slice(eq + 1).trim();
  }

  return null;
}

function setCookieRaw(name: string, value: string) {
  // 与 useCookieState 默认 path 一致，避免路径不一致造成“写了但读不到”
  document.cookie = `${name}=${value}; Path=/`;
}

function clearAllCookies() {
  const cookie = document.cookie ?? '';
  const names = cookie
    .split(';')
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => x.split('=')[0]?.trim())
    .filter(Boolean);

  for (const name of names) {
    document.cookie = `${name}=; Path=/; Expires=${new Date(0).toUTCString()}; Max-Age=0`;
  }
}

/**
 * BroadcastChannel mock：
 * - 用于测试 useCookieState 的跨 tab signal 语法糖
 * - 通过全局 registry 模拟“同源不同 tab/窗口”的消息广播
 */
class MockBroadcastChannel {
  static registry = new Map<string, Set<MockBroadcastChannel>>();

  readonly name: string;
  private listeners = new Set<(ev: BCMessageEvent) => void>();

  constructor(name: string) {
    this.name = name;

    let set = MockBroadcastChannel.registry.get(name);
    if (!set) MockBroadcastChannel.registry.set(name, (set = new Set()));
    set.add(this);
  }

  addEventListener(type: 'message', cb: (ev: BCMessageEvent) => void) {
    if (type !== 'message') return;
    this.listeners.add(cb);
  }

  removeEventListener(type: 'message', cb: (ev: BCMessageEvent) => void) {
    if (type !== 'message') return;
    this.listeners.delete(cb);
  }

  postMessage(data: unknown) {
    const set = MockBroadcastChannel.registry.get(this.name);
    if (!set) return;

    // 广播给同频道的所有实例（包括自己）。useCookieState 内部用 tabId 去重。
    set.forEach((ch) => {
      ch.listeners.forEach((fn) => {
        fn({ data });
      });
    });
  }

  close() {
    const set = MockBroadcastChannel.registry.get(this.name);
    if (!set) return;

    set.delete(this);
    if (set.size === 0) MockBroadcastChannel.registry.delete(this.name);

    this.listeners.clear();
  }
}

/**
 * - isolateModules 会导致隔离 registry 里加载“另一份 react 单例”，从而让 hooks dispatcher 为 null；
 * - 因此在 isolateModules 内将 'react' mock 成外层 SharedReact，确保 renderHook 与被测 hook 使用同一份 React。
 */
function loadIsolatedUseCookieState(): UseCookieStateHook {
  let hook: UseCookieStateHook | null = null;

  jest.isolateModules(() => {
    jest.doMock('react', () => SharedReact);

    // eslint-disable-next-line @typescript-eslint/no-var-requires -- isolateModules requires CJS-style import
    const mod = jest.requireActual('..') as { default: UseCookieStateHook };
    hook = mod.default;

    jest.dontMock('react');
  });

  if (!hook) {
    throw new Error('Failed to load useCookieState in isolateModules()');
  }

  return hook;
}

describe('useCookieState', () => {
  const originalBroadcastChannel = globalThis.BroadcastChannel;

  beforeAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- global shim for tests
    (globalThis as any).BroadcastChannel =
      MockBroadcastChannel as unknown as typeof BroadcastChannel;
  });

  afterAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- restore global shim
    (globalThis as any).BroadcastChannel = originalBroadcastChannel;
  });

  afterEach(() => {
    clearAllCookies();
    MockBroadcastChannel.registry.clear();
    jest.restoreAllMocks();
  });

  // 1）初始化：cookie 已有值时，应在 mount 读取并作为 state 初始值
  it('should initialize state from cookie when value exists', () => {
    const key = 'k-init';
    const storageKey = makeStorageKey(key, { prefix: 'demo', schema: 'v1' });

    // number 的 JSON raw 为 "123"，URL 解码后仍为 "123"
    setCookieRaw(storageKey, '123');

    const { result, unmount } = renderHook(() =>
      useCookieState<number>(key, {
        prefix: 'demo',
        schema: 'v1',
        defaultValue: 0,
      }),
    );

    expect(result.current[0]).toBe(123);
    unmount();
  });

  // 2）set：应写入 cookie，并更新 state（默认 URL 编码 + 默认 JSON serializer）
  it('should set value and persist to cookie with default URL encoding', () => {
    const key = 'k-set';
    const storageKey = makeStorageKey(key, { prefix: 'demo', schema: 'v1' });

    const { result, unmount } = renderHook(() =>
      useCookieState<string>(key, {
        prefix: 'demo',
        schema: 'v1',
        defaultValue: '',
      }),
    );

    act(() => {
      result.current[1].set('a b;=');
    });

    expect(result.current[0]).toBe('a b;=');

    // JSON.stringify('a b;=') => "\"a b;=\""
    // URL encode => %22a%20b%3B%3D%22
    expect(getCookieValue(storageKey)).toBe('%22a%20b%3B%3D%22');

    unmount();
  });

  // 3）remove：应删除 cookie，并回退 defaultValue
  it('should remove cookie and fallback to defaultValue', () => {
    const key = 'k-remove';
    const storageKey = makeStorageKey(key, { prefix: 'demo', schema: 'v1' });

    setCookieRaw(storageKey, '9');

    const { result, unmount } = renderHook(() =>
      useCookieState<number>(key, {
        prefix: 'demo',
        schema: 'v1',
        defaultValue: 0,
      }),
    );

    expect(result.current[0]).toBe(9);

    act(() => {
      result.current[1].remove();
    });

    expect(getCookieValue(storageKey)).toBeNull();
    expect(result.current[0]).toBe(0);

    unmount();
  });

  // 4）reset：等价于 set(defaultValue)，应把默认值写回 cookie 并更新 state
  it('should reset to defaultValue and write it into cookie', () => {
    const key = 'k-reset';
    const storageKey = makeStorageKey(key, { prefix: 'demo', schema: 'v1' });

    setCookieRaw(storageKey, '9');

    const { result, unmount } = renderHook(() =>
      useCookieState<number>(key, {
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
    expect(getCookieValue(storageKey)).toBe('0');

    unmount();
  });

  // 5）同 tab 多实例同步（默认开启）：A set 后 B 应自动对齐
  it('should sync between multiple instances in the same tab (same key)', () => {
    const key = 'k-in-tab-sync';

    const a = renderHook(() =>
      useCookieState<'light' | 'dark'>(key, {
        prefix: 'demo',
        schema: 'v1',
        defaultValue: 'light',
      }),
    );

    const b = renderHook(() =>
      useCookieState<'light' | 'dark'>(key, {
        prefix: 'demo',
        schema: 'v1',
        defaultValue: 'light',
      }),
    );

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

  // 6）跨 tab 同步（signal=broadcast + 自定义 channel）：用 isolateModules 模拟两 tab（不同 TAB_ID）
  it('should sync across tabs when signal=broadcast (custom signalChannelName)', () => {
    const CHANNEL = 'demo:cookie-signal';

    // 关键：只在这个 case 用 isolateModules，确保“两个 tab”有不同 TAB_ID
    const useCookieStateA = loadIsolatedUseCookieState();
    const useCookieStateB = loadIsolatedUseCookieState();

    const key = 'auth:token';

    const tabA = renderHook(() =>
      useCookieStateA<string | undefined>(key, {
        prefix: 'demo',
        schema: 'v1',
        signal: 'broadcast',
        signalChannelName: CHANNEL,
      }),
    );

    const tabB = renderHook(() =>
      useCookieStateB<string | undefined>(key, {
        prefix: 'demo',
        schema: 'v1',
        signal: 'broadcast',
        signalChannelName: CHANNEL,
      }),
    );

    act(() => {});

    expect(tabA.result.current[0]).toBeUndefined();
    expect(tabB.result.current[0]).toBeUndefined();

    act(() => {
      tabA.result.current[1].set('token123');
    });

    expect(tabA.result.current[0]).toBe('token123');
    expect(tabB.result.current[0]).toBe('token123');

    act(() => {
      tabA.result.current[1].remove();
    });

    expect(tabA.result.current[0]).toBeUndefined();
    expect(tabB.result.current[0]).toBeUndefined();

    tabA.unmount();
    tabB.unmount();
  });
});
