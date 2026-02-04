import { useEffect, useRef, useState } from 'react';

export interface ThrottleOptions {
  delay?: number; // 防抖间隔，默认 500ms
  leading?: boolean; // 是否首轮立即执行
  skipInitial?: boolean; // 跳过初始值
}

function useThrottledState<T>(
  initialValue: T,
  options?: ThrottleOptions & { skipInitial?: false },
): [T, React.Dispatch<React.SetStateAction<T>>, T];

function useThrottledState<T>(
  initialValue: T,
  options: ThrottleOptions & { skipInitial: true },
): [T, React.Dispatch<React.SetStateAction<T>>, T | undefined];

/**
 * 用来处理节流状态的 Hook。
 * 多数场景用于输入节流
 */
function useThrottledState<T>(initialValue: T, options?: ThrottleOptions) {
  const { delay = 500, leading = false, skipInitial = false } = options ?? {};
  const [state, setState] = useState<T>(initialValue);
  const [throttledState, setThrottledState] = useState<T | undefined>(
    skipInitial ? undefined : initialValue,
  );
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialMount = useRef(true);

  function setThrottledly() {
    if (leading && timeoutRef.current === null) setThrottledState(state);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setThrottledState(state);
      timeoutRef.current = null;
    }, delay);
  }

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    setThrottledly();

    // 清理定时器
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [state]);

  return [state, setState, throttledState];
}

export default useThrottledState;
