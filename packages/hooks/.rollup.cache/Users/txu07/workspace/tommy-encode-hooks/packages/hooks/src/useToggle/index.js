// useToggle 切换状态
import { useState } from 'react';
/**
 * 场景：类似于开关
// 1. useToggle() 不传参的相当于是 useBoolean，初始值为 false
// 2. useToggle(a) 传参一个的情况下，参数必须是 boolean 类型
// 3. useToggle(a, b) 传参两个的情况下，在 a 和 b 之间切换
 * @param {T} defaultValue
 * @param {T} reverseValue
 */
function useToggle(defaultValue, reverseValue) {
    // 处理默认值
    var initialValue = defaultValue !== null && defaultValue !== void 0 ? defaultValue : false;
    var altValue = reverseValue !== null && reverseValue !== void 0 ? reverseValue : !initialValue;
    var _a = useState(initialValue), state = _a[0], setState = _a[1];
    var setLeft = function () {
        setState(initialValue);
    };
    var setRight = function () {
        setState(altValue);
    };
    var set = setState;
    // 这里直接使用state判断会有闭包问题，因此必须使用函数式更新
    var toggle = function () {
        setState(function (current) { return (current === initialValue ? altValue : initialValue); });
    };
    var actions = {
        setLeft: setLeft,
        setRight: setRight,
        set: set,
        toggle: toggle,
    };
    return [state, actions];
}
export default useToggle;
//# sourceMappingURL=index.js.map