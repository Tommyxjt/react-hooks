// packages/hooks/src/useSessionStorageState/utils/getSessionStorage.ts

import type { StorageLike } from '../../useStorageState';

/**
 * 获取 sessionStorage（SSR/隐私模式/安全策略下不可用时返回 null）。
 *
 * 设计要点：
 * - useStorageState 需要一个 `storage(): StorageLike | null` 注入点；
 * - sessionStorage 在部分环境下“访问属性就会抛异常”（例如部分 WebView / 安全策略），
 *   因此这里必须 try/catch，保证 hook 不会在 render 阶段直接炸掉；
 * - 不做“写探测”（setItem 测试），读写异常由 useStorageState 内部 try/catch 兜底。
 */
export function getSessionStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null;

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}
