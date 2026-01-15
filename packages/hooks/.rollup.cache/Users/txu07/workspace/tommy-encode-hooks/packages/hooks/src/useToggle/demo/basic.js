/**
 * title: 基础用法
 * desc: 默认为 boolean 切换，基础用法与 useBoolean 一致。
 */
import React from 'react'; // 这边导入 React 是因为 JSX 需要 React 作用域
import { useToggle } from 'encodeHooks';
export default (function () {
    var _a = useToggle(), state = _a[0], _b = _a[1], toggle = _b.toggle, setLeft = _b.setLeft, setRight = _b.setRight, set = _b.set;
    return (React.createElement("div", null,
        React.createElement("p", null,
            "Effects\uFF1A", "".concat(state)),
        React.createElement("p", null,
            React.createElement("button", { type: "button", onClick: toggle }, "Toggle"),
            React.createElement("button", { type: "button", onClick: setLeft, style: { margin: '0 8px' } }, "Toggle False"),
            React.createElement("button", { type: "button", onClick: setRight }, "Toggle True"))));
});
//# sourceMappingURL=basic.js.map