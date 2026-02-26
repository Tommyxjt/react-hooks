---
nav:
  path: /hooks
---

# useTargetEffect

以声明式方式管理“依赖 target 的副作用”，并且**同时支持**：

- **direct target**：直接传 `target`（如 `window / document / element / EventTarget`），走标准 `useEffect/useLayoutEffect + deps`
- **ref target**：传 `ref`（`ref.current`），内部会对 **`ref.current` 做比较**，仅在实例真的变化时重建副作用，避免：
  - `deps` 里写 `ref` 但感知不到 `ref.current` 变化（漏绑）
  - 为了不漏绑写“无依赖 effect”导致每次 render 都检查/清理/重挂的噪音

> 适用场景：`useEventListener / useScroll / useSize` 这类“订阅/观测必须绑定到具体实例”的 Hook。

## 代码演示

<code src="./demo/basic.tsx"></code>

<code src="./demo/refTarget.tsx"></code>

## API

```typescript
import type { DependencyList, RefObject } from 'react';

type TargetEffectMode = 'effect' | 'layout';

export type NativeTarget<TTarget> = TTarget | null | undefined;

export type TargetInput<TTarget> =
  | NativeTarget<TTarget>
  | RefObject<NativeTarget<TTarget>>
  | { readonly current: NativeTarget<TTarget> };

export type TargetEffectCallback<TTarget> = (
  resolvedTarget: NativeTarget<TTarget>,
) => void | (() => void);

export interface UseTargetEffectOptions {
  /**
   * - effect 执行时机：
   * - - effect: 默认，渲染后执行
   * - - layout: 渲染前同步执行（用于布局测量 / 防闪烁）
   */
  effectMode?: TargetEffectMode;

  /**
   * - 可注入 layout effect 的实现（用于 SSR 降级 / 环境差异）
   * - - 默认使用 React.useLayoutEffect
   * - - Web SSR 场景可传入 useSafeLayoutEffect（内部自行降级到 useEffect）
   */
  layoutEffectHook?: (...args: any[]) => any;
}

function useTargetEffect<TTarget>(
  createTargetEffect: TargetEffectCallback<TTarget>,
  target: TargetInput<TTarget>,
  dependencies: DependencyList,
  options?: UseTargetEffectOptions,
): void;
```

### Params

| 参数名             | 说明                                                   | 类型                      | 默认值 |
| ------------------ | ------------------------------------------------------ | ------------------------- | ------ |
| createTargetEffect | 依赖 target 的副作用工厂（返回 cleanup）               | `TargetEffectCallback<T>` | -      |
| target             | 目标对象输入：支持 direct target 或 `ref.current`      | `TargetInput<T>`          | -      |
| dependencies       | 依赖数组：变化时会触发“重建副作用”（cleanup + re-run） | `DependencyList`          | -      |
| options            | 执行时机/环境注入（layout 模式、SSR 降级等）           | `UseTargetEffectOptions`  | `{}`   |

### Result

| 参数名 | 说明                          | 类型   |
| ------ | ----------------------------- | ------ |
| -      | 无返回值（声明式副作用 Hook） | `void` |

## 使用说明

### 1) direct target：按依赖精确运行

当你直接传 `target`（不是 ref）时，行为等价于：

- `useEffect/useLayoutEffect(() => createTargetEffect(target), [target, ...deps])`

### 2) ref target：比较 ref.current，精准重建

当你传 `ref` 时，React 无法追踪 `ref.current` 的变化，因此 `useTargetEffect` 内部会：

- 每次 render 后解析 `ref.current`
- 对比上一轮的 `ref.current`
- 仅在“实例变化”或 deps 变化时执行：
  1. cleanup
  2. createTargetEffect(newTarget)

### 3) createTargetEffect 不需要放进依赖数组

`useTargetEffect` 内部会对 `createTargetEffect` 做稳定化处理（类似 `useStableCallback`），因此：

- `createTargetEffect` 引用变化本身不会触发重建
- 但下一次因 `target/deps` 触发重建时，会使用最新逻辑

## FAQ

### 为什么不用 `useEffect(() => ..., [ref])`？

因为 `ref` 对象本身通常是稳定不变的，变化的是 `ref.current`。  
依赖数组看不到 `ref.current` 的变化，会漏掉“commit 后实例才可用”的时机。

### 为什么不用“ref 分支写无依赖 effect，每次 render 都检查一次”？

无依赖 effect 的确能避免漏绑，但它的语义更粗糙：

- 每次 render 都会进入 effect 调度路径
- 很容易在上层 Hook 里被写成“每次 render 都 cleanup + 重挂”（尤其当逻辑稍复杂时）

`useTargetEffect` 把“ref.current 比较 + 是否需要重建”的逻辑内聚起来，让上层 Hook 只写一套清晰的订阅逻辑即可。
