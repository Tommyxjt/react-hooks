import { useState } from 'react';

export interface BooleanActions {
  toggle: () => void;
  setTrue: () => void;
  setFalse: () => void;
}

function useBoolean(initialValue: boolean): [boolean, BooleanActions];

/**
 * 场景：boolean 类型的 state 都可以用这个钩子，语义化更好
 */
function useBoolean(initialValue: boolean) {
  const [state, setState] = useState<boolean>(initialValue);

  const setTrue = () => {
    setState(true);
  };

  const setFalse = () => {
    setState(false);
  };

  // 这里直接使用state判断会有闭包问题，因此必须使用函数式更新
  const toggle = () => {
    setState((current: boolean) => !current);
  };

  return [state, { toggle, setTrue, setFalse }];
}

export default useBoolean;
