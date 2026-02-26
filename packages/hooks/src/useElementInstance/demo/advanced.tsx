/**
 * title: 高级用法
 * description: 配合 key 替换节点，观察“同一位置不同实例”时 elementInstance 的更新行为
 */
import React, { useEffect, useState } from 'react';
import { Alert, Radio, Space, Typography } from 'antd';
import type { RadioChangeEvent } from 'antd';
import { useElementInstance } from '@tx-labs/react-hooks';

const { Paragraph, Text } = Typography;

type BoxVariant = 'A' | 'B';

export default function AdvancedDemo() {
  const [boxRef, boxElement] = useElementInstance<HTMLDivElement>();
  const [boxVariant, setBoxVariant] = useState<BoxVariant>('A');
  const [instanceChangeCount, setInstanceChangeCount] = useState(0);

  useEffect(() => {
    setInstanceChangeCount((count) => count + 1);
  }, [boxElement]);

  const handleVariantChange = (event: RadioChangeEvent) => {
    setBoxVariant(event.target.value as BoxVariant);
  };

  return (
    <Space orientation="vertical" size={12} style={{ width: '100%' }}>
      <Alert
        type="info"
        showIcon
        title="切换 key 会替换节点实例，useElementInstance 返回的 elementInstance 也会同步更新。"
      />

      <Radio.Group value={boxVariant} onChange={handleVariantChange}>
        <Radio.Button value="A">实例 A</Radio.Button>
        <Radio.Button value="B">实例 B</Radio.Button>
      </Radio.Group>

      <div
        key={boxVariant}
        ref={boxRef}
        style={{
          width: 320,
          height: 96,
          border: '1px solid #999',
          background:
            'linear-gradient(135deg, rgba(22, 126, 249, 0.2) 0%, rgba(20, 188, 199, 0.2) 100%)',
          borderRadius: 8,
          padding: 12,
          userSelect: 'none',
        }}
      >
        当前实例 key：{boxVariant}
      </div>

      <Paragraph style={{ marginBottom: 0 }}>
        <Text strong>实例变化次数：</Text>
        <Text>{instanceChangeCount}</Text>
      </Paragraph>

      <Text type="secondary">
        提示：当 <Text code>key</Text> 改变时，即使视觉位置相同，React 也会替换实例。
      </Text>
    </Space>
  );
}
