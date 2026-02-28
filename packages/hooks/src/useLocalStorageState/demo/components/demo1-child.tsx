import React from 'react';
import { Alert, Space, Typography } from 'antd';
import { useLocalStorageState } from '@tx-labs/react-hooks';

type Theme = 'light' | 'dark';

function ThemePreviewInner({ storageKey }: { storageKey: string }) {
  const [theme] = useLocalStorageState<Theme>(storageKey, {
    prefix: 'demo',
    schema: 'v1',
    defaultValue: 'light',
  });

  let label = 'Light';
  let alertType: 'success' | 'warning' = 'success';

  if (theme === 'dark') {
    label = 'Dark';
    alertType = 'warning';
  }

  return (
    <Space orientation="vertical" style={{ width: '100%' }} size={6}>
      <Typography.Text strong>预览（子组件：独立实例）</Typography.Text>
      <Alert
        type={alertType}
        showIcon
        title={`当前主题：${label}`}
        description="这里没有从父组件传入 value，仅依赖同 key 的多实例同步。"
      />
    </Space>
  );
}

export default React.memo(ThemePreviewInner);
