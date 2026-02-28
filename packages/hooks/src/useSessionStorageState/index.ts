// packages/hooks/src/useSessionStorageState/index.ts

import type React from 'react';
import useStorageState, { type UseStorageStateOptions } from '../useStorageState';
import { getSessionStorage } from './utils/getSessionStorage';
import { sessionStorageSyncer } from './utils/sessionStorageSyncer';

/**
 * useSessionStorageState 的 options：
 * - 复用 useStorageState 的能力（key 规范、serializer/codec、equals、persistDefaultValue...）
 * - 但不允许外部传入 storage/syncer：由本 hook 统一绑定 sessionStorage + sessionStorageSyncer，避免“名不副实/语义错配”。
 */
export type UseSessionStorageStateOptions<T> = Omit<
  UseStorageStateOptions<T>,
  'storage' | 'syncer'
>;

/**
 * useSessionStorageState：useStorageState 的 sessionStorage 预设封装。
 *
 * 设计要点：
 * 1) storage 固定为 sessionStorage（不可用则降级为 null → 仅内存 state，不落盘）；
 * 2) syncer 固定为 sessionStorageSyncer（模块级单例）：
 *    - 同 tab：靠 emit/subscribe 立即同步（同 key 多实例）；
 *    - 不跨 tab：保持 sessionStorage 的原生语义边界（tab 级会话存储）。
 * 3) 不内置防抖/节流：需要时由业务侧显式包装 actions.set（例如 useDebouncedCallback）。
 */
function useSessionStorageState<T>(
  key: string,
  options: UseSessionStorageStateOptions<T> = {},
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
    storage: getSessionStorage,
    syncer: sessionStorageSyncer,
  });
}

export default useSessionStorageState;
