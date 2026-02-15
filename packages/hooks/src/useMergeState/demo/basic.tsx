/**
 * title: 基础用法
 * description: 演示对象 state 的浅合并更新，以及嵌套对象“不会深合并”的表现
 */
import React, { useState } from 'react';
import { Button, Divider, Input, Space, Typography } from 'antd';
import { useMergeState } from '@tx-labs/react-hooks';

interface State {
  count: number;
  text: string;
  nested: {
    a: number;
    b?: number;
  };
}

export default function DemoUseMergeState() {
  const [input, setInput] = useState('');
  const [state, setMergeState] = useMergeState<State>(() => ({
    count: 0,
    text: 'hello',
    nested: { a: 1, b: 100 },
  }));

  return (
    <Space orientation="vertical" style={{ width: '100%' }} size={12}>
      <Typography.Title level={5} style={{ margin: 0 }}>
        useMergeState Demo
      </Typography.Title>

      <Space wrap>
        <Button onClick={() => setMergeState((prev) => ({ count: prev.count + 1 }))}>
          count +1
        </Button>
        <Button onClick={() => setMergeState((prev) => ({ count: prev.count - 1 }))}>
          count -1
        </Button>
        <Button onClick={() => setMergeState({ text: '' })}>清空 text</Button>
      </Space>

      <Space.Compact style={{ width: '100%' }}>
        <Input
          value={input}
          placeholder="输入新的 text，然后点击“更新 text”"
          onChange={(e) => setInput(e.target.value)}
        />
        <Button type="primary" onClick={() => setMergeState({ text: input })}>
          更新 text
        </Button>
      </Space.Compact>

      <Divider style={{ margin: '8px 0' }} />

      <Space wrap>
        <Button onClick={() => setMergeState({ nested: { a: state.nested.a + 1 } })}>
          nested.a +1（浅合并：nested 会整体替换）
        </Button>
        <Button onClick={() => setMergeState({ nested: { a: 1, b: 100 } })}>
          恢复 nested（a=1,b=100）
        </Button>
      </Space>

      <Typography.Text type="secondary">
        注意：useMergeState 只做第一层浅合并，更新 nested 时会把 nested 整体替换，因此如果 patch
        里不带 b，b 会“丢失”。
      </Typography.Text>

      <Divider style={{ margin: '8px 0' }} />

      <Typography.Text strong>当前 state：</Typography.Text>
      <Typography.Paragraph style={{ marginBottom: 0 }}>
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(state, null, 2)}</pre>
      </Typography.Paragraph>
    </Space>
  );
}
