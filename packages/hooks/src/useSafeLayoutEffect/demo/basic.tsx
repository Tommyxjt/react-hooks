/**
 * title: 基础用法
 * description: 使用 useSafeLayoutEffect 在布局阶段读取元素宽度（浏览器环境下等价于 useLayoutEffect，SSR 下会自动降级）。
 */
import React, { useRef, useState } from 'react';
import { Alert, Button, Space, Tag, Typography } from 'antd';
import { useSafeLayoutEffect } from '@tx-labs/react-hooks';

const { Paragraph, Text } = Typography;

export default function BasicDemo() {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [isLarge, setIsLarge] = useState(false);
  const [measuredWidth, setMeasuredWidth] = useState<number>(0);

  useSafeLayoutEffect(() => {
    const nextWidth = boxRef.current?.offsetWidth ?? 0;

    setMeasuredWidth(nextWidth);

    // eslint-disable-next-line no-console
    console.log('[useSafeLayoutEffect/basic] measured width:', nextWidth);
  }, [isLarge]);

  return (
    <Space orientation="vertical" size={12} style={{ width: '100%' }}>
      <Alert
        type="info"
        showIcon
        title="点击按钮切换盒子宽度，useSafeLayoutEffect 会在布局阶段读取最新宽度（可在控制台查看日志）。"
      />

      <Button type="primary" onClick={() => setIsLarge((value) => !value)}>
        切换宽度
      </Button>

      <Paragraph style={{ marginBottom: 0 }}>
        <Text strong>当前模式：</Text>
        <Tag>{isLarge ? '大尺寸' : '小尺寸'}</Tag>
      </Paragraph>

      <Paragraph style={{ marginBottom: 0 }}>
        <Text strong>测量宽度：</Text>
        <Text>{measuredWidth}px</Text>
      </Paragraph>

      <div
        ref={boxRef}
        style={{
          width: isLarge ? 280 : 160,
          height: 56,
          borderRadius: 8,
          border: '1px solid #d9d9d9',
          background: '#fafafa',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text>可测量盒子</Text>
      </div>
    </Space>
  );
}
