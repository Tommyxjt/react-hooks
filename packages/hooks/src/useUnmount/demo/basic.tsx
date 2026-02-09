/**
 * title: useUnmount 示例
 * description: 演示如何在组件卸载时清除计时器，并通过 message 提示
 */
import React, { useState, useEffect, useRef } from 'react';
import { Button, Space, Typography, message } from 'antd';
import { useBoolean, useUnmount } from '@tx-labs/react-hooks';

const MyComponent = () => {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (timerRef.current !== null) return;
    timerRef.current = setInterval(() => {
      setCount((prev) => prev + 1);
    }, 1000);
  }, []);

  useUnmount(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null; // 清理计时器
    }
    message.info('计时器组件已卸载');
  });

  return <Typography.Text>计时器：{count}</Typography.Text>;
};

export default function DemoUseUnmount() {
  const [state, { toggle }] = useBoolean(true);

  return (
    <Space orientation="vertical">
      {state && <MyComponent />}
      <Button onClick={toggle} danger={state}>
        {state ? '卸载组件' : '挂载组件'}
      </Button>
    </Space>
  );
}
