import { useMemo, useState } from 'react';
import useEventListener from '../useEventListener';

/**
 * 读取 document.visibilityState 的返回值
 * - 浏览器环境：返回真实的可见状态（如 visible / hidden）
 * - 非浏览器环境（SSR）：返回 undefined
 */
export type DocumentVisibilityValue = DocumentVisibilityState | undefined;

/**
 * 以声明式方式订阅 document.visibilitychange，并返回当前页面可见状态
 *
 * 设计要点：
 * 1) SSR 安全：无 document 时返回 undefined，且不会尝试绑定事件
 * 2) 基于 useEventListener 复用订阅/清理逻辑
 * 3) 状态变化时自动触发更新
 */
function useDocumentVisibility(): DocumentVisibilityValue {
  const [documentVisibilityState, setDocumentVisibilityState] = useState<DocumentVisibilityValue>(
    getDocumentVisibilityState,
  );

  /**
   * SSR 安全：
   * - 非浏览器环境下传 undefined
   * - useEventListener 内部会自动跳过绑定
   */
  const documentTarget = useMemo(
    () => (typeof document !== 'undefined' ? document : undefined),
    [],
  );

  useEventListener(
    'visibilitychange',
    () => {
      setDocumentVisibilityState(getDocumentVisibilityState());
    },
    documentTarget,
    {
      effectMode: 'effect',
    },
  );

  return documentVisibilityState;
}

/**
 * 安全读取 document.visibilityState
 */
function getDocumentVisibilityState(): DocumentVisibilityValue {
  if (!canReadDocumentVisibility()) {
    return undefined;
  }

  return document.visibilityState;
}

/**
 * 判断当前环境是否可以读取 document.visibilityState
 */
function canReadDocumentVisibility(): boolean {
  return typeof document !== 'undefined' && 'visibilityState' in document;
}

export default useDocumentVisibility;
