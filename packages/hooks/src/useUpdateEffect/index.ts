import useUpdateEffectInternal from '../_internal/react/useUpdateEffect';

/**
 * useUpdateEffect（Public）
 *
 * 与 useEffect 类似，但会跳过首次渲染，仅在依赖更新时触发。
 */
const useUpdateEffect = useUpdateEffectInternal;

export default useUpdateEffect;
