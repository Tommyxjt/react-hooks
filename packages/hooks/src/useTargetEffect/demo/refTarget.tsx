/**
 * title: DOM 实例变化才触发 effect（ref target / 面板展示）
 * description: 改 props 只 rerender 不替换实例 ⇒ 面板不变；改 key 替换 DOM 实例（ref.current 变化）⇒ 面板会显示 cleanup + attach。
 */
import React, { useRef, useState } from 'react';
import { Alert, Button, Space, Typography } from 'antd';
import { useTargetEffect } from '@tx-labs/react-hooks';

const { Text } = Typography;

type EffectPhase = 'idle' | 'attach' | 'cleanup';

export default function RefTargetDemo() {
  const boxRef = useRef<HTMLDivElement | null>(null);

  // 仅用于演示“rerender 不等于 DOM 实例变化”
  const [bgIndex, setBgIndex] = useState(0);

  // 仅用于演示“DOM 实例真的被替换”
  const [nodeKey, setNodeKey] = useState(0);

  // 面板展示：最后一次 effect 行为
  const [phase, setPhase] = useState<EffectPhase>('idle');
  const [phaseKey, setPhaseKey] = useState<string>('-');
  const [attachCount, setAttachCount] = useState(0);
  const [cleanupCount, setCleanupCount] = useState(0);

  useTargetEffect<HTMLDivElement>(
    (resolvedTarget) => {
      if (!resolvedTarget) {
        return;
      }

      const k = resolvedTarget.getAttribute('data-k') ?? 'unknown';

      setPhase('attach');
      setPhaseKey(k);
      setAttachCount((c) => c + 1);

      return () => {
        setPhase('cleanup');
        setPhaseKey(k);
        setCleanupCount((c) => c + 1);
      };
    },
    boxRef,
    [],
    { effectMode: 'effect' },
  );

  const bg = bgIndex % 2 === 0 ? '#fff7e6' : '#f9f0ff';

  let panel: React.ReactNode;

  if (phase === 'idle') {
    panel = (
      <Alert
        type="info"
        showIcon
        title="等待触发：点击『替换 DOM 实例（改 key）』可以观察 cleanup + attach 的面板变化。"
      />
    );
  } else if (phase === 'attach') {
    panel = <Alert type="success" showIcon title={`Effect attach → key = ${phaseKey}`} />;
  } else {
    panel = <Alert type="warning" showIcon title={`Effect cleanup → key = ${phaseKey}`} />;
  }

  return (
    <Space orientation="vertical" size={12} style={{ width: '100%' }}>
      <Alert
        type="info"
        showIcon
        title="ref target：改样式只 rerender（ref.current 不变）⇒ effect 不重跑；改 key 替换 DOM 实例（ref.current 变化）⇒ cleanup + attach。"
      />

      <Space wrap>
        <Button onClick={() => setBgIndex((v) => v + 1)}>改样式（只 rerender）</Button>
        <Button type="primary" onClick={() => setNodeKey((v) => v + 1)}>
          替换 DOM 实例（改 key）
        </Button>
      </Space>

      {panel}

      <div
        key={nodeKey}
        ref={boxRef}
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
        <div style={{ marginTop: 8 }}>
          <Text type="secondary">
            attach 次数：<Text code>{attachCount}</Text>，cleanup 次数：
            <Text code>{cleanupCount}</Text>
          </Text>
        </div>
      </div>

      <Text type="secondary">
        提示：这里的 target 是 <Text code>ref</Text>，useTargetEffect 内部会比较{' '}
        <Text code>ref.current</Text> 是否真的换了实例。
      </Text>
    </Space>
  );
}
