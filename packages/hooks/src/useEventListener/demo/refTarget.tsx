/**
 * title: 监听 ref 元素
 * description: 监听 ref.current 指向的滚动容器 scroll 事件，演示 target 为 ref 的场景与 ref 初始为空时的安全处理
 */
import React, { useRef, useState } from 'react';
import { Card, Col, Row, Space, Statistic, Typography } from 'antd';
import { useEventListener } from '@tx-labs/react-hooks';

const { Paragraph, Text } = Typography;

export default function RefTargetDemo() {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const [scrollTopValue, setScrollTopValue] = useState(0);
  const [scrollLeftValue, setScrollLeftValue] = useState(0);

  useEventListener<Event>(
    'scroll',
    () => {
      const currentContainer = scrollContainerRef.current;
      if (!currentContainer) {
        return;
      }

      setScrollTopValue(currentContainer.scrollTop);
      setScrollLeftValue(currentContainer.scrollLeft);
    },
    scrollContainerRef,
    {
      isPassive: true,
    },
  );

  return (
    <Space orientation="vertical" size={12} style={{ width: '100%' }}>
      <Paragraph style={{ marginBottom: 0 }}>
        下面这个区域是一个原生滚动容器，监听目标是 <Text code>ref.current</Text>，不是{' '}
        <Text code>window</Text>。
      </Paragraph>

      <div
        ref={scrollContainerRef}
        style={{
          width: 320,
          height: 180,
          overflow: 'auto',
          border: '1px solid #d9d9d9',
          borderRadius: 8,
          background: '#fff',
        }}
      >
        <div
          style={{
            width: 720,
            height: 460,
            padding: 16,
            boxSizing: 'border-box',
            background: 'linear-gradient(135deg, rgba(24,144,255,0.08), rgba(82,196,26,0.08))',
          }}
        >
          <p style={{ marginTop: 0 }}>试着横向 / 纵向滚动这个区域。</p>
          <p>useEventListener 会自动处理绑定与解绑。</p>
          <p>
            当 <Text code>ref.current</Text> 还没挂载时会跳过绑定；挂载后自动生效。
          </p>
        </div>
      </div>

      <Row gutter={12}>
        <Col span={12}>
          <Card size="small">
            <Statistic title="scrollTop" value={Math.round(scrollTopValue)} />
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small">
            <Statistic title="scrollLeft" value={Math.round(scrollLeftValue)} />
          </Card>
        </Col>
      </Row>
    </Space>
  );
}
