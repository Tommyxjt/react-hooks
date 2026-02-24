---
nav:
  path: /hooks
---

# useTitle

`useTitle` 是一个自定义 Hook，用于动态设置网页的标题。

## 说明

这个 Hook 会将页面的标题设置为提供的 `title` 参数。每当 `title` 改变时，页面标题会相应更新。

## 使用场景

适用于需要动态改变网页标题的场景，比如在单页应用中，根据路由或者用户操作更新标题。

## 代码演示

<code src="./demo/basic.tsx"></code>

## API

```typescript
function useTitle(title: string): void;
```

### Params

| 参数    | 说明             | 类型     |
| ------- | ---------------- | -------- |
| `title` | 要设置的页面标题 | `string` |

## 注意事项

- 在服务端渲染 (SSR) 中，`useTitle` 会在客户端执行时更新标题，所以它通常用于客户端场景中。
