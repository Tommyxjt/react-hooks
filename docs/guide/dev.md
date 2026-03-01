---
title: 本地开发 & 贡献一个新 Hook（推荐流程）
toc: content
group:
  title: 开发
  order: 99
---

# 本地开发

在仓库根目录：

```bash
# 安装依赖
pnpm install

# 启动文档站（本地开发）
pnpm start

# 构建 hooks 包
pnpm run build:pkg

# 构建文档
pnpm run build:docs

# 预览产物
pnpm run docs:preview

# 体检
pnpm run doctor
```

# 贡献一个新 Hook（推荐流程）

1. 在 `packages/hooks/src/<HookName>/` 下添加:

   - 实现：`index.ts`
   - 文档：`index.md`
   - 示例代码（demo）：`demo/**.tsx`
   - 单元测试：`__tests__/index.test.ts`

2. 在 `packages/hooks/src/index.ts` 导出该 Hook。

3. 在 `.dumi/config/sidebar.ts` 中把它加入合适的分组。

4. 为文档补充 demo（如需要），并在 dumi 页面中引用演示代码。
