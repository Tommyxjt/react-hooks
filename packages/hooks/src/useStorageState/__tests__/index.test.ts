import { renderHook, act } from '@testing-library/react';
import useStorageState, {
  type StorageChangeDetail,
  type StorageLike,
  type StorageSyncer,
  type UseStorageStateOptions,
} from '..';
import { makeStorageKey } from '../utils/makeStorageKey';

type Subscriber = (detail: StorageChangeDetail) => void;

function createMemoryStorage(initial: Record<string, string> = {}) {
  const map = new Map<string, string>(Object.entries(initial));

  const getItem = jest.fn((k: string) => (map.has(k) ? (map.get(k) as string) : null));
  const setItem = jest.fn((k: string, v: string) => {
    map.set(k, v);
  });
  const removeItem = jest.fn((k: string) => {
    map.delete(k);
  });

  const storage: StorageLike = { getItem, setItem, removeItem };

  return { storage, map, getItem, setItem, removeItem };
}

function createTestSyncer() {
  const buckets = new Map<string, Set<Subscriber>>();

  const subscribe = jest.fn((storageKey: string, cb: Subscriber) => {
    let set = buckets.get(storageKey);
    if (!set) buckets.set(storageKey, (set = new Set()));
    set.add(cb);

    return () => {
      set!.delete(cb);
      if (set!.size === 0) buckets.delete(storageKey);
    };
  });

  const emit = jest.fn((detail: StorageChangeDetail) => {
    buckets.get(detail.storageKey)?.forEach((fn) => fn(detail));
  });

  const syncer: StorageSyncer = { subscribe, emit };

  return { syncer, subscribe, emit };
}

