import type { StorageLike } from '../../useStorageState';

/**
 * 获取 localStorage（SSR/隐私模式/安全策略下不可用时返回 null）。
 *
 * 设计要点：
 * - useStorageState 需要一个 `storage(): StorageLike | null` 注入点；
 * - localStorage 在部分环境下“访问属性就会抛异常”（例如 Safari 私密模式/部分嵌入式 WebView），
 *   因此这里必须 try/catch，保证 hook 不会在 render 阶段直接炸掉；
 * - 这里不做“写探测”（setItem 测试），读写异常由 useStorageState 内部 try/catch 兜底。
 */
export function getLocalStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
