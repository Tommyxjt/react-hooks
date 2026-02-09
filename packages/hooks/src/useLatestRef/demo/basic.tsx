/**
 * title: useLatestRef 与 useRef 对照组
 * description: 演示如何避免闭包问题，`useLatestRef` 始终获取最新的值
 */
import React, { useState, useRef } from 'react';
import { Button, Space, Typography } from 'antd';
import { useLatestRef } from '@tx-labs/react-hooks';

export default function DemoUseLatestRef() {
  const [count, setCount] = useState(0);

  // useRef 对照组：每次点击使用最新值
  const countRef = useRef(count);

  // useLatestRef：总是使用最新的值
  const latestCountRef = useLatestRef(count);

  return (
    <Space orientation="vertical" style={{ width: '100%' }} size={12}>
      <Button onClick={() => setCount((prev) => prev + 1)}>增加 count：{count}</Button>
      <Typography.Text type="secondary">当前 count 值：{count}</Typography.Text>
      <Typography.Text>useRef：{countRef.current}</Typography.Text>
      <Typography.Text>useLatestRef：{latestCountRef.current}</Typography.Text>
    </Space>
  );
}
