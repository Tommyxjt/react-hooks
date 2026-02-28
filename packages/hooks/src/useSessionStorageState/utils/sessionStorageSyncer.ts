import type { StorageChangeDetail, StorageSyncer } from '../../useStorageState';

/**
 * sessionStorage 专用的模块级同步器（必须是“单例”）。
 *
 * 场景与职责：
 * 1) 同 tab 同 key 多实例同步：
 *    - 同一个页面内多个独立 hook 实例（无 props/context 关系）使用同一个 key 时，
 *      A 实例 set 只会让 A 自己 rerender，B 不会自动更新；
 *    - 浏览器也不会对“当前 tab 自己的 setItem/removeItem”触发 storage 事件；
 *    - 因此必须用 emit/subscribe 做同 tab 的 pub/sub，保证多实例 UI 一致。
 *
 * 2) 不做跨 tab 同步：
 *    - sessionStorage 的语义是“tab 级会话存储”，天然不跨 tab 共享；
 *    - 本实现不会监听 window.storage 来扩张语义（保持原生语义边界）。
 *
 * 注意：
 * - 这个 syncer 只服务 sessionStorage，不应复用给 localStorage/cookie（传播边界不同，语义会被破坏）。
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
 * sessionStorageSyncer：sessionStorage 专用同步器（模块级单例）。
 *
 * 由 useSessionStorageState 注入 useStorageState：
 * - set/remove/persistDefaultValue 后 emit() → 同 tab 订阅者同步；
 * - 不监听 window.storage（不扩张 sessionStorage 的传播语义）。
 */
export const sessionStorageSyncer: StorageSyncer = {
  subscribe,
  emit,
};
