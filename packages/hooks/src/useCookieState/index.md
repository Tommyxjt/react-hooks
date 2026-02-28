---
nav:
  path: /hooks
---

# useCookieState

以 **cookie** 为后端的状态管理 Hook：把状态写入 `document.cookie`，并提供 `set / remove / reset` 等一致的 state API。

> 核心设计（key 规范、schema/serializerId/codecId 的正确性隔离、syncer 注入原则等）详见：[useStorageState](/hooks/use-storage-state)

## 何时使用

适合这些场景（cookie 的语义更贴合）：

- 需要随请求自动携带的一些轻量状态（例如：Consent/AB 分流标识、轻量开关）
- tab 间共享“值”是可以的，但你希望 **UI 更新是可控的**（默认不自动跨 tab 刷新）
- 值体积很小、更新频率不高

不建议：

- 存大对象（cookie 单条通常 ~4KB 限制，浏览器有差异）
- 高频更新（每次写 cookie 都会影响后续请求头大小与性能）

## 重要边界：HttpOnly cookie 不在本 Hook 范畴

**HttpOnly cookie** 对 JavaScript 不可见：JS 读不到、也写不了。  
因此 useCookieState 只能管理 **document.cookie 可读写** 的 cookie。

如果你的登录态 token 存在 HttpOnly cookie（很常见的安全实践），前端的 UI 同步一般依赖：

- 下一次请求的 401/刷新接口返回
- SSE/WS 推送
- 或者业务层额外的“登录/登出信号”

## Cookie 相比 localStorage/sessionStorage 的差异

- **localStorage**：值长期存在，且有 `storage` 事件输入（其他 tab 写入会触发当前 tab 的事件），适合“全局偏好/登录态 UI 跨 tab 自动同步”
- **sessionStorage**：tab 级会话，关闭 tab 自动清空，天然不跨 tab
- **cookie**：跨 tab 共享值没问题，但**没有原生变更事件**；同时还有 `Path/Domain/SameSite/Secure/Expires/Max-Age` 等属性，会影响读写与传播范围，并且 cookie 会随请求自动携带

## Cookie 的使用痛点与本 Hook 的处理方式

### 1）document.cookie 太原始（解析/拼接困难）

- 痛点：cookie 是一整串字符串，需要自己 parse / join / encode
- 处理：useCookieState 提供 state API（set/remove/reset），内部封装字符串处理

### 2）属性容易写错，导致“写了但读不到 / 删不掉”

- 痛点：Path/Domain 不一致，最常见结果就是删除失败或读不到
- 处理：
  - 默认固定 `path: '/'`（最常见且最不容易踩坑）
  - cookie 属性在实例初始化时冻结：set/remove/reset 始终使用同一套属性，避免“同名不同属性”的混乱

### 3）值中出现特殊字符会破坏 cookie 格式

- 痛点：`;`、空格、`=` 等会让 cookie 串解析变得不可控
- 处理：默认使用 **URL 编码**（encodeURIComponent/decodeURIComponent）

### 4）容量限制导致静默失败/被截断

- 痛点：单条 cookie 容量通常有限，超长可能失败或被截断
- 处理：写入前做长度预检查，并在写入后做读回校验；失败会走 `onError`

### 5）跨 tab UI 不会自动刷新

- 痛点：cookie 没有 `storage` 事件，其他 tab 往往要等下一次请求/交互才更新 UI
- 处理：
  - 默认：同 tab 同 key 多实例同步 ✅；跨 tab 自动刷新 ❌（保持 cookie 原生“无事件”体验）
  - 可选：开启 `signal: 'broadcast'`（BroadcastChannel 语法糖），让其他 tab 立刻对齐并 rerender

## 默认同步能力

### 1）同 tab：同 key 多实例同步（默认开启）

场景：页面里两个互不相干的模块都调用 `useCookieState('consent')`，没有 props/context 关系。  
A set 后，B 需要立刻同步，否则 UI 不一致。

useCookieState 默认通过内部同步器广播变更，保证同 tab 的其他独立实例自动同步（无需你手写订阅）。

### 2）跨 tab：默认不自动刷新（可选 Broadcast 信号）

cookie 本身跨 tab 共享值，但缺少变更通知。默认情况下，其他 tab 的 UI 往往要等下一次请求/交互才更新。  
如果你希望“登出/登录立刻同步 UI”，可开启 BroadcastChannel 信号（语法糖，不改变 cookie 事实源）。

## 代码演示

<code src="./demo/basic.tsx"></code>

## API

```typescript
const [value, { set, remove, reset }] = useCookieState<T>(key, options);
```

### Params

| 参数    | 说明                                                                        | 类型                       | 默认值 |
| ------- | --------------------------------------------------------------------------- | -------------------------- | ------ |
| key     | 存储 key（会与 prefix/schema/serializerId/codecId 等组合成最终 storageKey） | `string`                   | -      |
| options | 配置项                                                                      | `UseCookieStateOptions<T>` | `{}`   |

