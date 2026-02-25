/**
 * title: 基础用法
 * description: 仅保护“打开面板”按钮（单目标白名单）；点击其他任意位置（包括面板内容）都会触发 click-away。
 */
import React, { useRef, useState } from 'react';
import { Alert, Button, Space, Tag, Typography } from 'antd';
import { useClickAway } from '@tx-labs/react-hooks';

const { Paragraph, Text } = Typography;

export default function BasicDemo() {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [closeCount, setCloseCount] = useState(0);

  useClickAway(
    triggerRef,
    (event) => {
      if (!isOpen) {
        return;
      }

      setIsOpen(false);
      setCloseCount((count) => count + 1);

      // 这边 console.log 是展示 event 对象的用法
      // eslint-disable-next-line no-console
      console.log('[useClickAway/basic] click-away triggered:', event.type);
    },
    {
      eventName: 'pointerdown',
    },
  );

  return (
    <Space orientation="vertical" size={12} style={{ width: '100%' }}>
      <Alert
        type="info"
        showIcon
        title="本示例只保护“打开面板”按钮（单目标）。点击其他区域（包括面板内容）会触发 click-away。"
      />

      <Button ref={triggerRef} type="primary" onClick={() => setIsOpen(true)}>
        打开面板
      </Button>

      <Paragraph style={{ marginBottom: 0 }}>
        <Text strong>状态：</Text>
        <Tag color={isOpen ? 'success' : 'default'}>{isOpen ? '已打开' : '已关闭'}</Tag>
      </Paragraph>

      <Paragraph style={{ marginBottom: 0 }}>
        <Text strong>外部关闭次数：</Text>
        <Text>{closeCount}</Text>
      </Paragraph>

      {isOpen ? (
        <div
          ref={panelRef}
          style={{
            border: '1px solid #d9d9d9',
            borderRadius: 8,
            padding: 12,
            background: '#fafafa',
          }}
        >
          <Text strong>面板内容区域（非白名单）</Text>
          <br />
          <Text type="secondary">在 basic 示例里，点击这里也会触发 click-away。</Text>
        </div>
      ) : (
        <Text type="secondary">面板未打开</Text>
      )}
    </Space>
  );
}
