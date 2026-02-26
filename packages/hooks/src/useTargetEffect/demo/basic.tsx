/**
 * title: DOM 实例变化才触发 effect（direct target / DOM API 获取）
 * description: 改 props 只 rerender 不替换实例 ⇒ 不会弹 message；改 key 替换 DOM 实例 ⇒ 会触发 cleanup + attach 的 message。
 */
import React, { useLayoutEffect, useState } from 'react';
import { Alert, Button, Space, Typography, message } from 'antd';
import { useTargetEffect } from '@tx-labs/react-hooks';

const { Text } = Typography;

export default function BasicDemo() {
  const [messageApi, contextHolder] = message.useMessage();

  // 仅用于演示“rerender 不等于 DOM 实例变化”
  const [bgIndex, setBgIndex] = useState(0);

  // 仅用于演示“DOM 实例真的被替换”
  const [nodeKey, setNodeKey] = useState(0);

  /**
   * direct target：通过普通 DOM API 获取到的元素实例（不依赖 useElementInstance）
   */
  const [targetElement, setTargetElement] = useState<HTMLDivElement | null>(null);

  /**
   * 在 commit 后查询真实 DOM（否则 render 期间可能拿不到新实例）
   * - nodeKey 变化时，DOM 实例会被替换
   * - query 得到的新实例写入 state，从而驱动 useTargetEffect 重跑
   */
  useLayoutEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const next = document.getElementById('use-target-effect-basic-demo') as HTMLDivElement | null;

    setTargetElement((prev) => (prev === next ? prev : next));
  }, [nodeKey]);

  useTargetEffect<HTMLDivElement>(
    (resolvedTarget) => {
      if (!resolvedTarget) {
        return;
      }

      const k = resolvedTarget.getAttribute('data-k') ?? 'unknown';
      messageApi.success(`Effect 挂载 → key = ${k}`);

      return () => {
        messageApi.error(`Effect 清理函数运行 → key = ${k}`);
      };
    },
    targetElement,
    [],
    { effectMode: 'effect' },
  );

  const bg = bgIndex % 2 === 0 ? '#f6ffed' : '#e6f7ff';

  return (
    <Space orientation="vertical" size={12} style={{ width: '100%' }}>
      {contextHolder}

      <Alert
        type="info"
        showIcon
        title="点『改样式』不会触发 effect；点『替换 DOM 实例』会触发 cleanup + attach。"
      />

      <Space wrap>
        <Button onClick={() => setBgIndex((v) => v + 1)}>改样式（只 rerender）</Button>
        <Button type="primary" onClick={() => setNodeKey((v) => v + 1)}>
          替换 DOM 实例（改 key）
        </Button>
      </Space>

      <div
        key={nodeKey}
        id="use-target-effect-basic-demo"
        data-k={String(nodeKey)}
        style={{
          padding: 12,
          borderRadius: 8,
          border: '1px solid #d9d9d9',
          background: bg,
          userSelect: 'none',
        }}
      >
        <Text>
          当前 DOM instance key = <Text code>{nodeKey}</Text>
        </Text>
      </div>

      <Text type="secondary">
        提示：这里的 target 来自 <Text code>document.getElementById</Text>，不是 ref。
      </Text>
    </Space>
  );
}
