import { StorageChangeDetail, StorageSyncer } from '../..';

export function createInTabSyncer(): StorageSyncer {
  const buckets = new Map<string, Set<(d: StorageChangeDetail) => void>>();

  return {
    subscribe(storageKey, cb) {
      let set = buckets.get(storageKey);
      if (!set) buckets.set(storageKey, (set = new Set()));
      set.add(cb);

      return () => {
        set!.delete(cb);
        if (set!.size === 0) buckets.delete(storageKey);
      };
    },
    emit(detail) {
      buckets.get(detail.storageKey)?.forEach((fn) => fn(detail));
    },
  };
}
