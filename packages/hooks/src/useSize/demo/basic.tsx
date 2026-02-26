/**
 * title: 基础用法
 * description: 观察一个容器的尺寸变化，点击按钮切换宽高后，useSize 会返回最新的 width / height。
 */
import React, { useRef } from 'react';
import { Alert, Button, Space, Typography } from 'antd';
import { useBoolean, useSize } from '@tx-labs/react-hooks';

const { Paragraph, Text } = Typography;

export default function BasicDemo() {
  const boxRef = useRef<HTMLDivElement | null>(null);

  const [isWide, { toggle: toggleWide }] = useBoolean(false);
  const [isTall, { toggle: toggleTall }] = useBoolean(false);

  const size = useSize(boxRef, { effectMode: 'layout' });

  return (
    <Space orientation="vertical" size={12} style={{ width: '100%' }}>
      <Alert type="info" showIcon title="点击按钮切换盒子宽高，观察 useSize 返回的尺寸变化。" />

      <Space wrap>
        <Button onClick={toggleWide}>切换宽度（当前为：{isWide ? '大' : '小'}）</Button>
        <Button onClick={toggleTall}>切换高度（当前为：{isTall ? '高' : '矮'}）</Button>
      </Space>

      <Paragraph style={{ marginBottom: 0 }}>
        <Text strong>measured width：</Text>
        <Text>{size?.width ?? '-'}</Text>
        <Text strong style={{ marginLeft: 16 }}>
          measured height：
        </Text>
        <Text>{size?.height ?? '-'}</Text>
      </Paragraph>

      <div
        ref={boxRef}
        style={{
          width: isWide ? 320 : 180,
          height: isTall ? 180 : 96,
          borderRadius: 8,
          border: '1px solid #d9d9d9',
          background: '#fafafa',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'width 180ms ease, height 180ms ease',
          boxSizing: 'border-box',
        }}
      >
        <Text>被观察的尺寸盒子</Text>
      </div>

      <Text type="secondary">
        提示：本 Hook 观察的是元素尺寸（基于 ResizeObserver），不是 window 尺寸。
      </Text>
    </Space>
  );
}
