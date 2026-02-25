import { useEffect, useLayoutEffect } from 'react';

/**
 * SSR 下没有 DOM，直接使用 useLayoutEffect 会有警告。
 *
 * 策略：
 * - 浏览器环境：使用 useLayoutEffect（保留同步布局时机）
 * - SSR 环境：降级为 useEffect（避免警告）
 */
const useSafeLayoutEffect: typeof useLayoutEffect =
  typeof window !== 'undefined' && typeof document !== 'undefined' ? useLayoutEffect : useEffect;

export default useSafeLayoutEffect;
