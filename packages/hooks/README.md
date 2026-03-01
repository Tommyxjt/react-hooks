# @tx-labs/react-hooks

一个偏实验性质的 React Hooks 小库：轻量、TypeScript 友好，专注于把常用状态逻辑写得更语义化、更容易复用。

> 目前包含多类 Hooks（状态 / 事件与订阅 / Storage / 防抖 / RAF 合帧 / DOM 工具等）；完整列表见下方「Hooks 一览」，或访问文档站：https://d3s7htzraynn5r.cloudfront.net/

> React Hooks 需要 React 16.8+

---

## 文档

- 文档站：[https://d3s7htzraynn5r.cloudfront.net](https://d3s7htzraynn5r.cloudfront.net/)

---

## 安装

```bash
# pnpm

pnpm add @tx-labs/react-hooks

# npm

npm i @tx-labs/react-hooks

# yarn

yarn add @tx-labs/react-hooks
```

---

## 使用

```ts
import { useToggle, useBoolean, useDebouncedState } from '@tx-labs/react-hooks';
```

---

## Hooks 一览

> 下列为当前包入口导出的全部 hooks（按类别整理）。完整示例与 API 详见文档站。

### Basic utilities（基础工具）

- `useLatestRef`：始终拿到最新值的 ref（解决闭包旧值）
- `useUnmount`：组件卸载时执行回调
- `useStableCallback`：返回引用稳定、但内部总调用最新实现的 callback
- `useUpdateEffect`：跳过首次渲染的 effect（仅依赖更新时触发）
- `useIsMounted`：判断组件是否仍处于 mounted 状态
- `useElementInstance`：获取/追踪元素（或实例）引用，便于作为 target 使用
- `useTargetEffect`：面向 target（DOM / ref / getter）的 effect 封装

### State helpers（状态类）

- `useToggle`：在两个值之间切换（支持 boolean / 自定义左右值）
- `useBoolean`：boolean 状态的语义化操作（toggle / setTrue / setFalse）
- `useSafeSetState`：安全 setState（卸载后更新会被忽略）
- `usePrevious`：获取上一次的值
- `useMergeState`：对象 state 的“合并式”更新（类似 class setState）
- `useMap`：Map 状态 + 常用增删改查操作
- `useSet`：Set 状态 + 常用增删改查操作
- `useArray`：Array 状态 + 常用增删改查操作

### Event & subscription（事件/订阅）

- `createEventBus`：创建事件总线实例
- `useEventBus`：在 React 中使用事件总线（订阅/发布）

### Storage（持久化状态）

- `useStorageState`：基于 StorageLike 的通用状态同步
- `useLocalStorageState`：localStorage 版状态同步
- `useSessionStorageState`：sessionStorage 版状态同步
- `useCookieState`：cookie 版状态同步

### Debounce（防抖）

- `useDebounceController`：防抖控制器（如 cancel/flush 等）
- `useDebouncedState`：带防抖能力的 state
- `useDebouncedClick`：防抖点击（防连点）
- `useDebouncedCallback`：防抖回调
- `useDebouncedEffect`：防抖 effect

### RAF utilities（帧调度 / 合帧）

- Drivers：`createFrameDriver` / `createRafDriver` / `createTimeoutDriver`
- Hooks：`useRaf` / `useRafLoop` / `useRafRef` / `useRafState` / `useRafThrottledEffect`
- Core：`useRafScheduler`

### DOM（浏览器相关）

- `useSafeLayoutEffect`：SSR 友好的 useLayoutEffect 替代
- `useEventListener`：事件监听（支持 target）
- `useTitle`：设置/同步 document.title
- `useDocumentVisibility`：监听页面可见性（visible/hidden）
- `useClickAway`：点击外部触发回调
- `useScroll`：获取/订阅滚动信息
- `useSize`：获取/订阅元素尺寸变化

### Escape hatches（兜底/逃生舱）

- `useForceUpdate`：强制触发一次重新渲染

---

兼容性

- React：`>= 16.8.0`（依赖 hooks）

- TypeScript：已提供类型声明（从包入口导入即可）

---

## License

MIT
