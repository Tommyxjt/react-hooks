import useToggle from '../index';
import { act, renderHook } from '@testing-library/react';

const callSetLeft = (hook: any) => {
  act(() => {
    hook.result.current[1].setLeft();
  });
};

const callSetRight = (hook: any) => {
  act(() => {
    hook.result.current[1].setRight();
  });
};

const callSet = (hook: any, val: any) => {
  act(() => {
    hook.result.current[1].set(val);
  });
};

const callToggle = (hook: any) => {
  act(() => {
    hook.result.current[1].toggle();
  });
};

describe('useToggle', () => {
  it('test on No Param', () => {
    const hook = renderHook(() => useToggle());
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

  it('test on 1 Param', () => {
    const hook = renderHook(() => useToggle(true));
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

  it('test on 2 Params', () => {
    const hook = renderHook(() => useToggle('Hello', 'World'));
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
