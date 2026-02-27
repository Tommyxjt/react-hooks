---
nav:
  path: /hooks
---

# useStorageState

以 `StorageLike` 为持久化后端的状态管理 Hook：把 React state **落盘到 storage**，并通过 `syncer` 实现 **同 tab / 跨 tab** 的状态同步（范围由 storage 的原始语义决定，不做“越权扩张”）。

## 何时使用

你会在这些场景里用到它：

- **持久化 UI 状态**：筛选条件、表格列配置、表单草稿、侧边栏折叠状态
- **同一页面多组件共享同一份配置**：A 面板改了配置，B 面板 UI 立即跟随
- **跨 tab 共享（localStorage）**：一个 tab 更新设置，另一个 tab 自动同步（前提：对应 syncer 实现桥接了 storage 的跨 tab 能力）
- **SSR / storage 不可用时降级**：首屏先用默认值渲染，hydrate 后再补一次对齐

> 推荐使用方式：不要直接裸用 `useStorageState`，而是二次封装成更贴近业务的 Hook（例如 `useLocalStorageState`、`useSessionStorageState`），由子 Hook 决定 storage 与 syncer。

## 设计要点

### 1）核心数据流（必须理解）

以“同 tab 两个组件共享同一个 key”为例：

1. A 调用 `actions.set(next)`
2. Hook 内部把 `next` 走一遍写入链路：`serialize -> encode -> setItem`
3. 写入完成后，立刻 `syncer.emit(detail)`  
   // 场景：同 tab 内 B 组件不一定会收到浏览器原生事件；emit 能让订阅者立刻对齐 UI，而不是等下一次 refresh
4. B 已经在 Hook 内部 `subscribe(storageKey, cb)`：收到 `detail.nextRaw`
5. B 直接 `decode(detail.nextRaw) -> deserialize(raw)` 得到新值，并用 `equals` 决定是否更新 state  
   // 场景：避免重复 getItem 与重复反序列化，减少 IO 与 CPU；同时避免 JSON.parse 产生新引用导致无意义 rerender

> 轻量监控方式：因为 Hook 内置订阅保证了 state 会自动对齐 storage，所以外部只写 `useEffect(cb, [state])` 就能监听“对齐后的状态变化”。  
> 外部直接订阅 syncer 适用于更复杂的监听（需要 reason/prevRaw/nextRaw/sourceId 等上下文）。

### 2）Key 规范：语义化命名 + 显式缓存破坏 + 正确性隔离

#### Key 格式

最终落盘 key 由 `makeStorageKey` 生成，满足规范：

```text
{prefix?}{sep}{key}{suffixSep}{schema?}{suffixSep}{serializerId?}{suffixSep}{codecId?}
```

- `prefix`：语义化命名空间（产品/模块/业务域），用于**标识归属**，避免不同模块撞 key
- `key`：业务 key，本体内容定位
- `suffix`：用于**维护读取正确性**
  - `schema`：显式缓存破坏（结构升级/不兼容时，切 schema 相当于“换一份新缓存”）
  - `serializerId / codecId`：对应一套 serializer/codec 的 mapping 标识  
    并且 **按照写入执行顺序**拼接到 key 中：先 `serialize` 再 `encode`，因此 `serializerId` 在 `codecId` 前

> 约束：当 schema/ids 为空时，不会出现多余分隔符（key 拼接保持干净）。

#### 为什么要把 schema/ids 放在 key 上？

- **schema 是显式缓存破坏机制**  
  类比：打包产物文件名 hash 变更 → 浏览器强制命中新文件，避免读旧缓存  
  场景：存储结构升级不兼容时，切 schema 让新版本自然读不到旧值 → 回退 defaultValue
- **serializerId/codecId 用于“正确性隔离”**  
  场景：同一业务 key 在未来切换序列化/编码策略，如果还读旧策略写的内容，decode/deserialize 可能报错或脏读  
  把 ids 放进 key，可以做到“新策略读新 key”，旧数据不被误读

### 3）轻量级 vs 逃生舱

#### 轻量级（推荐）

- 不传 `serializer` / `codec`，使用默认值：
  - `serializer` 默认：`JSON.stringify / JSON.parse`
  - `codec` 默认：`(x) => x`（identity，不做变换）
- 这是“轻量 + 稳定 + 可预期”的路径，依然具备正确性保障（默认策略稳定一致）

#### 逃生舱（允许偷懒，但需极度谨慎）

