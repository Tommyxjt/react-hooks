/**
 * title: 基础用法
 * description: 跳过首次渲染；只有 value 更新时才触发副作用，并在下一次更新前/卸载时执行 cleanup
 */
import React, { useState } from 'react';
import { Alert, Button, Input, Space, Typography, message } from 'antd';
import { useUpdateEffect } from '@tx-labs/react-hooks';

function Panel() {
  const [value, setValue] = useState('Hello');
  const [renderCount, setRenderCount] = useState(0);

  useUpdateEffect(() => {
    setRenderCount((n) => n + 1);
    message.success(`useUpdateEffect 触发：value = ${value}`);

    // cleanup：在下一次 value 变化前，或组件卸载时执行
    return () => {
      message.info(`cleanup：上一轮 value = ${value}`);
    };
  }, [value]);

  return (
    <Space orientation="vertical" style={{ width: '100%' }} size={12}>
      <Space orientation="vertical" style={{ width: '100%' }} size={8}>
        <Typography.Text>当前 value：{value}</Typography.Text>
        <Typography.Text type="secondary">触发次数（不含首次渲染）：{renderCount}</Typography.Text>
      </Space>

      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="修改 value（首次渲染不会触发副作用）"
        allowClear
      />
    </Space>
  );
}

export default function DemoUseUpdateEffectBasic() {
  const [mounted, setMounted] = useState(true);

  return (
    <Space orientation="vertical" style={{ width: '100%' }} size={12}>
      <Alert
        type="info"
        showIcon
        title="操作：首次进入不会弹出 message；修改输入框才会触发。点击“卸载组件”可看到最后一次 cleanup 的 message。"
      />

      <Button danger={mounted} onClick={() => setMounted((m) => !m)}>
        {mounted ? '卸载组件' : '挂载组件'}
      </Button>

      {mounted ? <Panel /> : <Typography.Text type="secondary">组件已卸载</Typography.Text>}
    </Space>
  );
}
