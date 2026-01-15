// tests/hooks/useCounter/renderHook.test.ts
// import { renderHook } from '@testing-library/react-hooks';
import useToggle from '../index';
import { act, renderHook } from '@testing-library/react';
var callSetLeft = function (hook) {
    act(function () {
        hook.result.current[1].setLeft();
    });
};
var callSetRight = function (hook) {
    act(function () {
        hook.result.current[1].setRight();
    });
};
var callSet = function (hook, val) {
    act(function () {
        hook.result.current[1].set(val);
    });
};
var callToggle = function (hook) {
    act(function () {
        hook.result.current[1].toggle();
    });
};
describe('useToggle', function () {
    it('test on No Param', function () {
        var hook = renderHook(function () { return useToggle(); });
        expect(hook.result.current[0]).toBeFalsy();
        callSet(hook, true);
        expect(hook.result.current[0]).toBeTruthy();
        callSetLeft(hook);
        expect(hook.result.current[0]).toBeFalsy();
        callSetRight(hook);
        expect(hook.result.current[0]).toBeTruthy();
        callToggle(hook);
        expect(hook.result.current[0]).toBeFalsy();
    });
    it('test on 1 Param', function () {
        var hook = renderHook(function () { return useToggle(true); });
        expect(hook.result.current[0]).toBeTruthy();
        callSet(hook, true);
        expect(hook.result.current[0]).toBeTruthy();
        callSetLeft(hook);
        expect(hook.result.current[0]).toBeTruthy();
        callSetRight(hook);
        expect(hook.result.current[0]).toBeFalsy();
        callToggle(hook);
        expect(hook.result.current[0]).toBeTruthy();
    });
    it('test on 2 Params', function () {
        var hook = renderHook(function () { return useToggle('Hello', 'World'); });
        expect(hook.result.current[0]).toBe('Hello');
        callSet(hook, 'World');
        expect(hook.result.current[0]).toBe('World');
        callSetLeft(hook);
        expect(hook.result.current[0]).toBe('Hello');
        callSetRight(hook);
        expect(hook.result.current[0]).toBe('World');
        callToggle(hook);
        expect(hook.result.current[0]).toBe('Hello');
    });
});
//# sourceMappingURL=index.test.js.map