- 逃生舱语义：允许只用 `prefix + key`（甚至只 key）偷懒，同时传入自定义 `serializer/codec`，但**不使用 schema/serializerId/codecId 的隔离能力**
- 适用场景：团队内部已经强约束“同一个 key 的 serializer/codec 永远一致”
- 风险：未来策略调整时，旧数据仍在同一个 key 下，可能读错/报错
- 规范（逃生舱仍然必须遵守）：
  - 跨组件/跨路由必须统一 `prefix + key + serializer/codec`
  - 如果策略要调整：用 `schema` 做显式升级（缓存破坏），避免误读旧数据

> 结论：逃生舱不是推荐路径，它只是“允许偷懒但不至于无法使用”，且需要非常强的团队规范才能兜住风险。

### 4）为什么 syncer 必须外部传入（useStorageState 不内置）

- `useStorageState` **绝不内置 syncer**（哪怕提供默认值也不行）
- syncer 必须由二次封装（例如 `useLocalStorageState`）决定并传入
- 每种 storage 实现应使用各自语义范围内的 syncer（不做越权扩张）：
  - localStorage：天然跨 tab 可见 → syncer 可桥接跨 tab 通知
  - sessionStorage：天然不跨 tab → syncer 的影响范围就应限制在当前 tab
  - cookie：没有原生事件 → syncer 只能在你定义的范围内工作

// 场景：如果 useStorageState 内置 syncer，很容易把某一种 storage 的同步语义“强加”给所有 storage，造成错误广播与不可预测行为；同时也会让 SSR/测试替换变困难。

## 代码演示

<code src="./demo/basic.tsx"></code>

<code src="./demo/sync.tsx"></code>

## API

```typescript
import type React from 'react';

const [
  value,
  {
    set,    // React.Dispatch<React.SetStateAction<T>>
    remove, // () => void
    reset,  // () => void
  },
] = useStorageState<T>(
  key,
  {
    /** 获取 storage（SSR/不可用时返回 null） */
    storage: () => StorageLike | null,

    /** 同步器：由二次封装决定并传入（useStorageState 不内置） */
    syncer: StorageSyncer,

    /** 默认值：允许运行时变化（影响 reset/remove/persistDefaultValue） */
    defaultValue?: T | (() => T),

    /** 命名空间前缀：语义化标识，避免 key 冲突 */
    prefix?: string,

    /**
     * 显式缓存破坏：结构/策略升级时切 schema，相当于“换一份新缓存”
     * （避免新策略去读旧数据）
     */
    schema?: string,

    /**
     * 序列化策略标识：建议与 serializer 一一对应
     *（参与 key 后缀，用于正确性隔离）
     */
    serializerId?: string,

    /**
     * 编码策略标识：建议与 codec 一一对应
     *（参与 key 后缀，用于正确性隔离）
     */
    codecId?: string,

    /** key 拼接分隔符（可选，默认值由 makeStorageKey 决定） */
    separator?: string,

    /** suffix 分隔符（可选，默认值由 makeStorageKey 决定） */
    suffixSeparator?: string,

    /**
     * 自定义序列化（默认 JSON.stringify/parse）
     * 注意：传自定义 serializer 时，推荐配套 serializerId + schema
     */
    serializer?: Serializer<T>,

    /**
     * 自定义编码（默认 identity：x => x）
     * 注意：传自定义 codec 时，推荐配套 codecId + schema
     */
    codec?: Codec,

    /**
     * 是否初始化时从 storage 读取
     * false：直接用 defaultValue（常用于“先渲染默认值，再自行控制读入时机”）
     */
    initializeWithValue?: boolean,

    /**
     * storage 缺失该 key 时，是否把 defaultValue 落盘
     *（在 effect 中执行，避免 render 阶段副作用）
     */
    persistDefaultValue?: boolean,

    /**
     * 判断新旧值是否相等：相等则不触发 state 更新
     * 默认 Object.is
     */
    equals?: (a: T, b: T) => boolean,

    /** 读写/解码/反序列化错误回调 */
    onError?: (err: unknown) => void,
  } satisfies UseStorageStateOptions<T>,
);
```

### Params

| 参数    | 说明                   | 类型                        | 默认值 |
| ------- | ---------------------- | --------------------------- | ------ |
| key     | 业务 key（不含前后缀） | `string`                    | -      |
| options | 配置项（见下表）       | `UseStorageStateOptions<T>` | -      |

### Options

