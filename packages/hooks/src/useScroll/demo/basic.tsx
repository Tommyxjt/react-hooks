/**
 * title: 基础用法
 * description: 监听可滚动容器的 scroll，实时展示当前滚动位置（x / y）。
 */
import React, { useRef } from 'react';
import { Alert, Button, Space, Typography } from 'antd';
import { useScroll } from '@tx-labs/react-hooks';

const { Paragraph, Text } = Typography;

export default function BasicDemo() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollPosition = useScroll(containerRef);

  const scrollToTopLeft = () => {
    const container = containerRef.current;
    if (!container) return;

    container.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  };

  const scrollToMiddle = () => {
    const container = containerRef.current;
    if (!container) return;

    const maxLeft = Math.max(container.scrollWidth - container.clientWidth, 0);
    const maxTop = Math.max(container.scrollHeight - container.clientHeight, 0);

    container.scrollTo({
      left: Math.floor(maxLeft / 2),
      top: Math.floor(maxTop / 2),
      behavior: 'smooth',
    });
  };

  const scrollToBottomRight = () => {
    const container = containerRef.current;
    if (!container) return;

    const maxLeft = Math.max(container.scrollWidth - container.clientWidth, 0);
    const maxTop = Math.max(container.scrollHeight - container.clientHeight, 0);

    container.scrollTo({
      left: maxLeft,
      top: maxTop,
      behavior: 'smooth',
    });
  };

  return (
    <Space orientation="vertical" size={12} style={{ width: '100%' }}>
      <Alert
        type="info"
        showIcon
        title="滚动下方容器，观察 x / y 变化。也可以点击按钮触发程序化滚动。"
      />

      <Space wrap>
        <Button onClick={scrollToTopLeft}>滚动到左上角</Button>
        <Button onClick={scrollToMiddle}>滚动到中间</Button>
        <Button type="primary" onClick={scrollToBottomRight}>
          滚动到右下角
        </Button>
      </Space>

      <Paragraph style={{ marginBottom: 0 }}>
        <Text strong>scrollX：</Text>
        <Text>{scrollPosition?.x ?? '-'}</Text>
        <Text strong style={{ marginLeft: 16 }}>
          scrollY：
        </Text>
        <Text>{scrollPosition?.y ?? '-'}</Text>
      </Paragraph>

      <div
        ref={containerRef}
        style={{
          width: 320,
          height: 180,
          overflow: 'auto',
          border: '1px solid #d9d9d9',
          borderRadius: 8,
          background: '#fafafa',
        }}
      >
        {/* 明确尺寸的滚动画布：背景会完整覆盖可滚动区域 */}
        <div
          style={{
            width: 720,
            height: 760,
            padding: 12,
            boxSizing: 'border-box',
            background:
              'linear-gradient(135deg, rgba(24,144,255,0.08) 0%, rgba(82,196,26,0.08) 100%)',
          }}
        >
          <Text strong>可滚动内容区域</Text>
          <br />
          <Text type="secondary">
            拖动滚动条后，useScroll 会返回当前容器的 scrollLeft / scrollTop。
          </Text>

          <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
            {Array.from({ length: 10 }).map((_, index) => (
              <div
                // eslint-disable-next-line react/no-array-index-key
                key={index}
                style={{
                  width: 280 + (index % 4) * 90,
                  height: 56,
                  borderRadius: 6,
                  border: '1px dashed #bfbfbf',
                  display: 'flex',
                  alignItems: 'center',
                  paddingInline: 12,
                  background: '#fff',
                  boxSizing: 'border-box',
                }}
              >
                <Text>内容块 {index + 1}</Text>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 24,
              width: 640,
              height: 260,
              borderRadius: 8,
              border: '1px solid #d9d9d9',
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text type="secondary">右下角区域（用于验证 max scroll）</Text>
          </div>
        </div>
      </div>
    </Space>
  );
}
