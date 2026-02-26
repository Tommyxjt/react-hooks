---
nav:
  path: /hooks
---

# useElementInstance

以声明式方式管理“元素/宿主实例”。

它基于 **callback ref** 工作，会把 React 在挂载 / 卸载 / 替换时传入的实例转换为 state，方便你在外层用 React 的方式处理实例变化。

它会自动处理：

- 首次挂载时实例写入（`null -> instance`）
- 卸载时实例清空（`instance -> null`）
- 实例替换时状态更新（`oldInstance -> newInstance`）
- 同一个实例重复赋值时跳过更新（避免无意义 rerender）

> 说明：这个 Hook 不会“监听 `RefObject.current` 的变化”。它依赖的是 React 的 callback ref 调用时机，因此对 Web（DOM）和 React Native（宿主实例）都适用。

## 代码演示

<code src="./demo/basic.tsx"></code>

<code src="./demo/composeRef.tsx"></code>

<code src="./demo/advanced.tsx"></code>

## API

```typescript
type ElementInstanceRef<TInstance = unknown> = (instance: TInstance | null) => void;

type UseElementInstanceResult<TInstance = unknown> = readonly [
  ElementInstanceRef<TInstance>,
  TInstance | null,
];

function useElementInstance<TInstance = unknown>(): UseElementInstanceResult<TInstance>;
```

### Params

| 参数名 | 说明   | 类型 | 默认值 |
| ------ | ------ | ---- | ------ |
| -      | 无参数 | -    | -      |

### Result

| 参数名 | 说明                         | 类型                 |
| ------ | ---------------------------- | -------------------- |
| `[0]`  | callback ref（用于接收实例） | `(instance) => void` |
| `[1]`  | 当前实例（state 化）         | `TInstance \| null`  |

## 使用说明

### 1) 为什么返回的是 callback ref？

因为普通 `RefObject.current` 的变化不会触发 React rerender，也不会自动通知 Hook。

`useElementInstance` 使用 callback ref，利用的是 React commit 阶段的实例赋值时机（挂载 / 卸载 / 替换），这样才能把实例变化稳定地接入 React 更新流。

### 2) `elementInstance` 可以直接当 state 用

你可以把返回的实例当作普通 state 使用，例如：

- 放进 `useEffect` 依赖
- 传给 `useEventListener` / `useSize` 等 Hook
- 作为“实例是否已挂载”的判断条件

### 3) 如果我还需要一个普通 `RefObject` 怎么办？

可以在外层合并 ref（compose / merge refs）：

- 一个 ref 给 `useElementInstance`（用于响应式更新）
- 一个 ref 给你自己（用于 `ref.current` 访问）

这样两边都能拿到同一个实例。

## FAQ

### 1）它能用于监听普通 `ref` 吗？

不能也不应该监听普通 `ref`。

这个 Hook 的更新来源是 **callback ref 被 React 调用**，而不是监听 `RefObject.current` 的赋值行为。  
如果你手动改 `myRef.current`，React 不会收到通知，Hook 也不会自动更新。

#### 如果强行去实现监听普通 `ref`，那语义也是很成问题的。

如果希望实现普通 `ref` 变化能够触发 state 更新，那应该反过来操作：
也就是使用 `useState`，然后用 `useRef` 或者 `useLatestRef` 包裹。

这也就是为什么这个钩子函数从命名开始就局限了它仅用于 “Element Instance” 管理。

---

### 2）`useElementInstance` 返回的是 callback ref，不能像普通 `RefObject` 一样通过 `ref.current` 调用实例方法。如果我需要访问实例方法，应该怎么实现？

`useElementInstance` 返回的第一个值是 **callback ref 函数**，不是 `{ current }` 结构的对象 ref，所以不能直接写：

- `elementRef.current?.focus()`

如果你需要调用实例方法（例如 `focus()`、`scrollIntoView()` 等），通常有两种做法：

#### 方案 1：直接使用返回的 `element`（推荐，声明式）

`useElementInstance` 返回的第二个值 `element` 是 state 化后的当前实例，可以直接用于：

- `useEffect` 中处理实例变化后的逻辑
- 事件回调中调用实例方法（注意依赖项）

例如：

```tsx
const [inputRef, inputElement] = useElementInstance<HTMLInputElement>();

useEffect(() => {
  inputElement?.focus();
}, [inputElement]);
```

#### 方案 2：如果你同时需要 `ref.current` 风格访问，合并一个普通 `RefObject`

你可以在外层再创建一个普通 `useRef`，并通过“合并 ref”的方式同时绑定：

- callback ref：用于 `useElementInstance` 的响应式更新
- object ref：用于 `ref.current` 访问实例方法

例如：

```tsx
const [reactiveInputRef, inputElement] = useElementInstance<HTMLInputElement>();
const inputRef = useRef<HTMLInputElement | null>(null);

const mergedInputRef = useCallback(
  (node: HTMLInputElement | null) => {
    inputRef.current = node;
    reactiveInputRef(node);
  },
  [reactiveInputRef],
);

return <input ref={mergedInputRef} />;
```

这样你就可以同时使用：

- `inputElement`（声明式，适合 `useEffect` / 依赖驱动逻辑）
- `inputRef.current`（命令式，适合直接调用实例方法）

---

### 3）这个 Hook 只适用于 DOM 吗？

不只。它的核心能力是“实例变化 -> state”，只要场景里存在 React 的 callback ref 赋值流程，就可以使用。Web DOM 和 React Native 都能成立。
