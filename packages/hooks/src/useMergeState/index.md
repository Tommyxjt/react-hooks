---
nav:
  path: /hooks
---

# useMergeState

用于管理**对象类型**的 state，并提供一个支持“浅合并（shallow merge）”的 setState 方法。传入 partial（merge）时会与当前 state 进行浅合并：`next = { ...prev, ...merge }`。

---

## 使用场景

### 设计思路

- React 的 `useState` 对对象更新默认是“整体替换”，而 `useMergeState` 提供更接近 class `setState` 的体验：传入局部字段即可更新。
- 只做**浅合并**：仅合并第一层字段；嵌套对象不会递归合并（嵌套对象会整体被替换）。
- 支持函数式 merge：当 merge 依赖旧值时，可使用 `(prev) => merge` 形式避免闭包与并发更新问题。

### 使用场景

- 表单 state（多个字段）更新：只更新改动字段，不需要每次手动 `...prev`。
- 复杂对象状态管理：例如筛选条件、分页参数、查询参数等。
- 需要与 class `setState` 类似的“局部更新”体验，但仍保持 hooks 写法。

---

## 代码演示

<code src="./demo/basic.tsx"></code>

---

## API

```typescript
const [state, setMergeState] = useMergeState(initialState);

setMergeState({ a: 1 });

setMergeState((prev) => ({
  a: prev.a + 1,
}));
```

### Params

| 参数         | 说明                         | 类型             | 默认值 |
| ------------ | ---------------------------- | ---------------- | ------ |
| initialState | 初始 state（支持惰性初始化） | `T \| (() => T)` | -      |

### Result

| 参数          | 说明                      | 类型                                                       |
| ------------- | ------------------------- | ---------------------------------------------------------- |
| state         | 当前 state                | `T`                                                        |
| setMergeState | 传入 merge 进行浅合并更新 | `(merge: Partial<T> \| ((prev: T) => Partial<T>)) => void` |
