/**
 * title: 同 tab 多实例同步
 * description: 父子组件各自调用 useLocalStorageState（子组件不接收 value）。父组件切换主题后，子组件会通过同 key 的同步机制自动更新。
 */
import React from 'react';
import { Alert, Radio, Space, Typography } from 'antd';
import type { RadioChangeEvent } from 'antd';
import { useLocalStorageState } from '@tx-labs/react-hooks';
import Child from './components/demo1-child';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'pref:theme';

export default function DemoUseLocalStorageStateInTabMulti() {
  const [theme, { set }] = useLocalStorageState<Theme>(STORAGE_KEY, {
    prefix: 'demo',
    schema: 'v1',
    defaultValue: 'light',
  });

  const onChange = (e: RadioChangeEvent) => {
    set(e.target.value as Theme);
  };

  return (
    <Space orientation="vertical" style={{ width: '100%' }} size={12}>
      <Alert
        type="info"
        showIcon
        title="说明"
        description="子组件没有接收父组件的 value，而是自己用同一个 key 读取并同步。适用于“全局偏好设置”这类跨组件/跨路由共享数据。"
      />

      <Space orientation="vertical" size={6}>
        <Typography.Text strong>设置（父组件）</Typography.Text>
        <Radio.Group value={theme} onChange={onChange}>
          <Radio.Button value="light">Light</Radio.Button>
          <Radio.Button value="dark">Dark</Radio.Button>
        </Radio.Group>
      </Space>

      <Child storageKey={STORAGE_KEY} />
    </Space>
  );
}
