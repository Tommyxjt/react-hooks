import type React from 'react';
import useStorageState, { type UseStorageStateOptions } from '../useStorageState';
import { getLocalStorage } from './utils/getLocalStorage';
import { localStorageSyncer } from './utils/localStorageSyncer';

/**
 * useLocalStorageState 的 options：
 * - 复用 useStorageState 的能力（key 规范、serializer/codec、equals、persistDefaultValue...）
 * - 但不允许外部传入 storage/syncer：由本 hook 统一绑定 localStorage + localStorageSyncer，避免“名不副实/语义错配”。
 */
export type UseLocalStorageStateOptions<T> = Omit<UseStorageStateOptions<T>, 'storage' | 'syncer'>;

/**
 * useLocalStorageState：useStorageState 的 localStorage 预设封装。
 *
 * 设计要点：
 * 1) storage 固定为 localStorage（不可用则降级为 null → 仅内存 state，不落盘）；
 * 2) syncer 固定为 localStorageSyncer（模块级单例）：
 *    - 同 tab：靠 emit/subscribe 立即同步；
 *    - 跨 tab：靠 window.storage 事件注入 external 变更并同步；
 * 3) 不内置防抖/节流：需要时由业务侧显式包装 actions.set（例如 useDebouncedCallback）。
 */
function useLocalStorageState<T>(
  key: string,
  options: UseLocalStorageStateOptions<T> = {},
): readonly [
  T,
  {
    set: React.Dispatch<React.SetStateAction<T>>;
    remove: () => void;
    reset: () => void;
  },
] {
  return useStorageState<T>(key, {
    ...options,
    storage: getLocalStorage,
    syncer: localStorageSyncer,
  });
}

export default useLocalStorageState;
