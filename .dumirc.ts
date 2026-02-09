import { defineConfig } from 'dumi';
import path from 'path';
import webpackChain from 'webpack-chain';
import sidebar from './.dumi/config/sidebar';

export default defineConfig({
  styles: ['/styles/index.css'],
  // webpack 配置
  chainWebpack(config: webpackChain) {
    config.module
      .rule('md') // 处理 markdown 文件
      .test(/\.md$/)
      .use('insert-toc-loader')
      .loader(path.resolve(__dirname, './loader/insert-toc-loader.cjs'))
      .end();
  },
  resolve: {
    // 设置文档源目录
    docDirs: ['docs'],

    // 设置原子组件（Hooks）目录
    atomDirs: [
      { type: 'hook', dir: 'packages/hooks/src' },

      // 专门让 dumi 识别 useDebounce/docs 下的一层 md
      { type: 'hook', dir: 'packages/hooks/src/useDebounce/docs' },
    ],
    codeBlockMode: 'passive',
  },
  outputPath: 'docs-dist',

  themeConfig: {
    name: 'TX Hooks',
    logo: '/logo.svg',
    favicon: '/favicon.ico',
    nav: [
      { title: '指南', link: '/guide' },
      {
        title: 'Hooks',
        link: '/hooks/use-latest-ref',
        activePath: '/hooks',
      },
    ],
    sidebar,
    footer: 'Copyright © 2025-present Tommy Xu',
  },
  alias: {
    '@': '/packages/hooks/src',
    '@tx-labs/react-hooks': '/packages/hooks/src/index.ts',
  },
});
