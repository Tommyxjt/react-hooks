import useSafeLayoutEffectInternal from '../_internal/react/useSafeLayoutEffect';

/**
 * useSafeLayoutEffect（Public）
 *
 * - 浏览器环境：使用 useLayoutEffect（保留同步布局时机）
 * - SSR 环境：降级为 useEffect（避免警告）
 */
const useSafeLayoutEffect = useSafeLayoutEffectInternal;

export default useSafeLayoutEffect;
