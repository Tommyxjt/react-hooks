// tests/hooks/useCounter/renderHook.test.ts
// import { renderHook } from '@testing-library/react-hooks';
import useBoolean from '../index';
import { act, renderHook } from '@testing-library/react';

const callToggle = (hook: any) => {
  act(() => {
    hook.result.current[1].toggle();
  });
};

const callSetTrue = (hook: any) => {
  act(() => {
    hook.result.current[1].setTrue();
  });
};

const callSetFalse = (hook: any) => {
  act(() => {
    hook.result.current[1].setFalse();
  });
};

describe('useBoolean', () => {
  it('test useBoolean', () => {
    const hook = renderHook(() => useBoolean(false));
    expect(hook.result.current[0]).toBeFalsy();

    callToggle(hook);
    expect(hook.result.current[0]).toBeTruthy();

    callToggle(hook);
    expect(hook.result.current[0]).toBeFalsy();

    callSetTrue(hook);
    expect(hook.result.current[0]).toBeTruthy();

    callSetFalse(hook);
    expect(hook.result.current[0]).toBeFalsy();
  });
});
