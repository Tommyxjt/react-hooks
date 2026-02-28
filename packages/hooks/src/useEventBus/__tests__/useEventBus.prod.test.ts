import { act, renderHook } from '@testing-library/react';
import createEventBus from '../hooks/createEventBus';
import useEventBus from '../hooks/useEventBus';

jest.mock('../../_internal/react/env', () => ({ __DEV__: false }));

interface TestEvents {
  ping: number;
}

describe('useEventBus (production)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // 1）生产环境下，即使 bus 引用变化，也不应输出开发期告警
  it('should not warn when bus instance changes', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const bus1 = createEventBus<TestEvents>();
    const bus2 = createEventBus<TestEvents>();

    const { rerender } = renderHook(({ currentBus }) => useEventBus(currentBus), {
      initialProps: { currentBus: bus1 },
    });

    act(() => {
      rerender({ currentBus: bus2 });
    });

    expect(warnSpy).not.toHaveBeenCalled();
  });
});
