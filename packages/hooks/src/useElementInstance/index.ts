import useElementInstanceInternal from '../_internal/react/useElementInstance';

/**
 * useElementInstance（Public）
 *
 * 以声明式方式管理“元素/宿主实例”。
 *
 * 基于 callback ref 工作，
 * 会把 React 在挂载 / 卸载 / 替换时传入的实例转换为 state，
 * 方便在外层用 React 的方式处理实例变化。
 */
const useElementInstance = useElementInstanceInternal;

export default useElementInstance;