### Result

| 参数   | 说明                                      | 类型                                      |
| ------ | ----------------------------------------- | ----------------------------------------- |
| value  | 当前状态值（与 cookie 对齐后的值）        | `T`                                       |
| set    | 写入状态（会写 cookie，并同步通知订阅者） | `React.Dispatch<React.SetStateAction<T>>` |
| remove | 删除 cookie，并回退到 defaultValue        | `() => void`                              |
| reset  | 重置为 defaultValue（会写 cookie）        | `() => void`                              |

## Options

说明：useCookieState 复用 useStorageState 的能力，同时提供 cookie 专属配置（path/domain/sameSite/secure/maxAge/expires）与可选的跨 tab signal。

| 参数                | 说明                                                  | 类型                          | 默认值            | 必填 |
| ------------------- | ----------------------------------------------------- | ----------------------------- | ----------------- | ---- |
| cookie.path         | cookie Path（默认固定为 `/`）                         | `string`                      | `/`               | -    |
| cookie.domain       | cookie Domain（可选）                                 | `string`                      | -                 | -    |
| cookie.sameSite     | SameSite 策略                                         | `'Lax' \| 'Strict' \| 'None'` | -                 | -    |
| cookie.secure       | 是否 Secure（https）                                  | `boolean`                     | -                 | -    |
| cookie.expires      | Expires                                               | `Date`                        | -                 | -    |
| cookie.maxAge       | Max-Age（秒）                                         | `number`                      | -                 | -    |
| signal              | 跨 tab “信号语法糖”（BroadcastChannel）               | `'none' \| 'broadcast'`       | `'none'`          | -    |
| signalChannelName   | BroadcastChannel 频道名（同源下 name 相同即互通）     | `string`                      | 内置默认          | -    |
| defaultValue        | 默认值（缺失/删除/重置时回退）；允许运行时变化        | `T \| () => T`                | `undefined`       | -    |
| prefix              | key 前缀：命名空间隔离                                | `string`                      | -                 | -    |
| schema              | 显式缓存破坏：结构升级/不兼容时切 schema              | `string`                      | -                 | -    |
| serializerId        | 序列化策略标识（参与 key 后缀）                       | `string`                      | -                 | -    |
| codecId             | 编码策略标识（参与 key 后缀）                         | `string`                      | -                 | -    |
| separator           | prefix 与 key 的分隔符（默认由 makeStorageKey 决定）  | `string`                      | 内置默认          | -    |
| suffixSeparator     | suffix 分隔符（默认由 makeStorageKey 决定）           | `string`                      | 内置默认          | -    |
| serializer          | 自定义序列化（默认 JSON.stringify/parse）             | `Serializer<T>`               | JSON              | -    |
| codec               | 自定义编码（默认 URL 编码）                           | `Codec`                       | URL encode/decode | -    |
| initializeWithValue | 是否初始化时读取 cookie                               | `boolean`                     | `true`            | -    |
| persistDefaultValue | cookie 缺失该 key 时，是否把 defaultValue 写入 cookie | `boolean`                     | `false`           | -    |
| equals              | 自定义相等判断（减少无意义更新）                      | `(a: T, b: T) => boolean`     | `Object.is`       | -    |
| onError             | 读写/编码/反序列化错误回调                            | `(err: unknown) => void`      | -                 | -    |

## Broadcast 示例（跨 tab 立即同步 UI）

当你希望“一个 tab 登出，另一个 tab 立刻更新 UI”，可以开启：

```typescript
const [token, { set, remove }] = useCookieState<string | undefined>('auth:token', {
  prefix: 'demo',
  schema: 'v1',
  signal: 'broadcast',
});

// 登录（示例）
set('token123');

// 登出（示例）
remove();
```

打开两个同源 tab，任一 tab set/remove 后，另一个 tab 会立刻对齐并 rerender。

## FAQ

### 1）为什么 HttpOnly cookie 不支持？

HttpOnly cookie 对 JS 不可见，document.cookie 读不到也写不了。本 Hook 只能管理 JS 可读写的 cookie。

### 2）如何自定义 signalChannelName？

当你需要在大型应用/微前端里做隔离，可以指定频道名（同源下 name 相同即互通）：

```typescript
// Tab A / Tab B 只要都使用同一个 signalChannelName，就会互通。
// 你不需要“额外定义”别的广播端；useCookieState 内部会：
// - 在 set/remove 后向该 channel postMessage
// - 在初始化时订阅该 channel 的 message，并注入 external 同步

useCookieState('auth:token', {
  prefix: 'demo',
  schema: 'v1',
  signal: 'broadcast',
  signalChannelName: 'my-app:cookie-signal',
});
```

### 3）为什么跨 tab 默认不自动刷新？

cookie 没有原生变更事件。默认保持其原生体验，避免隐式引入额外通道；需要“立即同步 UI”时，再显式开启 `signal: 'broadcast'`。
