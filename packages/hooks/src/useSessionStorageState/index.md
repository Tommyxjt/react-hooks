---
nav:
  path: /hooks
---

# useSessionStorageState

`useStorageState` 的 sessionStorage 预设封装：把状态持久化到 `sessionStorage`，并且**默认开启同 tab 同 key 多实例同步**（不会扩张为跨 tab 同步，保持 sessionStorage 的原生语义边界）。

> 核心设计（key 规范、schema/serializerId/codecId 的正确性隔离、syncer 注入原则等）详见：[useStorageState](/hooks/use-storage-state)

## 何时使用

useSessionStorageState 适合“**只需要在当前 tab 会话内生效**”的状态：

- 页面刷新后仍保留，但**关闭该 tab 后自动清空**
- 不希望多个 tab 互相影响（天然隔离）
- 仍希望同一页面内多个独立模块用同一个 key 时自动同步（同 tab 多实例同步）

典型场景（语义更贴合）：

- 一次性流程/向导：步骤进度、临时表单草稿（只跟这个 tab 走）
- 列表页到详情页的“临时筛选条件/回跳参数”（只在当前 tab 保留）
- 当前 tab 的临时 UI 偏好：某些面板是否展开、临时排序
- OAuth/三方登录中间态：用于同 tab 内的临时信息传递（避免跨 tab 泄漏）

## 与 useLocalStorageState 的差异

如果你不确定选哪个，可以用这个“语义决策”快速判断：

- **useLocalStorageState（localStorage）**：跨 tab 共享、长期存在  
  适合：登录态、全局偏好设置、长期配置、跨 tab 需要一致的状态

- **useSessionStorageState（sessionStorage）**：tab 级会话、关闭 tab 自动清空、天然不跨 tab  
  适合：临时状态、一次性流程、只想影响当前 tab 的 UI/中间态

说明：

- sessionStorage 的语义天然不跨 tab，本封装也不会通过额外通道“强行跨 tab 同步”，以免破坏语义一致性。
- 如果你确实需要跨 tab，请使用 [useLocalStorageState](/hooks/use-local-storage-state)。

## 代码演示

<code src="./demo/basic.tsx"></code>

## API

```typescript
const [value, { set, remove, reset }] = useSessionStorageState<T>(key, options);
```

### Params

| 参数    | 说明                                                                        | 类型                               | 默认值 |
| ------- | --------------------------------------------------------------------------- | ---------------------------------- | ------ |
| key     | 存储 key（会与 prefix/schema/serializerId/codecId 等组合成最终 storageKey） | `string`                           | -      |
| options | 配置项（基本等同 useStorageState，但不允许传 storage/syncer）               | `UseSessionStorageStateOptions<T>` | `{}`   |

### Result

| 参数   | 说明                                               | 类型                                      |
| ------ | -------------------------------------------------- | ----------------------------------------- |
| value  | 当前状态值（与 sessionStorage 对齐后的值）         | `T`                                       |
| set    | 写入状态（会落盘并同步通知订阅者）                 | `React.Dispatch<React.SetStateAction<T>>` |
| remove | 删除存储项（raw 变为 null），并回退到 defaultValue | `() => void`                              |
| reset  | 重置为 defaultValue（会写入存储项）                | `() => void`                              |

## Options

说明：`useSessionStorageState` 复用 `useStorageState` 的绝大多数能力，但**不允许传入 `storage` / `syncer`**，以避免“名为 sessionStorage 但实际接入其他存储/同步器”导致语义错配。

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

### 1）同 tab：同 key 多实例同步（默认开启）

场景：同一页面里两个互不相干的模块都调用 `useSessionStorageState('wizard:step')`，它们之间没有 props/context 关系。  
A 组件 set 后，B 组件需要立刻对齐，否则 UI 会不一致。

因此 useSessionStorageState 默认通过内部同步器广播变更，保证同 tab 的其他独立实例自动同步（无需你手写订阅）。

### 2）不跨 tab（保持原生语义）

sessionStorage 的语义是“tab 级会话存储”，天然不跨 tab 共享。  
本封装不会通过额外机制去扩张传播范围，以确保行为符合直觉与安全边界。