describe('useStorageState', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // 1）初始化：storage 命中时应读取并反序列化为 state（默认 JSON + identity codec）
  it('should initialize state from storage when value exists', () => {
    const key = 'k';
    const storageKey = makeStorageKey(key, { prefix: 'p', schema: 'v1' });

    const { storage } = createMemoryStorage({ [storageKey]: '123' });
    const { syncer } = createTestSyncer();

    const { result } = renderHook(() =>
      useStorageState<number>(key, {
        storage: () => storage,
        syncer,
        prefix: 'p',
        schema: 'v1',
        defaultValue: 0,
      }),
    );

    expect(result.current[0]).toBe(123);
  });

  // 2）初始化：storage 缺失时应回退 defaultValue；且不应自动落盘（persistDefaultValue=false）
  it('should fallback to defaultValue when storage is missing and not persist by default', () => {
    const key = 'k';
    const storageKey = makeStorageKey(key, { prefix: 'p', schema: 'v1' });

    const { storage, map, setItem } = createMemoryStorage();
    const { syncer, emit } = createTestSyncer();

    const { result } = renderHook(() =>
      useStorageState<number>(key, {
        storage: () => storage,
        syncer,
        prefix: 'p',
        schema: 'v1',
        defaultValue: 0,
      }),
    );

    expect(result.current[0]).toBe(0);
    expect(map.get(storageKey)).toBeUndefined();
    expect(setItem).toHaveBeenCalledTimes(0);
    expect(emit).toHaveBeenCalledTimes(0);
  });

  // 3）persistDefaultValue：挂载后仅当缺失时写入一次，并 emit(set) 通知订阅者同步
  it('should persist defaultValue once on mount when missing (persistDefaultValue=true)', () => {
    const key = 'k';
    const storageKey = makeStorageKey(key, { prefix: 'p', schema: 'v1' });

    const { storage, map, setItem } = createMemoryStorage();
    const { syncer, emit } = createTestSyncer();

    renderHook(() =>
      useStorageState<number>(key, {
        storage: () => storage,
        syncer,
        prefix: 'p',
        schema: 'v1',
        defaultValue: 0,
        persistDefaultValue: true,
      }),
    );

    // effect 已执行：写入 '0'
    expect(map.get(storageKey)).toBe('0');
    expect(setItem).toHaveBeenCalledTimes(1);

    // 需要 emit：同 tab 内本实例 setItem 不会触发浏览器原生 storage event，
    // emit 让其他订阅者立即对齐 UI
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenLastCalledWith(
      expect.objectContaining({
        storageKey,
        key,
        reason: 'set',
        prevRaw: null,
        nextRaw: '0',
      }),
    );
  });

  // 4）set：应写入 storage，并 emit(set)，同时更新 state
  it('should set value: write storage + emit + update state', () => {
    const key = 'k';
    const storageKey = makeStorageKey(key, { prefix: 'p', schema: 'v1' });

    const { storage, map, setItem } = createMemoryStorage();
    const { syncer, emit } = createTestSyncer();

    const { result } = renderHook(() =>
      useStorageState<number>(key, {
        storage: () => storage,
        syncer,
        prefix: 'p',
        schema: 'v1',
        defaultValue: 0,
        persistDefaultValue: false,
      }),
    );

    act(() => {
      result.current[1].set(5);
    });

    expect(result.current[0]).toBe(5);
    expect(map.get(storageKey)).toBe('5');
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenLastCalledWith(
      expect.objectContaining({
        storageKey,
        key,
        reason: 'set',
        nextRaw: '5',
      }),
    );
  });

  // 5）remove：应 removeItem，并 emit(remove)，同时 state 回退 defaultValue
  it('should remove value: remove storage + emit + fallback to defaultValue', () => {
    const key = 'k';
    const storageKey = makeStorageKey(key, { prefix: 'p', schema: 'v1' });

    const { storage, map, removeItem } = createMemoryStorage({ [storageKey]: '5' });
    const { syncer, emit } = createTestSyncer();

    const { result } = renderHook(() =>
      useStorageState<number>(key, {
        storage: () => storage,
        syncer,
        prefix: 'p',
        schema: 'v1',
        defaultValue: 0,
      }),
    );

    expect(result.current[0]).toBe(5);

    act(() => {
      result.current[1].remove();
    });

    expect(map.get(storageKey)).toBeUndefined();
    expect(removeItem).toHaveBeenCalledTimes(1);

    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenLastCalledWith(
      expect.objectContaining({
        storageKey,
        key,
        reason: 'remove',
        nextRaw: null,
      }),
    );

    expect(result.current[0]).toBe(0);
  });

  // 6）reset：等价于 set(defaultValue)，应写入 storage，并 emit(set)，同时 state 回到 defaultValue
  it('should reset: set defaultValue into storage + emit + update state', () => {
    const key = 'k';
    const storageKey = makeStorageKey(key, { prefix: 'p', schema: 'v1' });

    const { storage, map, setItem } = createMemoryStorage({ [storageKey]: '5' });
    const { syncer, emit } = createTestSyncer();

    const { result } = renderHook(() =>
      useStorageState<number>(key, {
        storage: () => storage,
        syncer,
        prefix: 'p',
        schema: 'v1',
        defaultValue: 0,
      }),
    );

    expect(result.current[0]).toBe(5);

    act(() => {
      result.current[1].reset();
    });

    expect(result.current[0]).toBe(0);
    expect(map.get(storageKey)).toBe('0');
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenLastCalledWith(
      expect.objectContaining({
        storageKey,
        key,
        reason: 'set',
        nextRaw: '0',
      }),
    );
  });

  // 7）默认 JSON serializer：set(undefined) 语义退化为 remove（缺省=不存在）
  it('should treat set(undefined) as remove when using default JSON serializer', () => {
    const key = 'k';
    const storageKey = makeStorageKey(key, { prefix: 'p', schema: 'v1' });

    const { storage, map, removeItem } = createMemoryStorage({ [storageKey]: '5' });
    const { syncer, emit } = createTestSyncer();

    const { result } = renderHook(() =>
      useStorageState<number | undefined>(key, {
        storage: () => storage,
        syncer,
        prefix: 'p',
        schema: 'v1',
        defaultValue: 0,
      }),
    );

    expect(result.current[0]).toBe(5);

    act(() => {
      // 强制传入 undefined：在默认 JSON serializer 下无法安全 stringify(undefined)，因此定义为 remove 语义
      result.current[1].set(undefined);
    });

    expect(map.get(storageKey)).toBeUndefined();
    expect(removeItem).toHaveBeenCalledTimes(1);

    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenLastCalledWith(
      expect.objectContaining({
        storageKey,
        key,
        reason: 'remove',
        nextRaw: null,
      }),
    );

    // remove 后回退 defaultValue
    expect(result.current[0]).toBe(0);
  });

  // 8）订阅：external emit(nextRaw) 应直接 decode/deserialize(nextRaw) 并更新 state；emit(nextRaw=null) 应回退 defaultValue
  it('should update state from syncer external events', () => {
    const key = 'k';
    const storageKey = makeStorageKey(key, { prefix: 'p', schema: 'v1' });

    const { storage } = createMemoryStorage();
    const { syncer } = createTestSyncer();

    const { result } = renderHook(() =>
      useStorageState<number>(key, {
        storage: () => storage,
        syncer,
        prefix: 'p',
        schema: 'v1',
        defaultValue: 0,
      }),
    );

    expect(result.current[0]).toBe(0);

    act(() => {
      syncer.emit({
        storageKey,
        key,
        reason: 'external',
        prevRaw: null,
        nextRaw: '7',
        sourceId: 'external',
      });
    });

    expect(result.current[0]).toBe(7);

    act(() => {
      syncer.emit({
        storageKey,
        key,
        reason: 'external',
        prevRaw: '7',
        nextRaw: null,
        sourceId: 'external',
      });
    });

    expect(result.current[0]).toBe(0);
  });

  // 9）订阅：external 发出“相同值”时不应触发 rerender（equals/Object.is 短路）
  it('should not rerender when external event resolves to the same value', () => {
    const key = 'k';
    const storageKey = makeStorageKey(key, { prefix: 'p', schema: 'v1' });

    const { storage } = createMemoryStorage({ [storageKey]: '1' });
    const { syncer } = createTestSyncer();

    /**
     * @testing-library/react 的 renderHook 不提供 result.all（不像老的 @testing-library/react-hooks）
     * 因此这里用一个“外部计数器”统计 hook callback 被执行的次数，作为 rerender 次数的近似观测。
     *
     * 断言目标：
     * - 当 external 事件解析出来的值与当前 state 相等时，Hook 内部 equals/Object.is 会短路 setState；
     * - setState 没发生，则不会触发 rerender，因此 renders 不应增加。
     */
    let renders = 0;

    const { result } = renderHook(() => {
      renders += 1;
      return useStorageState<number>(key, {
        storage: () => storage,
        syncer,
        prefix: 'p',
        schema: 'v1',
        defaultValue: 0,
      })[0];
    });

    expect(result.current).toBe(1);
    const initialRenders = renders;

    act(() => {
      // 发出 external 事件：nextRaw 仍为 '1'，解析后与当前 value 相同
      syncer.emit({
        storageKey,
        key,
        reason: 'external',
        prevRaw: '1',
        nextRaw: '1',
        sourceId: 'external',
      });
    });

    // value 仍为 1，且没有新增 render（说明 equals/Object.is 短路生效）
    expect(result.current).toBe(1);
    expect(renders).toBe(initialRenders);
  });

  // 10）冻结：rerender 时修改 prefix/schema 不应影响 storageKey（应继续使用首次渲染的 keyOptions）
  it('should freeze keyOptions and keep using the initial storageKey even if options change', () => {
    const key = 'k';

    const initialKey = makeStorageKey(key, { prefix: 'p1', schema: 'v1' });
    const nextKey = makeStorageKey(key, { prefix: 'p2', schema: 'v2' });

    const { storage, map } = createMemoryStorage();
    const { syncer } = createTestSyncer();

    const { result, rerender } = renderHook<
      readonly [number, { set: (next: number) => void; remove: () => void; reset: () => void }],
      { opt: UseStorageStateOptions<number> }
    >(({ opt }) => useStorageState<number>(key, opt), {
      initialProps: {
        opt: {
          storage: () => storage,
          syncer,
          prefix: 'p1',
          schema: 'v1',
          defaultValue: 0,
        },
      },
    });

    rerender({
      opt: {
        storage: () => storage,
        syncer,
        // 注意：这里“故意改动”，用于验证冻结行为
        prefix: 'p2',
        schema: 'v2',
        defaultValue: 0,
      },
    });

    act(() => {
      result.current[1].set(9);
    });

    // 仍写入 initialKey；不应写入 nextKey
    expect(map.get(initialKey)).toBe('9');
    expect(map.get(nextKey)).toBeUndefined();
  });

  // 11）set 短路：当 computed 与当前值相等，且写入后的 encoded 与 storage 中一致时，应跳过 setItem/emit
  it('should short-circuit set when value is unchanged and storage already matches encoded', () => {
    const key = 'k';
    const storageKey = makeStorageKey(key, { prefix: 'p', schema: 'v1' });

    const { storage, setItem } = createMemoryStorage({ [storageKey]: '1' });
    const { syncer, emit } = createTestSyncer();

    const { result } = renderHook(() =>
      useStorageState<number>(key, {
        storage: () => storage,
        syncer,
        prefix: 'p',
        schema: 'v1',
        defaultValue: 0,
      }),
    );

    expect(result.current[0]).toBe(1);

    act(() => {
      result.current[1].set(1);
    });

    // 若 storage 已是 '1' 且 value 不变，则无需重复落盘/广播
    expect(setItem).toHaveBeenCalledTimes(0);
    expect(emit).toHaveBeenCalledTimes(0);
  });

  // 12）defaultValue 缺省：回退值为 undefined；reset() 会变成 set(undefined) 从而退化为 remove（默认 JSON）
  it('should fallback to undefined when defaultValue is omitted; reset should behave like remove (default JSON)', () => {
    const key = 'k';
    const storageKey = makeStorageKey(key, { prefix: 'p', schema: 'v1' });

    const { storage, map, removeItem } = createMemoryStorage({ [storageKey]: '5' });
    const { syncer, emit } = createTestSyncer();

    const { result } = renderHook(() =>
      useStorageState<number | undefined>(key, {
        storage: () => storage,
        syncer,
        prefix: 'p',
        schema: 'v1',
        // defaultValue omitted => undefined
      }),
    );

    expect(result.current[0]).toBe(5);

    act(() => {
      result.current[1].reset();
    });

    expect(map.get(storageKey)).toBeUndefined();
    expect(removeItem).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenLastCalledWith(
      expect.objectContaining({
        storageKey,
        key,
        reason: 'remove',
        nextRaw: null,
      }),
    );

    expect(result.current[0]).toBeUndefined();
  });
});
