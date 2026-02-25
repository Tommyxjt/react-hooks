---
nav:
  path: /hooks
---

# useClickAway

以声明式方式管理“点击白名单区域外部”的交互（Click Away）。

它会自动处理：

- 组件挂载时绑定外层容器事件（默认 `document`）
- 组件卸载时解绑事件
- `listenerContainer / 配置项` 变化时重建订阅（底层复用 `useEventListener`）
- `onClickAway` 始终使用最新逻辑（避免闭包拿到旧 state）
- `ref.current` 初始为 `null` 的过渡态（会安全跳过，待节点可用后自动生效）

> 说明：当前版本面向 Web / DOM 场景。Hook 内部分离了两个概念：  
> 1）`listenerContainer`：事件绑定在哪（默认 `document`）  
> 2）`protectedTargets`：哪些节点算“内部白名单区域”（点击命中时不触发 `onClickAway`）

## 代码演示

<code src="./demo/basic.tsx"></code>

<code src="./demo/multipleTargets.tsx"></code>

<code src="./demo/advanced.tsx"></code>

## API

```typescript
type ClickAwayProtectedTarget = Node | null | undefined;

type ClickAwayProtectedTargetsInput =
  | ClickAwayProtectedTarget
  | { readonly current: ClickAwayProtectedTarget }
  | Array<ClickAwayProtectedTarget | { readonly current: ClickAwayProtectedTarget }>;

type ClickAwayListenerContainerInput =
  | EventTarget
  | null
  | undefined
  | { readonly current: EventTarget | null | undefined };

type ClickAwayEventName =
  | 'pointerdown'
  | 'mousedown'
  | 'mouseup'
  | 'click'
  | 'touchstart'
  | 'touchend';

interface UseClickAwayOptions {
  isEnabled?: boolean;
  eventName?: ClickAwayEventName;
  listenerContainer?: ClickAwayListenerContainerInput;
  useCapture?: boolean;
  isPassive?: boolean;
  shouldTriggerOnce?: boolean;
  effectMode?: 'effect' | 'layout';
}

function useClickAway<EventPayload extends Event = Event>(
  protectedTargets: ClickAwayProtectedTargetsInput,
  onClickAway: (event: EventPayload) => void,
  options?: UseClickAwayOptions,
): void;
```

### Params

| 参数名           | 说明                                                                      | 类型                             | 默认值 |
| ---------------- | ------------------------------------------------------------------------- | -------------------------------- | ------ |
| protectedTargets | 白名单区域（内部区域）；支持单节点 / ref / 数组（常用于 trigger + panel） | `ClickAwayProtectedTargetsInput` | -      |
| onClickAway      | 点击发生在白名单区域外部时触发的回调                                      | `(event) => void`                | -      |
| options          | 监听配置项                                                                | `UseClickAwayOptions`            | `{}`   |

### options

| 参数名            | 说明                                                                     | 类型                              | 默认值          |
| ----------------- | ------------------------------------------------------------------------ | --------------------------------- | --------------- |
| isEnabled         | 是否启用监听                                                             | `boolean`                         | `true`          |
| eventName         | 监听事件名（单个）；默认推荐 `pointerdown`，避免 click 时序问题          | `ClickAwayEventName`              | `'pointerdown'` |
| listenerContainer | 外层监听容器（事件绑定位置），默认 `document`                            | `ClickAwayListenerContainerInput` | `document`      |
| useCapture        | 是否使用捕获阶段（默认 `true`，更稳，能避免内部 `stopPropagation` 干扰） | `boolean`                         | `true`          |
| isPassive         | 是否使用 passive                                                         | `boolean`                         | `true`          |
| shouldTriggerOnce | 是否只触发一次                                                           | `boolean`                         | `undefined`     |
| effectMode        | 使用 `useEffect` 或 `useLayoutEffect`（SSR 下 `layout` 会自动降级）      | `'effect' \| 'layout'`            | `'effect'`      |

## 使用说明

### 1) 什么是“白名单区域（protectedTargets）”？

`protectedTargets` 表示哪些节点算“内部区域”：

- 点击命中任意一个白名单节点（或其子节点） → **不触发** `onClickAway`
- 点击发生在白名单区域外部 → **触发** `onClickAway`

常见场景是同时保护两个区域：

- 触发按钮（trigger）
- 浮层面板（panel）

这时可以传数组：`[triggerRef, panelRef]`

### 2) 为什么 `eventName` 只支持单个事件名？

这是有意的设计收敛：

- 一次用户操作可能会连续触发多个事件（如 `pointerdown`、`mousedown`、`click`）
- 如果支持数组，容易产生重复触发或行为不一致

如果确实需要多事件策略，建议调用方自行组合多个 `useEventListener`。

### 3) `listenerContainer` 是做什么的？

`listenerContainer` 决定“事件绑定在哪”：

- 默认是 `document`（最常见）
- 也可以传某个局部容器节点，让 click-away 只在该容器范围内生效

这对微前端容器、局部交互区域很实用。

### 4) Shadow DOM 场景兼容

内部判断“是否点击到白名单区域”时，Hook 会：

1. 优先使用 `event.composedPath()`
2. 回退到 `Node.contains(event.target)`

这样在 Shadow DOM 等复杂场景下会更稳。

## FAQ

### 为什么 `protectedTargets` 支持 `null / undefined`？

因为真实使用中经常会有“过渡态”，例如：

- `ref.current` 在首轮渲染时是 `null`
- 目标节点是条件渲染的，尚未挂载

Hook 在白名单节点暂不可用时会安全跳过，不会报错。

### 为什么推荐 `pointerdown` 而不是 `click`？

`pointerdown` 触发更早，通常更适合“点击外部关闭”的语义，能减少一些“一开就关”的时序问题（尤其 trigger 与 panel 交互较复杂时）。
