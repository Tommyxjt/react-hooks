import createEventBus from '../../useEventBus/hooks/createEventBus';

interface StorageChangeDetail {
  storageKey: string;
  key: string;
  reason: 'set' | 'remove' | 'external';
  prevRaw: string | null;
  nextRaw: string | null;
  sourceId: string;
}

/**
 * 使用 createEventBus 创建一个存储同步器（syncer）
 * 这个 syncer 用于管理跨 tab 同步的存储事件
 */
export function createStorageSyncer() {
  const eventBus = createEventBus<{ [key: string]: StorageChangeDetail }>();

  /**
   * 订阅存储变化
   * @param storageKey 需要监听的存储 key
   * @param callback 变化时触发的回调
   */
  const subscribe = (storageKey: string, callback: (detail: StorageChangeDetail) => void) => {
    return eventBus.on(storageKey, callback); // 订阅事件
  };

  /**
   * 发出存储变化事件
   * @param detail 存储变化的详细信息
   */
  const emit = (detail: StorageChangeDetail) => {
    eventBus.emit(detail.storageKey, detail); // 发布事件
  };

  return { subscribe, emit };
}
