/**
 * title: 基础用法
 * description: 使用 callback ref 获取 DOM 实例，并把实例作为 state 在界面中声明式展示
 */
import React, { useEffect, useState } from 'react';
import { Alert, Button, Space, Typography } from 'antd';
import { useBoolean, useElementInstance } from '@tx-labs/react-hooks';

const { Paragraph, Text } = Typography;

export default function BasicDemo() {
  const [boxRef, boxElement] = useElementInstance<HTMLDivElement>();
  const [isMounted, { toggle: toggleIsMounted }] = useBoolean(true);
  const [instanceChangeCount, setInstanceChangeCount] = useState(0);

  useEffect(() => {
    setInstanceChangeCount((count) => count + 1);
  }, [boxElement]);

  return (
    <Space orientation="vertical" size={12} style={{ width: '100%' }}>
      <Alert
        type="info"
        showIcon
        title="点击按钮挂载/卸载盒子，useElementInstance 会把实例变化转换成 state。"
      />

      <Button onClick={toggleIsMounted}>{isMounted ? '卸载盒子' : '挂载盒子'}</Button>

      {isMounted ? (
        <div
          ref={boxRef}
          style={{
            width: 320,
            height: 96,
            border: '1px solid #999',
            background:
              'linear-gradient(135deg, rgba(22, 126, 249, 0.2) 0%, rgba(20, 188, 199, 0.2) 100%)',
            borderRadius: 8,
            padding: 12,
            userSelect: 'none',
          }}
        >
          我是一个通过 useElementInstance 管理的 DOM 实例
        </div>
      ) : (
        <Text type="secondary">当前未挂载（实例为 null）</Text>
      )}

      <Paragraph style={{ marginBottom: 0 }}>
        <Text strong>实例变化次数：</Text>
        <Text>{instanceChangeCount}</Text>
      </Paragraph>
    </Space>
  );
}
