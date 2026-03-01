---
toc: false
hero:
  title: TX Hooks
  description: 一套面向工程实践的 React Hooks 工具库（TypeScript 友好、可组合、可树摇），覆盖闭包安全、事件订阅、帧调度、状态与常用 DOM 场景。
  actions:
    - text: 快速开始
      link: /guide
    - text: 浏览 Hooks
      link: /hooks/use-latest-ref
    - text: GitHub
      link: https://github.com/Tommyxjt/react-hooks
features:
  - title: 闭包安全与稳定引用
    emoji: 🧠
    description: 用「稳定引用 + 永远读最新值」的方式，减少 useEffect / useCallback 依赖地狱与过期闭包问题。
  - title: 事件与订阅体系
    emoji: 🚌
    description: 提供 createEventBus + useEventBus 的组合，内置开发期告警与错误隔离，适合跨组件通信与解耦。
  - title: 帧调度与高频更新
    emoji: 🎞️
    description: 对齐帧边界合并更新，可选监控耗时与限帧策略，适合实时数据、动画与高频输入场景。
  - title: 工程化与可维护性
    emoji: 🧰
    description: 统一导出入口、清晰分组与文档站支持，方便团队沉淀与长期维护。
---

<div class="home-narrow">

## 安装

```bash
pnpm add @tx-labs/react-hooks
# 或
npm i @tx-labs/react-hooks
# 或
yarn add @tx-labs/react-hooks
```

## 一个最小示例

```tsx
import React from 'react';
import { useToggle } from '@tx-labs/react-hooks';

export default () => {
  const [on, { toggle }] = useToggle(false);

  return <button onClick={toggle}>{on ? 'ON' : 'OFF'}</button>;
};
```

## 下一步

- 从「指南」开始：了解推荐用法与典型场景 → `/guide`
- 直接浏览全部 Hooks：按左侧分类查看 → `/hooks/use-latest-ref`

:::tip
本项目的文档站由 dumi 驱动，Hooks 文档会按侧边栏分组自动聚合；你可以把它当作团队内部“最佳实践手册”来维护。
:::

</div>
