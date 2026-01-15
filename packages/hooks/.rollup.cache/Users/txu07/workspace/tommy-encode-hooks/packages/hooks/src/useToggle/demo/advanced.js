/**
 * title: 在任意两个值之间切换
 * desc: 接受两个可选参数，在它们之间进行切换。
 */
import React from 'react';
import { useToggle } from 'encodeHooks';
export default (function () {
    var _a = useToggle('Hello', 'World'), state = _a[0], _b = _a[1], toggle = _b.toggle, setLeft = _b.setLeft, setRight = _b.setRight, set = _b.set;
    return (React.createElement("div", null,
        React.createElement("p", null,
            "Effects\uFF1A",
            state),
        React.createElement("p", null,
            React.createElement("button", { type: "button", onClick: toggle }, "Toggle"),
            React.createElement("button", { type: "button", onClick: function () { return set('Hello'); }, style: { margin: '0 8px' } }, "Set Hello"),
            React.createElement("button", { type: "button", onClick: function () { return set('World'); } }, "Set World"),
            React.createElement("button", { type: "button", onClick: setLeft, style: { margin: '0 8px' } }, "Set Left"),
            React.createElement("button", { type: "button", onClick: setRight }, "Set Right"))));
});
//# sourceMappingURL=advanced.js.map