/**
 * title: 手动拖拽 resize
 * description: 拖拽右下角 resize 手柄，useSize 会实时返回最新的 width / height。
 */
import React, { useRef } from 'react';
import { Alert, Space, Tag, Typography } from 'antd';
import { useSize } from '@tx-labs/react-hooks';

const { Paragraph, Text } = Typography;

export default function ManualResizeDemo() {
  const resizableBoxRef = useRef<HTMLDivElement | null>(null);
  const size = useSize(resizableBoxRef, { effectMode: 'layout' });

  return (
    <Space orientation="vertical" size={12} style={{ width: '100%' }}>
      <Alert
        type="info"
        showIcon
        title="拖拽下方盒子右下角的 resize 手柄，观察 useSize 返回的尺寸变化。"
      />

      <Paragraph style={{ marginBottom: 0 }}>
        <Text strong>measured width：</Text>
        <Tag>{Math.round(size?.width ?? 0)}px</Tag>

        <Text strong style={{ marginLeft: 12 }}>
          measured height：
        </Text>
        <Tag>{Math.round(size?.height ?? 0)}px</Tag>
      </Paragraph>

      <div
        ref={resizableBoxRef}
        style={{
          width: 260,
          height: 140,
          minWidth: 160,
          minHeight: 96,
          maxWidth: 520,
          maxHeight: 320,
          resize: 'both',
          overflow: 'auto',
          border: '1px solid #d9d9d9',
          borderRadius: 8,
          background: '#fafafa',
          padding: 12,
          boxSizing: 'border-box',
        }}
      >
        <Text strong>可拖拽尺寸盒子</Text>
        <br />
        <Text type="secondary">请拖拽右下角手柄（浏览器原生 resize）来改变尺寸。</Text>

        <div
          style={{
            marginTop: 12,
            height: 120,
            borderRadius: 6,
            border: '1px dashed #bfbfbf',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            whiteSpace: 'nowrap',
          }}
        >
          <Text type="secondary">内容区域（用于观察盒子尺寸变化）</Text>
        </div>
      </div>

      <Text type="secondary">
        提示：该示例依赖浏览器对 CSS <Text code>resize</Text> 的支持。
      </Text>
    </Space>
  );
}
