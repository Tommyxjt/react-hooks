/**
 * title: 多白名单区域
 * description: 同时保护 trigger + panel 两个区域（常见于下拉/Popover）；点击它们都不会关闭，点击外部才关闭。
 */
import React, { useRef, useState } from 'react';
import { Alert, Button, Space, Tag, Typography } from 'antd';
import { useClickAway } from '@tx-labs/react-hooks';

const { Paragraph, Text } = Typography;

export default function MultipleTargetsDemo() {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [closeCount, setCloseCount] = useState(0);

  useClickAway(
    [triggerRef, panelRef],
    (event) => {
      if (!isOpen) {
        return;
      }

      setIsOpen(false);
      setCloseCount((count) => count + 1);

      // eslint-disable-next-line no-console
      console.log('[useClickAway/multipleTargets] click-away triggered:', event.type);
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
        title="trigger 与 panel 都在白名单中：点击按钮本身或面板内部都不会关闭。"
      />

      <Button ref={triggerRef} type="primary" onClick={() => setIsOpen((open) => !open)}>
        {isOpen ? '关闭面板' : '打开面板'}
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
          <Text strong>Popover 面板（示意）</Text>
          <br />
          <Text type="secondary">
            这里和上面的 trigger 都是白名单区域；点击页面其他地方才会触发 click-away。
          </Text>
        </div>
      ) : (
        <Text type="secondary">面板未打开</Text>
      )}
    </Space>
  );
}
