import useLatestRefInternal from '../_internal/react/useLatestRef';

/**
 * useLatestRef（Public）
 *
 * 用于返回一个引用，保证在整个组件生命周期内总是获取到最新的函数或值。
 * 主要用于避免闭包陷阱，确保在异步回调中获取最新的函数或变量。
 */
const useLatestRef = useLatestRefInternal;

export default useLatestRef;
