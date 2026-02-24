/**
 * title: 基础用法
 * description: 监听 window.keydown，演示 useEventListener 的基础订阅行为（自动绑定、自动解绑、handler 始终最新）
 */
import React, { useMemo, useState } from 'react';
import { Alert, Space, Tag, Typography } from 'antd';
import { useEventListener } from '@tx-labs/react-hooks';

const { Paragraph, Text } = Typography;

export default function BasicDemo() {
  const [pressedKeys, setPressedKeys] = useState<string[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // SSR 安全：非浏览器环境下传 undefined，Hook 内部会自动跳过绑定
  const windowTarget = useMemo(() => (typeof window !== 'undefined' ? window : undefined), []);

  useEventListener<KeyboardEvent>(
    'keydown',
    (event) => {
      setTotalCount((count) => count + 1);

      setPressedKeys((previousKeys) => {
        const nextKeys = [event.key, ...previousKeys];
        return nextKeys.slice(0, 8);
      });
    },
    windowTarget,
    {
      effectMode: 'effect',
    },
  );

  return (
    <Space orientation="vertical" size={12} style={{ width: '100%' }}>
      <Alert
        type="info"
        showIcon
        title="在页面任意位置按键，下面会记录最近按下的按键（最多保留 8 个）。"
      />

      <Paragraph style={{ marginBottom: 0 }}>
        <Text strong>总触发次数：</Text>
        <Text>{totalCount}</Text>
      </Paragraph>

      <div>
        <Text strong>最近按键：</Text>
        <div style={{ marginTop: 8 }}>
          {pressedKeys.length > 0 ? (
            <Space size={[6, 6]} wrap>
              {pressedKeys.map((keyName, index) => (
                <Tag key={`${keyName}-${index}`}>{keyName}</Tag>
              ))}
            </Space>
          ) : (
            <Text type="secondary">暂无</Text>
          )}
        </div>
      </div>

      <Text type="secondary">
        提示：该示例监听的是 <Text code>window</Text> 的 <Text code>keydown</Text> 事件。
      </Text>
    </Space>
  );
}
