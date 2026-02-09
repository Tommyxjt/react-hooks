import useUnmountInternal from '../_internal/react/useUnmount';

/**
 * useUnmount（Public）
 *
 * 在组件卸载时执行清理函数。
 * 适合用于取消订阅、清除定时器等场景。
 */
const useUnmount = useUnmountInternal;

export default useUnmount;
