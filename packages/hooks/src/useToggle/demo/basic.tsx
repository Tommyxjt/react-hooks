/**
 * title: 基础用法
 * desc: 默认为 boolean 切换，基础用法与 useBoolean 一致。
 */

import React from 'react'; // 这边导入 React 是因为 JSX 需要 React 作用域
import { useToggle } from 'encodeHooks';

export default () => {
  const [state, { toggle, setLeft, setRight, set }] = useToggle();

  return (
    <div>
      <p>Effects：{`${state}`}</p>
      <p>
        <button type="button" onClick={toggle}>
          Toggle
        </button>
        <button type="button" onClick={setLeft} style={{ margin: '0 8px' }}>
          Toggle False
        </button>
        <button type="button" onClick={setRight}>
          Toggle True
        </button>
      </p>
    </div>
  );
};
