export interface Action<T> {
    setLeft: () => void;
    setRight: () => void;
    set: (val: T) => void;
    toggle: () => void;
}
declare function useToggle<T = boolean>(): [T, Action<T>];
declare function useToggle<T>(defaultValue: T): [T, Action<T>];
declare function useToggle<T, U>(defaultValue: T, reverseValue: U): [T | U, Action<T | U>];
export default useToggle;
