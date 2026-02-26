---
nav:
  path: /hooks
---

# useSize

以声明式方式观察元素尺寸变化，并返回当前尺寸（`width / height`）。

它会自动处理：

- 组件挂载（或 `target` 变化）时主动测量一次尺寸（避免首屏必须等待回调）
- 使用 `ResizeObserver` 订阅后续尺寸变化
- `ref.current` 初始为 `null` 的过渡态（会安全跳过，待目标可用后自动生效）
- 尺寸未变化时复用旧值，避免无意义 rerender

> 说明：当前版本面向 Web / DOM 元素场景（仅 `Element / ref.current`），不处理 `window`。  
> 如需页面尺寸，建议单独提供 `useWindowSize`（语义更清晰）。

## 代码演示

<code src="./demo/basic.tsx"></code>

<code src="./demo/resize.tsx"></code>

## API

```typescript
type SizeTarget = Element | null | undefined;

type SizeTargetInput = SizeTarget | { readonly current: SizeTarget };

type SizeEffectMode = 'effect' | 'layout';

interface UseSizeOptions {
  effectMode?: SizeEffectMode;
}

interface Size {
  width: number;
  height: number;
}

function useSize(target: SizeTargetInput, options?: UseSizeOptions): Size | undefined;
```

### Params

| 参数名  | 说明                                          | 类型              | 默认值 |
| ------- | --------------------------------------------- | ----------------- | ------ |
| target  | 被观察的元素，支持 `Element` 或 `ref.current` | `SizeTargetInput` | -      |
| options | 配置项                                        | `UseSizeOptions`  | `{}`   |

### options

| 参数名     | 说明                                                                | 类型                   | 默认值     |
| ---------- | ------------------------------------------------------------------- | ---------------------- | ---------- |
| effectMode | 使用 `useEffect` 或 `useLayoutEffect`（SSR 下 `layout` 会自动降级） | `'effect' \| 'layout'` | `'effect'` |

### Result

| 参数名 | 说明                                   | 类型                |
| ------ | -------------------------------------- | ------------------- |
| -      | 当前尺寸；目标不可用时返回 `undefined` | `Size \| undefined` |

## 使用说明

### 1) 为什么还要“初始化测量”？

如果只依赖 `ResizeObserver`，首屏时机可能拿不到你想要的尺寸值（尤其是刚挂载时）。  
所以 `useSize` 会在挂载（或目标变化）时主动测量一次，保证尽快得到当前尺寸。

### 2) 为什么不使用 `window.resize` 来监听？

元素尺寸变化不一定来自窗口变化，还可能来自：

- 父容器布局变化
- 内容变化
- 样式变化（如 `display / padding / border / flex`）

所以元素尺寸的正确变化源是 `ResizeObserver`，而不是 `window.resize`。

### 3) 为什么 `useSize` 没有 `isEnabled`？

这是一个有意的语义化设计：

- `useEventListener / useClickAway / useScroll` 这类 Hook 更偏“行为订阅”，业务里常见启停需求，因此保留 `isEnabled`
- `useSize` 更偏“状态观测 / 尺寸读取”，通常通过传 `null`（目标不可用）就能自然表达“暂不观测”

这样 API 会更干净，职责也更明确。

### 4) `effectMode: 'layout'` 什么时候用？

当你的尺寸测量结果会立即参与布局计算（例如同步设置样式、避免闪动）时，可以使用 `layout`。  
如果只是普通展示尺寸，默认 `effect` 通常就够了。

## FAQ

### 1）返回 `undefined` 是什么情况？

常见情况有：

- `ref.current` 首轮渲染时为 `null`
- 目标元素是条件渲染的，尚未挂载
- SSR 环境没有真实 DOM

这些都属于正常过渡态，目标可用后会自动开始测量与订阅。

### 2）浏览器不支持 `ResizeObserver` 怎么办？

当前实现会：

- 保留“初始化测量”
- 跳过后续自动订阅

也就是说：你至少能拿到一次初始尺寸，但后续尺寸变化不会自动同步（除非环境提供 `ResizeObserver`）。
