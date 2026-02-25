/**
 * title: 高级配置
 * description: 演示 listenerContainer（局部监听容器）、isEnabled、eventName 配置；更适合在局部交互区域中使用。
 */
import React, { useRef, useState } from 'react';
import { Alert, Button, Radio, Space, Switch, Tag, Typography } from 'antd';
import type { RadioChangeEvent } from 'antd';
import { useClickAway } from '@tx-labs/react-hooks';

const { Paragraph, Text } = Typography;

type DemoEventName = 'pointerdown' | 'mousedown' | 'click';

export default function AdvancedDemo() {
  const listenerContainerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const [isEnabled, setIsEnabled] = useState(true);
  const [isOpen, setIsOpen] = useState(true);
  const [eventName, setEventName] = useState<DemoEventName>('pointerdown');
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
      console.log('[useClickAway/advanced] click-away triggered:', event.type);
    },
    {
      isEnabled,
      eventName,
      listenerContainer: listenerContainerRef,
    },
  );

  const handleEventNameChange = (event: RadioChangeEvent) => {
    setEventName(event.target.value as DemoEventName);
  };

  return (
    <Space orientation="vertical" size={12} style={{ width: '100%' }}>
      <Alert
        type="info"
        showIcon
        title="本示例只在下方灰色容器内监听 click-away；容器外点击不会触发。"
      />

      <Space wrap>
        <Space size={6}>
          <Text>启用监听</Text>
          <Switch checked={isEnabled} onChange={setIsEnabled} />
        </Space>

        <Button ref={triggerRef} onClick={() => setIsOpen(true)}>
          打开面板
        </Button>
        <Button onClick={() => setIsOpen(false)}>关闭面板</Button>
      </Space>

      <div>
        <Text strong>事件类型：</Text>
        <div style={{ marginTop: 8 }}>
          <Radio.Group value={eventName} onChange={handleEventNameChange}>
            <Radio.Button value="pointerdown">pointerdown</Radio.Button>
            <Radio.Button value="mousedown">mousedown</Radio.Button>
            <Radio.Button value="click">click</Radio.Button>
          </Radio.Group>
        </div>
      </div>

      <Paragraph style={{ marginBottom: 0 }}>
        <Text strong>当前事件：</Text>
        <Tag>{eventName}</Tag>
        <Text strong style={{ marginLeft: 12 }}>
          状态：
        </Text>
        <Tag color={isOpen ? 'success' : 'default'}>{isOpen ? '已打开' : '已关闭'}</Tag>
      </Paragraph>

      <Paragraph style={{ marginBottom: 0 }}>
        <Text strong>外部关闭次数：</Text>
        <Text>{closeCount}</Text>
      </Paragraph>

      <div
        ref={listenerContainerRef}
        style={{
          border: '1px dashed #d9d9d9',
          borderRadius: 8,
          padding: 12,
          background: '#fafafa',
        }}
      >
        <Text strong>局部监听容器（listenerContainer）</Text>
        <br />
        <Text type="secondary">只有在这个区域里发生的事件，才会参与 click-away 判断。</Text>

        <div style={{ marginTop: 12 }}>
          {isOpen ? (
            <div
              ref={panelRef}
              style={{
                border: '1px solid #d9d9d9',
                borderRadius: 8,
                padding: 12,
                background: '#fff',
              }}
            >
              <Text strong>受保护面板</Text>
              <br />
              <Text type="secondary">点击这里内部不会触发 click-away。</Text>
            </div>
          ) : (
            <Text type="secondary">面板未打开</Text>
          )}
        </div>
      </div>
    </Space>
  );
}
