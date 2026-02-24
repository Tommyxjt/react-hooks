/**
 * title: 高级用法
 * description: 演示 document.mousedown 实现点击外部关闭，并通过 isEnabled 动态启停事件订阅
 */

import React, { useMemo, useRef } from 'react';
import { Alert, Button, Divider, Space, Switch, Tag, Typography } from 'antd';
import { useBoolean, useEventListener } from '@tx-labs/react-hooks';

const { Paragraph, Text } = Typography;

export default function AdvancedDemo() {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const triggerButtonRef = useRef<HTMLButtonElement | null>(null);

  const [isPanelOpen, panelOpenActions] = useBoolean(false);
  const [isOutsideClickListeningEnabled, outsideClickListeningActions] = useBoolean(true);

  const documentTarget = useMemo(
    () => (typeof document !== 'undefined' ? document : undefined),
    [],
  );

  useEventListener<MouseEvent>(
    'mousedown',
    (event) => {
      if (!isPanelOpen) {
        return;
      }

      const currentPanel = panelRef.current;
      const currentTriggerButton = triggerButtonRef.current;
      const clickedNode = event.target as Node | null;

      if (!clickedNode) {
        return;
      }

      const isClickInsidePanel = !!currentPanel && currentPanel.contains(clickedNode);

      const isClickOnTriggerButton =
        !!currentTriggerButton && currentTriggerButton.contains(clickedNode);

      // 把触发按钮也视为“内部区域”，避免和按钮 onClick 的 toggle 冲突
      if (isClickInsidePanel || isClickOnTriggerButton) {
        return;
      }

      panelOpenActions.setFalse();
    },
    documentTarget,
    {
      isEnabled: isOutsideClickListeningEnabled,
      useCapture: true,
    },
  );

  return (
    <div
      style={{
        border: '1px solid #f0f0f0',
        borderRadius: 8,
        padding: 12,
        background: '#fff',
      }}
    >
      <Space orientation="vertical" size={12} style={{ width: '100%' }}>
        <Alert
          type="info"
          showIcon
          title="打开面板后，点击面板外部区域会自动关闭（可动态关闭监听）。"
        />

        <Space wrap>
          <Button
            ref={triggerButtonRef}
            type={isPanelOpen ? 'default' : 'primary'}
            onClick={panelOpenActions.toggle}
          >
            {isPanelOpen ? '关闭面板' : '打开面板'}
          </Button>

          <Space size={6}>
            <Text>外部点击监听</Text>
            <Switch
              checked={isOutsideClickListeningEnabled}
              onChange={(checked) => {
                if (checked) {
                  outsideClickListeningActions.setTrue();
                  return;
                }

                outsideClickListeningActions.setFalse();
              }}
            />
          </Space>
        </Space>

        <Space wrap>
          <Tag color={isPanelOpen ? 'blue' : 'default'}>
            面板状态：{isPanelOpen ? '打开' : '关闭'}
          </Tag>
          <Tag color={isOutsideClickListeningEnabled ? 'green' : 'default'}>
            监听状态：{isOutsideClickListeningEnabled ? '启用' : '禁用'}
          </Tag>
        </Space>

        <Divider style={{ margin: '4px 0 0 0' }} />

        <div
          style={{
            border: '1px dashed #d9d9d9',
            borderRadius: 8,
            padding: 16,
            minHeight: 220,
            background: '#fff',
          }}
        >
          <Paragraph style={{ marginTop: 0 }}>
            当前示例通过 <Text code>document.mousedown</Text> 实现“点击外部关闭”， 并通过{' '}
            <Text code>isEnabled</Text> 动态控制是否启用订阅。
          </Paragraph>

          {isPanelOpen ? (
            <div
              ref={panelRef}
              style={{
                marginTop: 8,
                maxWidth: 280,
                border: '1px solid #1677ff',
                borderRadius: 8,
                background: '#f0f7ff',
                padding: 12,
              }}
            >
              <Text strong>弹层面板</Text>
              <Paragraph style={{ marginBottom: 0, marginTop: 8 }}>
                点击这个面板外部区域试试；如果“外部点击监听”处于启用状态，面板会自动关闭。
              </Paragraph>
            </div>
          ) : (
            <Text type="secondary">面板未打开</Text>
          )}
        </div>
      </Space>
    </div>
  );
}
