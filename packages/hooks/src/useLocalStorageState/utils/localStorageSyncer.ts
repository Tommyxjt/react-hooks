import type { StorageChangeDetail, StorageSyncer } from '../../useStorageState';

/**
 * localStorage 专用的模块级同步器（必须是“单例”）。
 *
 * 场景与职责：
 * 1) 同 tab 同步：
 *    - 浏览器不会对“当前 tab 自己的 localStorage.setItem/removeItem”触发 storage event；
 *    - 因此必须用 emit/subscribe 做同 tab 的 pub/sub，确保多个组件实例能立即对齐 state。
 *
 * 2) 跨 tab 同步：
 *    - 浏览器会在“其他 tab”写入 localStorage 时，在当前 tab 触发 window.storage 事件；
 *    - 这里把 storage 事件转成 StorageChangeDetail，再 emit 给当前 tab 的订阅者；
 *    - useStorageState 内置订阅后，state 会对齐到 nextRaw（decode/deserialize），从而实现跨 tab UI 同步。
 *
 * 注意：
 * - 这个 syncer 只服务 localStorage，不应复用给 sessionStorage/cookie（传播边界不同，语义会被破坏）。
 */
const buckets = new Map<string, Set<(detail: StorageChangeDetail) => void>>();

function emit(detail: StorageChangeDetail) {
  buckets.get(detail.storageKey)?.forEach((cb) => cb(detail));
}

function subscribe(storageKey: string, cb: (detail: StorageChangeDetail) => void) {
  let set = buckets.get(storageKey);
  if (!set) buckets.set(storageKey, (set = new Set()));
  set.add(cb);

  return () => {
    set!.delete(cb);
    if (set!.size === 0) buckets.delete(storageKey);
  };
}

/**
 * 跨 tab 输入：把 window.storage 事件桥接进本 tab 的 syncer。
 *
 * 关键点：
 * - event.key 就是“最终 storageKey”（完整 key），可以直接作为路由键；
 * - event.newValue / oldValue 对应 “编码后的存储值”（也就是 nextRaw/prevRaw）；
 * - sourceId 使用固定字符串即可，只要不会等于 useStorageState 实例内部的 sourceIdRef.current；
 * - e.key === null 表示 clear()：默认忽略（不做全量刷新），避免不必要的全量 IO。
 */
function bindCrossTabListenerOnce() {
  if (typeof window === 'undefined') return;
  if (typeof window.addEventListener !== 'function') return;

  // 防止在某些热更新/重复加载场景下重复绑定（尽管正常模块只会初始化一次）
  const w = window as unknown as { __tx_local_storage_syncer_bound__?: boolean };
  if (w.__tx_local_storage_syncer_bound__) return;
  w.__tx_local_storage_syncer_bound__ = true;

  window.addEventListener('storage', (e) => {
    // key=null 通常是 clear()；这里不做全量广播，保持语义简单且可预测
    if (!e.key) return;

    // 只处理 localStorage 的跨 tab 事件，避免误把 sessionStorage 等事件注入进来
    try {
      if (e.storageArea && typeof window !== 'undefined' && e.storageArea !== window.localStorage) {
        return;
      }
    } catch {
      // 某些环境访问 storageArea/localStorage 可能抛错：保守处理为不注入
      return;
    }

    emit({
      storageKey: e.key,
      // storage event 无法还原“业务 key”（不含 prefix/schema 等），因此这里用 storageKey 占位即可
      key: e.key,
      reason: 'external',
      prevRaw: e.oldValue ?? null,
      nextRaw: e.newValue ?? null,
      sourceId: '__external__',
    });
  });
}

bindCrossTabListenerOnce();

/**
 * localStorageSyncer：localStorage 专用同步器（模块级单例）。
 *
 * 由 useLocalStorageState 注入 useStorageState：
 * - set/remove/persistDefaultValue 后 emit() → 同 tab 订阅者同步；
 * - 其他 tab 写入触发 storage event → 这里 emit(external) → 本 tab 订阅者同步。
 */
export const localStorageSyncer: StorageSyncer = {
  subscribe,
  emit,
};
