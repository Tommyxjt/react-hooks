/**
 * title: 配合普通 RefObject
 * description: 合并 useElementInstance 的 callback ref 和普通 useRef，既能响应式更新，也能使用 ref.current
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Space, Typography } from 'antd';
import { useBoolean, useElementInstance } from '@tx-labs/react-hooks';

const { Paragraph, Text } = Typography;

export default function ComposeRefDemo() {
  const [reactiveInputRef, inputElement] = useElementInstance<HTMLInputElement>();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [isMounted, { toggle: toggleIsMounted }] = useBoolean(true);
  const [focusCount, setFocusCount] = useState(0);

  const mergedInputRef = useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node;
      reactiveInputRef(node);
    },
    [reactiveInputRef],
  );

  useEffect(() => {
    if (!inputElement) {
      return;
    }

    // 演示：实例变化后自动聚焦一次（此场景仅有挂载会触发）
    inputElement.focus();
  }, [inputElement]);

  const handleFocusByObjectRef = () => {
    const currentInput = inputRef.current;

    if (!currentInput) {
      return;
    }

    currentInput.focus();
    setFocusCount((count) => count + 1);
  };

  return (
    <Space orientation="vertical" size={12} style={{ width: '100%' }}>
      <Alert
        showIcon
        title="这个示例演示如何把 callback ref 和普通 RefObject 合并使用。"
        description="实例挂载后自动聚焦一次"
      />

      <Space>
        <Button onClick={toggleIsMounted}>{isMounted ? '卸载输入框' : '挂载输入框'}</Button>
        <Button onClick={handleFocusByObjectRef} disabled={!inputRef.current}>
          使用 inputRef.current 聚焦
        </Button>
      </Space>

      {isMounted ? (
        <input
          ref={mergedInputRef}
          placeholder="我同时绑定了 callback ref 和 object ref"
          style={{
            width: 320,
            height: 36,
            padding: '0 12px',
            border: '1px solid #d9d9d9',
            borderRadius: 6,
            outline: 'none',
          }}
          onFocus={(event) => {
            const el = event.currentTarget;
            el.style.borderColor = '#1677ff';
            el.style.boxShadow = '0 0 0 2px rgba(5,145,255,0.1)';
          }}
          onBlur={(event) => {
            const el = event.currentTarget;
            el.style.borderColor = '#d9d9d9';
            el.style.boxShadow = 'none';
          }}
        />
      ) : (
        <Text type="secondary">当前未挂载</Text>
      )}

      <Paragraph style={{ marginBottom: 0 }}>
        <Text strong>inputRef.current 是否可用：</Text>
        <Text>{inputRef.current ? '可用' : '不可用'}</Text>
      </Paragraph>

      <Paragraph style={{ marginBottom: 0 }}>
        <Text strong>手动聚焦次数：</Text>
        <Text>{focusCount}</Text>
      </Paragraph>
    </Space>
  );
}
