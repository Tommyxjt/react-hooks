/**
 * title: 基础用法
 * description: 监听页面可见状态变化，并在切换时输出 console.log（更适合观察 hidden/visible 切换）
 */
import React, { useEffect } from 'react';
import { Alert, Space, Tag, Typography } from 'antd';
import { useDocumentVisibility } from '@tx-labs/react-hooks';

const { Paragraph, Text } = Typography;

export default function BasicDemo() {
  const documentVisibilityState = useDocumentVisibility();

  useEffect(() => {
    if (!documentVisibilityState) {
      return;
    }

    // 切换标签页/窗口时，在控制台观察状态变化更直观
    // eslint-disable-next-line no-console
    console.log('[useDocumentVisibility]', documentVisibilityState);
  }, [documentVisibilityState]);

  return (
    <Space orientation="vertical" size={12} style={{ width: '100%' }}>
      <Alert
        type="info"
        showIcon
        title="请打开控制台后切换浏览器标签页，再切回当前页面查看日志输出。"
      />

      <Paragraph style={{ marginBottom: 0 }}>
        <Text strong>当前状态：</Text>
        <Tag color={documentVisibilityState === 'visible' ? 'success' : 'default'}>
          {documentVisibilityState ?? 'undefined'}
        </Tag>
      </Paragraph>

      <Text type="secondary">
        提示：该示例底层监听的是 <Text code>document</Text> 的 <Text code>visibilitychange</Text>{' '}
        事件。
      </Text>
    </Space>
  );
}
