---
nav:
  path: /hooks
---

# useDocumentVisibility

以声明式方式监听页面可见状态（Page Visibility API），返回当前的 `document.visibilityState`。参考 [visibilityState API](https://developer.mozilla.org/docs/Web/API/Document/visibilityState)

它会自动处理：

- 组件挂载时订阅 `visibilitychange`
- 组件卸载时清理订阅
- 页面从可见切换到隐藏（或反之）时同步最新状态
- SSR 环境下安全降级（返回 `undefined`，且不绑定事件）

> 说明：当前版本面向 Web 场景，依赖 `document.visibilityState` 与 `visibilitychange` 事件。

## 使用场景

用于页面挂在后台时的手动节流，以及回到当前页面后，监听事件将最新状态渲染出来。

## 代码演示

<code src="./demo/basic.tsx"></code>

## API

```typescript
type DocumentVisibilityValue = DocumentVisibilityState | undefined;

function useDocumentVisibility(): DocumentVisibilityValue;
```

### Result

| 参数名                  | 说明                                                 | 类型                                   |
| ----------------------- | ---------------------------------------------------- | -------------------------------------- |
| documentVisibilityState | 当前页面可见状态；SSR 或不可用环境下返回 `undefined` | `DocumentVisibilityState \| undefined` |

## 使用说明

### 1) 返回值含义

常见返回值包括：

- `visible`：页面当前可见
- `hidden`：页面当前不可见（例如切换到其他标签页）
- `undefined`：当前环境不支持（常见于 SSR）

### 2) 何时会更新

当浏览器触发 `document.visibilitychange` 时，Hook 会重新读取并返回最新的 `document.visibilityState`。

### 3) SSR 降级策略

在 SSR 环境中没有 `document`，Hook 会：

- 返回 `undefined`
- 跳过事件绑定

这样可以避免运行时报错。
