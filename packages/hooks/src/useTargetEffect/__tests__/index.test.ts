import { renderHook, act } from '@testing-library/react';
import useTargetEffect from '..';

type Cleanup = () => void;
type EffectReturn = undefined | Cleanup;

describe('useTargetEffect', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // 1）挂载时应执行 effect，并在卸载时 cleanup（direct target）
  it('should run effect on mount and cleanup on unmount (direct target)', () => {
    const cleanup = jest.fn();
    const createEffect = jest.fn<EffectReturn, [EventTarget | null | undefined]>(() => cleanup);

    const { unmount } = renderHook(() => {
      useTargetEffect(createEffect, document, []);
    });

    expect(createEffect).toHaveBeenCalledTimes(1);
    expect(createEffect).toHaveBeenCalledWith(document);

    unmount();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  // 2）direct target 变化时应 cleanup 并重新执行 effect
  it('should cleanup and re-run when direct target changes', () => {
    const cleanupA = jest.fn();
    const cleanupB = jest.fn();

    const createEffect = jest
      .fn<EffectReturn, [EventTarget | null | undefined]>()
      .mockImplementationOnce(() => cleanupA)
      .mockImplementationOnce(() => cleanupB);

    const { rerender, unmount } = renderHook(
      ({ target }) => {
        useTargetEffect(createEffect, target, []);
      },
      {
        initialProps: { target: document as EventTarget },
      },
    );

    expect(createEffect).toHaveBeenCalledTimes(1);
    expect(createEffect).toHaveBeenLastCalledWith(document);

    rerender({ target: window as unknown as EventTarget });

    expect(cleanupA).toHaveBeenCalledTimes(1);
    expect(createEffect).toHaveBeenCalledTimes(2);
    expect(createEffect).toHaveBeenLastCalledWith(window);

    unmount();
    expect(cleanupB).toHaveBeenCalledTimes(1);
  });

  // 3）deps 变化时应 cleanup 并重新执行 effect（direct target）
  it('should cleanup and re-run when dependencies change (direct target)', () => {
    const cleanupA = jest.fn();
    const cleanupB = jest.fn();

    const createEffect = jest
      .fn<EffectReturn, [EventTarget | null | undefined]>()
      .mockImplementationOnce(() => cleanupA)
      .mockImplementationOnce(() => cleanupB);

    const { rerender, unmount } = renderHook(
      ({ dep }) => {
        useTargetEffect(createEffect, document, [dep]);
      },
      {
        initialProps: { dep: 1 },
      },
    );

    expect(createEffect).toHaveBeenCalledTimes(1);

    rerender({ dep: 2 });

    expect(cleanupA).toHaveBeenCalledTimes(1);
    expect(createEffect).toHaveBeenCalledTimes(2);

    unmount();
    expect(cleanupB).toHaveBeenCalledTimes(1);
  });

  // 4）createTargetEffect identity 更新：不应因为函数变化就重跑，但下次重跑应使用最新逻辑
  it('should not re-run when createTargetEffect changes, but should use latest callback on next re-run', () => {
    const cleanupA = jest.fn();
    const cleanupB = jest.fn();

    const effectA = jest.fn<EffectReturn, [EventTarget | null | undefined]>(() => cleanupA);
    const effectB = jest.fn<EffectReturn, [EventTarget | null | undefined]>(() => cleanupB);

    const { rerender, unmount } = renderHook(
      ({ dep, effect }) => {
        useTargetEffect(effect, document, [dep]);
      },
      {
        initialProps: { dep: 0, effect: effectA },
      },
    );

    expect(effectA).toHaveBeenCalledTimes(1);
    expect(cleanupA).toHaveBeenCalledTimes(0);

    // 仅替换 effect 回调：不应触发 cleanup / re-run
    rerender({ dep: 0, effect: effectB });

    expect(cleanupA).toHaveBeenCalledTimes(0);
    expect(effectB).toHaveBeenCalledTimes(0);

    // deps 变化触发重跑：应 cleanupA，并执行最新的 effectB
    rerender({ dep: 1, effect: effectB });

    expect(cleanupA).toHaveBeenCalledTimes(1);
    expect(effectB).toHaveBeenCalledTimes(1);

    unmount();
    expect(cleanupB).toHaveBeenCalledTimes(1);
  });

  // 5）ref target：ref.current 初始为 null 时应安全运行（回调收到 null/undefined 自行处理）
  //    ref.current 变为真实节点后应触发重跑
  it('should re-run when ref.current changes (ref target)', () => {
    type T = HTMLDivElement;
    type Resolved = T | null | undefined;

    const nodeA = document.createElement('div') as T;
    const nodeB = document.createElement('div') as T;

    const cleanupA = jest.fn();
    const cleanupB = jest.fn();

    const refTarget: { current: Resolved } = { current: null };

    const createEffect = jest.fn<EffectReturn, [Resolved]>((resolvedTarget) => {
      if (!resolvedTarget) {
        return;
      }

      if (resolvedTarget === nodeA) {
        return cleanupA;
      }

      return cleanupB;
    });

    const { rerender, unmount } = renderHook(() => {
      useTargetEffect<T>(createEffect, refTarget, []);
    });

    // init：ref.current = null
    expect(createEffect).toHaveBeenCalledTimes(1);
    expect(createEffect).toHaveBeenLastCalledWith(null);

    // ref.current -> nodeA
    act(() => {
      refTarget.current = nodeA;
    });
    rerender();

    expect(createEffect).toHaveBeenCalledTimes(2);
    expect(createEffect).toHaveBeenLastCalledWith(nodeA);
    expect(cleanupA).toHaveBeenCalledTimes(0);

    // ref.current -> nodeB：应 cleanupA + re-run
    act(() => {
      refTarget.current = nodeB;
    });
    rerender();

    expect(cleanupA).toHaveBeenCalledTimes(1);
    expect(createEffect).toHaveBeenCalledTimes(3);
    expect(createEffect).toHaveBeenLastCalledWith(nodeB);

    unmount();
    expect(cleanupB).toHaveBeenCalledTimes(1);
  });

  // 6）ref target：ref.current 不变时 rerender 不应重跑
  it('should not re-run when ref.current and deps are unchanged (ref target)', () => {
    type T = HTMLDivElement;
    type Resolved = T | null | undefined;

    const nodeA = document.createElement('div') as T;
    const cleanupA = jest.fn();

    const refTarget: { current: Resolved } = { current: nodeA };

    const createEffect = jest.fn<EffectReturn, [Resolved]>(() => cleanupA);

    const { rerender, unmount } = renderHook(() => {
      useTargetEffect<T>(createEffect, refTarget, []);
    });

    expect(createEffect).toHaveBeenCalledTimes(1);

    rerender();
    expect(createEffect).toHaveBeenCalledTimes(1);
    expect(cleanupA).toHaveBeenCalledTimes(0);

    unmount();
    expect(cleanupA).toHaveBeenCalledTimes(1);
  });

  // 7）ref target：deps 变化即使 ref.current 不变也应 cleanup + 重跑
  it('should cleanup and re-run when deps change even if ref.current is unchanged (ref target)', () => {
    type T = HTMLDivElement;
    type Resolved = T | null | undefined;

    const nodeA = document.createElement('div') as T;
    const cleanupA = jest.fn();
    const cleanupB = jest.fn();

    const refTarget: { current: Resolved } = { current: nodeA };

    const createEffect = jest
      .fn<EffectReturn, [Resolved]>()
      .mockImplementationOnce(() => cleanupA)
      .mockImplementationOnce(() => cleanupB);

    const { rerender, unmount } = renderHook(
      ({ dep }) => {
        useTargetEffect<T>(createEffect, refTarget, [dep]);
      },
      {
        initialProps: { dep: 1 },
      },
    );

    expect(createEffect).toHaveBeenCalledTimes(1);

    rerender({ dep: 2 });

    expect(cleanupA).toHaveBeenCalledTimes(1);
    expect(createEffect).toHaveBeenCalledTimes(2);

    unmount();
    expect(cleanupB).toHaveBeenCalledTimes(1);
  });

  type TargetProp = EventTarget | { current: EventTarget | null | undefined };

  // 8）从 ref target 切换到 direct target：应清理 ref 分支订阅，并在 direct target 上建立
  it('should cleanup ref subscription and run on direct target when switching ref -> direct', () => {
    type Resolved = EventTarget | null | undefined;

    const nodeA = document.createElement('div') as unknown as EventTarget;
    const cleanupA = jest.fn();
    const cleanupB = jest.fn();

    const refTarget: { current: Resolved } = { current: nodeA };

    const createEffect = jest
      .fn<EffectReturn, [Resolved]>()
      .mockImplementationOnce(() => cleanupA) // ref nodeA
      .mockImplementationOnce(() => cleanupB); // direct document

    const { rerender, unmount } = renderHook<undefined, { target: TargetProp }>(
      ({ target }) => {
        useTargetEffect<EventTarget>(createEffect, target, []);
      },
      {
        initialProps: { target: refTarget },
      },
    );

    expect(createEffect).toHaveBeenCalledTimes(1);
    expect(createEffect).toHaveBeenLastCalledWith(nodeA);

    rerender({ target: document });

    expect(cleanupA).toHaveBeenCalledTimes(1);
    expect(createEffect).toHaveBeenCalledTimes(2);
    expect(createEffect).toHaveBeenLastCalledWith(document);

    unmount();
    expect(cleanupB).toHaveBeenCalledTimes(1);
  });
});
