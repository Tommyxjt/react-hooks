---
nav:
  path: /hooks
---

# useUpdateEffect

在依赖项更新时执行副作用，但会跳过首次渲染。

你可以把它理解为：语义等同于 useEffect，只是不会在组件首次 mount 时触发。

## 何时使用

常见需求：你只想响应某个状态的后续变化，而不想在初始化时就执行副作用，例如：

- 表单值变更后再触发校验（初始化不校验）
- 搜索条件变更后再触发请求（初始化不请求）
- 依赖更新后同步外部系统（初始化不同步）

不适合的情况：

- 你希望首次渲染也执行副作用，请直接使用 useEffect
- 你传入空依赖数组（deps 为空数组）时，它会永远不触发（因为永远没有“更新”）

## 代码演示

<code src="./demo/basic.tsx"></code>

## API

```typescript
useUpdateEffect(effect, deps);
```

### Params

| 参数   | 说明                       | 类型                   | 默认值 |
| ------ | -------------------------- | ---------------------- | ------ |
| effect | 副作用函数，可返回 cleanup | `React.EffectCallback` | -      |
| deps   | 依赖数组（同 useEffect）   | `React.DependencyList` | -      |

### Result

无返回值。

## FAQ

### 1）它和 useEffect 的唯一区别是什么？

- useEffect：首次渲染会执行一次
- useUpdateEffect：首次渲染不执行，只在 deps 后续发生变化时执行

### 2）cleanup 什么时候执行？

与 useEffect 一致：

- 下一次 effect 执行前，会先执行上一次的 cleanup
- 组件卸载时，会执行最后一次的 cleanup

### 3）deps 传 [] 会怎样？

不会触发。因为它跳过首次渲染，而后续也不会发生依赖更新。