| 参数                | 说明                                                                | 类型                        | 默认值      | 必填 |
| ------------------- | ------------------------------------------------------------------- | --------------------------- | ----------- | ---- |
| storage             | 获取 StorageLike；不可用时返回 null（SSR/隐私模式等）               | `() => StorageLike \| null` | -           | ✅   |
| syncer              | 同步器：负责订阅/广播变更；必须外部传入（useStorageState 不内置）   | `StorageSyncer`             | -           | ✅   |
| defaultValue        | 默认值（缺失/删除/重置的回退值）；允许运行时变化                    | `T \| () => T`              | `undefined` | -    |
| prefix              | key 前缀：命名空间隔离/语义化标识                                   | `string`                    | -           | -    |
| schema              | 显式缓存破坏：结构升级/不兼容时切 schema                            | `string`                    | -           | -    |
| serializerId        | 序列化策略标识（参与 key 后缀，用于正确性隔离）                     | `string`                    | -           | -    |
| codecId             | 编码策略标识（参与 key 后缀，用于正确性隔离）                       | `string`                    | -           | -    |
| separator           | prefix 与 key 的分隔符（可选，默认由 makeStorageKey 决定）          | `string`                    | 内置默认    | -    |
| suffixSeparator     | suffix 分隔符（可选，默认由 makeStorageKey 决定）                   | `string`                    | 内置默认    | -    |
| serializer          | 自定义序列化（默认 JSON.stringify/parse）                           | `Serializer<T>`             | JSON        | -    |
| codec               | 自定义编码（默认 identity：x => x）                                 | `Codec`                     | identity    | -    |
| initializeWithValue | 是否初始化时从 storage 读取                                         | `boolean`                   | `true`      | -    |
| persistDefaultValue | storage 缺失该 key 时，是否把 defaultValue 落盘（在 effect 中执行） | `boolean`                   | `false`     | -    |
| equals              | 自定义相等判断（减少无意义 rerender）                               | `(a: T, b: T) => boolean`   | `Object.is` | -    |
| onError             | 读写/解码/反序列化错误回调                                          | `(err: unknown) => void`    | -           | -    |

### Result

| 参数           | 说明                                                              | 类型                                      |
| -------------- | ----------------------------------------------------------------- | ----------------------------------------- |
| value          | 当前状态值（始终与 storage 对齐后的结果）                         | `T`                                       |
| actions.set    | 写入新值：更新 state + setItem + emit 同步事件                    | `React.Dispatch<React.SetStateAction<T>>` |
| actions.remove | 删除 key：removeItem + 回退 defaultValue + emit 同步事件          | `() => void`                              |
| actions.reset  | 重置为默认值：等价于 `set(defaultValue)`（会写入 storage 并同步） | `() => void`                              |

## 注意事项

### 1）默认 JSON 的边界

默认 serializer 是 JSON，因此：

- 复杂类型（Date/Map/Set/BigInt/函数）可能无法正确还原
- 需要复杂类型时请自定义 serializer，并配合 `serializerId` 做正确性隔离（推荐）

### 2）persistDefaultValue 为什么在 effect 执行？

- 初始化 state 的 lazy initializer 发生在 render 阶段
- React 严格模式下 render 可能被重复调用
- 如果在 render 阶段写 storage/emit，会造成重复落盘/重复广播  
  // 因此 persistDefaultValue 必须放在 effect（commit 后）执行，并且写入前会再次 getItem 检查，避免并发挂载覆盖别人刚写入的值

### 3）为什么 set 同值也可能会写 storage？

Hook 会做“同值短路”，但条件更严格：

- 不仅要求 `equals(prev, next)` 为 true
- 还要求 `storage.getItem(storageKey)` 已经等于编码后的 `encoded`  
  // 场景：如果 storage 被外部清掉但内存值没变，仍需要补写，避免“永远不落盘”

## FAQ

### 1）为什么 key 不用“函数体哈希”做隔离？

- 不可解释、不可调试：看到 hash 无法知道这是哪个策略/哪个版本
- 不稳定：编译/压缩/不同构建环境可能改变函数体文本，导致 hash 漂移
- 与显式 schema 的理念冲突：我们更希望“升级是显式的、可控的、可回滚的”，而不是隐式漂移

### 2）为什么 syncer 不允许在 useStorageState 中内置？

- useStorageState 是基础能力，不应该强绑定某一种环境/语义
- 不同 storage 的同步语义不同（local 跨 tab、session 不跨 tab、cookie 没事件）
- 内置 syncer 很容易造成“错误广播范围”，甚至破坏原有 storage 语义
- 也会让 SSR/测试替换更困难（无法注入 mock syncer）

### 3）为什么不内置防抖/节流？需要时怎么组合？

防抖/节流是“业务语义”，不应隐藏在存储层：

- 内置防抖会让时序变得不可预测（写入何时发生？何时广播？）
- 会让一致性更难推理（别的组件到底该何时更新？）

需要时由使用方显式包装 `set`：

```typescript
const [value, actions] = useLocalStorageState('filters', { defaultValue: {} });

const setDebounced = useDebouncedCallback(actions.set, 200);

// 用户频繁输入时只触发合并后的写入
setDebounced((prev) => ({ ...prev, keyword }));
```
