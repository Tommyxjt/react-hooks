import type { StorageChangeDetail, StorageSyncer } from '../../useStorageState';

/**
 * cookie 专用的模块级同步器（单例）。
 *
 * 为什么 cookie 需要 syncer？
 * - cookie 没有 storage event：同 tab 内多个独立 hook 实例不会被动更新；
 * - 因此需要 emit/subscribe 做“同 tab 多实例同步”。
 *
 * 跨 tab：
 * - cookie 没有原生事件；是否跨 tab 取决于是否启用“signal 语法糖”（见 cookieSignal）。
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

export const cookieSyncer: StorageSyncer = {
  subscribe,
  emit,
};
