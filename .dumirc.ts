import { defineConfig } from 'dumi';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    // 设置文档源目录
    docDirs: [
      'docs',
      'packages/hooks/src', // 添加这个路径
    ],

    // 设置原子组件（Hooks）目录
    atomDirs: [{ type: 'hook', dir: 'packages/hooks/src' }],
  },
  outputPath: 'docs-dist',
  themeConfig: {
    name: 'tommy-encode-hooks',
    nav: [
      { title: '指南', link: '/guide' },
      { title: 'Hooks', link: '/hooks' },
    ],
  },
  alias: {
    '@': '/packages/hooks/src',
    encodeHooks: '/packages/hooks/src/index.ts',
  },
});
