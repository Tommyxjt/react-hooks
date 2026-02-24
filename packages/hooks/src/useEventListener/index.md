---
nav:
  path: /hooks
---

# useEventListener

以声明式方式管理原生事件订阅（`addEventListener / removeEventListener`）。

它会自动处理：

- 组件挂载时绑定事件
- 组件卸载时解绑事件
- `eventName / target / 配置项` 变化时重建订阅
- `handler` 始终使用最新逻辑（避免闭包拿到旧 state）

> 说明：当前版本面向 Web / EventTarget 场景（如 `window`、`document`、DOM 元素、`WebSocket`、`EventSource` 等），不包含 React Native 的 `addListener/remove` 模型。

## 代码演示

<code src="./demo/basic.tsx"></code>

<code src="./demo/refTarget.tsx"></code>

<code src="./demo/advanced.tsx"></code>

## API

```typescript
type ListenerTargetInput =
  | EventTarget
  | null
  | undefined
  | { readonly current: EventTarget | null | undefined };

type ListenerEffectMode = 'effect' | 'layout';

interface UseEventListenerOptions {
  isEnabled?: boolean;
  useCapture?: boolean;
  isPassive?: boolean;
  shouldTriggerOnce?: boolean;
  effectMode?: ListenerEffectMode;
}

function useEventListener<EventPayload extends Event = Event>(
  eventName: string,
  listenerHandler: (event: EventPayload) => void,
  listenerTarget: ListenerTargetInput,
  listenerOptions?: UseEventListenerOptions,
): void;
```

### Params

| 参数名          | 说明                                          | 类型                      | 默认值 |
| --------------- | --------------------------------------------- | ------------------------- | ------ |
| eventName       | 事件名                                        | `string`                  | -      |
| listenerHandler | 事件回调（内部会保持引用稳定且逻辑最新）      | `(event) => void`         | -      |
| listenerTarget  | 监听目标，支持 `EventTarget` 或 `ref.current` | `ListenerTargetInput`     | -      |
| listenerOptions | 监听配置项                                    | `UseEventListenerOptions` | `{}`   |

### listenerOptions

| 参数名            | 说明                                  | 类型                   | 默认值      |
| ----------------- | ------------------------------------- | ---------------------- | ----------- |
| isEnabled         | 是否启用监听                          | `boolean`              | `true`      |
| useCapture        | 是否使用捕获阶段                      | `boolean`              | `false`     |
| isPassive         | 是否使用 passive 监听                 | `boolean`              | `undefined` |
| shouldTriggerOnce | 是否只触发一次                        | `boolean`              | `undefined` |
| effectMode        | 使用 `useEffect` 或 `useLayoutEffect` | `'effect' \| 'layout'` | `'effect'`  |

### Result

| 参数名 | 说明                          | 类型   |
| ------ | ----------------------------- | ------ |
| -      | 无返回值（声明式副作用 Hook） | `void` |

## 使用说明

### 1) `handler` 更新不会重建订阅

`useEventListener` 内部会保证：

- 绑定给原生事件系统的函数引用稳定（便于正确解绑）
- 但执行时使用最新的 `listenerHandler`

所以你不需要额外处理“闭包过期”问题。

### 2) `eventName / listenerTarget` 变化会创建新订阅

当订阅身份变化时，Hook 会自动执行：

1. 清理旧订阅（cleanup）
2. 创建新订阅（re-subscribe）

这也是 React `effect` 的自然语义。

### 3) SSR 降级策略

当 `effectMode: 'layout'` 且运行在 SSR 环境时，内部会自动降级为普通 `effect`，避免 `useLayoutEffect` 警告。

## FAQ

### 为什么 `listenerTarget` 支持 `null / undefined`？

因为真实使用中经常会有“过渡态”，例如：

- `ref.current` 在首轮渲染时为 `null`
- 目标对象需要延迟初始化

Hook 会在 target 不可用时跳过绑定，等下次 render target 可用后再自动绑定。
