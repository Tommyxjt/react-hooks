---
nav:
  path: /hooks
---

# useSafeLayoutEffect

SSR 安全版本的 `useLayoutEffect`。

它会自动处理：

- 浏览器环境：使用 `useLayoutEffect`
- SSR 环境：自动降级为 `useEffect`（避免 React 警告）

适合用于需要“布局阶段同步执行副作用”的场景（例如 DOM 测量、同步读写布局信息），同时又希望代码在 SSR 环境下保持安全。

## 代码演示

<code src="./demo/basic.tsx"></code>

## API

```typescript
const useSafeLayoutEffect: typeof useLayoutEffect;
```

### Params

与 `React.useLayoutEffect` 一致。

## 使用说明

### 1) 为什么需要这个 Hook？

在 SSR 环境下（没有真实 DOM），直接调用 `useLayoutEffect` 会出现警告。

`useSafeLayoutEffect` 会在运行时自动判断环境：

- 有 DOM（浏览器）→ 使用 `useLayoutEffect`
- 无 DOM（SSR）→ 使用 `useEffect`

这样你可以在同一套代码里安全使用“布局副作用”语义，而不用每次手动判断环境。

### 2) 什么时候用它？

常见场景：

- 读取元素尺寸（`offsetWidth / getBoundingClientRect`）
- 同步滚动位置
- 需要在浏览器绘制前完成的布局相关副作用

如果你的副作用不依赖布局时机，优先使用普通 `useEffect` 即可。

## FAQ

### 它和 `useLayoutEffect` 的区别是什么？

在浏览器环境下几乎没有区别；差异主要在 SSR：

- `useLayoutEffect`：SSR 下会有警告
- `useSafeLayoutEffect`：SSR 下自动降级为 `useEffect`，避免警告
