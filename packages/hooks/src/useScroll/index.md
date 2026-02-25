---
nav:
  path: /hooks
---

# useScroll

以声明式方式订阅滚动事件，并返回当前滚动位置（`x / y`）。

它会自动处理：

- 组件挂载时绑定 `scroll` 事件（内部复用 `useEventListener`）
- 组件卸载时解绑事件
- `target / 配置项` 变化时重建订阅
- 首次挂载（或目标变化）时主动同步一次当前位置（避免必须先滚动一次才有值）
- `ref.current` 初始为 `null` 的过渡态（会安全跳过，待目标可用后自动生效）

> 说明：当前版本面向 Web / DOM 场景（`window`、`document`、可滚动元素）。  
> `useScroll` 本身不内置节流 / 防抖 / raf 调度，建议在消费侧与其他 Hook 组合使用。

## 代码演示

<code src="./demo/basic.tsx"></code>

## API

```typescript
type ScrollTarget = Window | Document | Element | null | undefined;

type ScrollTargetInput = ScrollTarget | { readonly current: ScrollTarget };

type ScrollEffectMode = 'effect' | 'layout';

interface UseScrollOptions {
  isEnabled?: boolean;
  effectMode?: ScrollEffectMode;
}

interface ScrollPosition {
  x: number;
  y: number;
}

function useScroll(
  scrollTarget: ScrollTargetInput,
  options?: UseScrollOptions,
): ScrollPosition | undefined;
```

### Params

| 参数名       | 说明                                                       | 类型                | 默认值 |
| ------------ | ---------------------------------------------------------- | ------------------- | ------ |
| scrollTarget | 滚动目标，支持 `window / document / element / ref.current` | `ScrollTargetInput` | -      |
| options      | 配置项                                                     | `UseScrollOptions`  | `{}`   |

### options

| 参数名     | 说明                                                                | 类型                   | 默认值     |
| ---------- | ------------------------------------------------------------------- | ---------------------- | ---------- |
| isEnabled  | 是否启用监听                                                        | `boolean`              | `true`     |
| effectMode | 使用 `useEffect` 或 `useLayoutEffect`（SSR 下 `layout` 会自动降级） | `'effect' \| 'layout'` | `'effect'` |

### Result

| 参数名 | 说明                                       | 类型                          |
| ------ | ------------------------------------------ | ----------------------------- |
| -      | 当前滚动位置；目标不可用时返回 `undefined` | `ScrollPosition \| undefined` |

## 使用说明

### 1) 支持哪些滚动目标？

首版支持以下目标类型：

- `window`
- `document`
- 可滚动元素（`Element` / `HTMLElement`）
- `ref.current`
- `null / undefined`（过渡态）

常见用法：

- 页面滚动：传 `window`
- 局部容器滚动：传 `containerRef`

### 2) 为什么会返回 `undefined`？

因为真实使用里常见这些场景：

- SSR 环境没有真实 DOM
- `ref.current` 在首轮渲染时是 `null`
- 目标节点是条件渲染的，尚未挂载

Hook 会在目标不可用时安全返回 `undefined`，待目标可用后自动开始同步滚动位置。

### 3) 首次挂载为什么会主动同步一次？

如果只监听 `scroll` 事件，会有一个常见问题：

- 页面（或容器）已经滚动到了某个位置
- 但用户还没再次触发滚动
- 此时 Hook 拿不到当前位置

所以 `useScroll` 会在挂载时（或目标变化时）主动读一次当前滚动位置，保证初始值可用。

### 4) 与节流 / 防抖 / raf 的组合使用（推荐）

`useScroll` 本身保持“原始、准确、无策略”，更适合作为基础 Hook。  
如果有性能或调度需求，建议在消费侧组合：

- `useThrottledEffect`：节流副作用（埋点、上报、昂贵计算）
- `useThrottledCallback`：复用节流逻辑（多个来源共用同一回调）
- `useRaf` 系列：按浏览器帧节奏处理滚动驱动的 UI 更新

> 注意：`useThrottledEffect` 节流的是“副作用执行频率”，不是 `useScroll` 自身状态更新频率。  
> 如果你要降低 UI 重渲染频率，应在消费侧再做值节流/帧调度。

## FAQ

### 1）为什么不把节流 / raf 直接内置到 `useScroll`？

因为 `useScroll` 的职责是提供“原始滚动位置”。  
节流 / raf 属于性能策略，不同业务需求差异很大（埋点、动画、阈值判断、列表计算都不一样）。

保持 `useScroll` 纯净，可以：

- API 更稳定
- 语义更清晰
- 更容易和 `useThrottledEffect` / `useRaf` 系列自由组合

### 2）既然内部用了 `useEventListener`，为什么还要在 `useScroll` 外层做一次初始化同步？

`useEventListener` 只负责“订阅/解绑事件生命周期”，不负责“立即读取当前状态”。

而 `useScroll` 的语义不仅是“监听滚动”，还要“返回当前滚动位置”。  
如果没有初始化同步，就会出现“必须先滚动一次才有值”的问题。

所以这层初始化读取是 `useScroll` 自身的职责，不应该塞进 `useEventListener`（保持底层 Hook 纯净）。

### 3）传 `document` 和传 `window` 有什么区别？推荐哪个？

两者都可以工作。通常更推荐传 `window`（语义更直观）：

- `window`：页面滚动的常见写法
- `document`：也支持，内部会读取 `scrollingElement` 做归一化处理

### 4）`effectMode: 'layout'` 什么时候用？

当你需要在布局阶段同步读取滚动位置（例如与布局测量联动）时可以用 `layout`。  
如果只是普通展示或副作用触发，默认 `effect` 通常就够了。
