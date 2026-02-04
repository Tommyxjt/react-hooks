# @tx-labs/react-hooks

一个偏实验性质的 React Hooks 小库：轻量、TypeScript 友好，专注于把常用状态逻辑写得更语义化、更容易复用。

> 目前包含：`useToggle` / `useBoolean` / `useDebouncedState`  
> React Hooks 需要 React 16.8+

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

## 文档

- 文档站：<DOCS_URL_PLACEHOLDER>

---

## Hooks 一览

- `useToggle`：在两个值之间切换（支持 boolean / 自定义左右值）
- `useBoolean`：布尔状态的语义化操作集合（toggle / setTrue / setFalse）
- `useDebouncedState`：带防抖能力的 state（支持 `delay` / `leading` / `skipInitial`）

---

兼容性

- React：`>= 16.8.0`（依赖 hooks）

- TypeScript：已提供类型声明（从包入口导入即可）

---

## License

MIT
