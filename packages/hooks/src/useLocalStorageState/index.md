---
nav:
  path: /hooks
---

# useLocalStorageState

`useStorageState` 的 localStorage 预设封装：把状态持久化到 `localStorage`，并且**默认开启**：

- ✅ 同 tab：同 key 的多实例自动同步
- ✅ 跨 tab：其他 tab 写入后自动同步并触发 rerender

> 核心设计（key 规范、schema/serializerId/codecId 的正确性隔离、syncer 注入原则等）详见：[useStorageState](/hooks/use-storage-state)

## 何时使用

- 希望状态在刷新后仍保留（持久化到 `localStorage`）
- 希望页面内多个组件**各自调用 useLocalStorageState 但使用同一个 key**时，状态自动保持一致（同 tab 多实例同步）
- 希望在另一个 tab 修改同一个 key 后，本 tab 的 UI 自动更新（跨 tab 同步）
- SSR / 隐私模式等环境下 `localStorage` 不可用：自动降级为仅内存 state（不落盘）

## 代码演示

<code src="./demo/demo1-parent.tsx"></code>

<code src="./demo/crossTabAuth.tsx"></code>

## API

```typescript
const [value, { set, remove, reset }] = useLocalStorageState<T>(key, options);
```

### Params

| 参数    | 说明                                                                        | 类型                             | 默认值 |
| ------- | --------------------------------------------------------------------------- | -------------------------------- | ------ |
| key     | 存储 key（会与 prefix/schema/serializerId/codecId 等组合成最终 storageKey） | `string`                         | -      |
| options | 配置项（基本等同 useStorageState，但不允许传 storage/syncer）               | `UseLocalStorageStateOptions<T>` | `{}`   |

### Result

| 参数   | 说明                                               | 类型                                      |
| ------ | -------------------------------------------------- | ----------------------------------------- |
| value  | 当前状态值（与 localStorage 对齐后的值）           | `T`                                       |
| set    | 写入状态（会落盘并同步通知订阅者）                 | `React.Dispatch<React.SetStateAction<T>>` |
| remove | 删除存储项（raw 变为 null），并回退到 defaultValue | `() => void`                              |
| reset  | 重置为 defaultValue（会写入存储项）                | `() => void`                              |

## Options

说明：`useLocalStorageState` 复用 `useStorageState` 的绝大多数能力，但**不允许传入 `storage` / `syncer`**，以避免“名为 localStorage 但实际接入其他存储/同步器”导致语义错配。

| 参数                | 说明                                                 | 类型                      | 默认值      | 必填 |
| ------------------- | ---------------------------------------------------- | ------------------------- | ----------- | ---- |
| defaultValue        | 默认值（缺失/删除/重置时的回退值）；允许运行时变化   | `T \| () => T`            | `undefined` | -    |
| prefix              | key 前缀：命名空间隔离/语义化标识                    | `string`                  | -           | -    |
| schema              | 显式缓存破坏：结构升级/不兼容时切 schema             | `string`                  | -           | -    |
| serializerId        | 序列化策略标识（参与 key 后缀，用于正确性隔离）      | `string`                  | -           | -    |
| codecId             | 编码策略标识（参与 key 后缀，用于正确性隔离）        | `string`                  | -           | -    |
| separator           | prefix 与 key 的分隔符（默认由 makeStorageKey 决定） | `string`                  | 内置默认    | -    |
| suffixSeparator     | suffix 分隔符（默认由 makeStorageKey 决定）          | `string`                  | 内置默认    | -    |
| serializer          | 自定义序列化（默认 JSON.stringify/parse）            | `Serializer<T>`           | JSON        | -    |
| codec               | 自定义编码（默认 identity：x => x）                  | `Codec`                   | identity    | -    |
| initializeWithValue | 是否初始化时从 storage 读取                          | `boolean`                 | `true`      | -    |
| persistDefaultValue | storage 缺失该 key 时，是否把 defaultValue 落盘      | `boolean`                 | `false`     | -    |
| equals              | 自定义相等判断（减少无意义更新）                     | `(a: T, b: T) => boolean` | `Object.is` | -    |
| onError             | 读写/解码/反序列化错误回调                           | `(err: unknown) => void`  | -           | -    |

## 默认同步能力

useLocalStorageState 默认同时支持两类同步：

### 1）同 tab：同 key 多实例同步（默认开启）

场景：页面里两个互不相干的组件都调用 `useLocalStorageState('token')`，它们之间没有 props/context 关系。  
此时仅靠 React 状态联动是不够的：A 组件 set 只会让 A 自己 rerender，B 不会自动更新。

因此 useLocalStorageState 会在写入后通过内部同步器广播变更，让同 tab 的**其他独立实例**立刻对齐 state（无需你手写订阅）。

### 2）跨 tab：自动同步并触发 rerender（默认开启）

当其他 tab 写入同一个 localStorage key 时，浏览器会在当前 tab 触发 `storage` 事件。  
useLocalStorageState 内部会监听该事件并注入到同步器中，从而驱动当前 tab 的 React state 对齐并触发 rerender。

说明：

- 发起写入的那个 tab 不会收到自己的 `storage` 事件（浏览器规范），但它自身 setState 已经更新 UI
- 要看到“另一个 tab 自动渲染”，前提是另一个 tab 已经挂载了对应的 hook 实例

> 更完整的设计动机与数据流，请跳转：[useStorageState](/hooks/use-storage-state)

## FAQ

### 1）为什么 options 里不能传 storage/syncer？

useLocalStorageState 的语义就是“绑定 localStorage 并默认开启同 tab/跨 tab 同步”。允许外部传入不匹配的 storage/syncer 会导致传播边界混乱，破坏语义一致性。需要更灵活组合请使用 [useStorageState](/hooks/use-storage-state)。

### 2）为什么不内置防抖/节流？

防抖/节流是业务语义，隐藏在 hook 内会让时序难推理。需要时建议显式包装 `set`（例如用 `useDebouncedCallback(actions.set, 300)`），保持数据流可读。
