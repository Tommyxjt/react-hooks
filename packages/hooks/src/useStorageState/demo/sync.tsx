/**
 * title: 同 tab 同步
 * description: 两个组件使用同一个 key；A set 后会 emit 通知订阅者，B 的 state 会自动对齐。外部仅 useEffect([value]) 即可做轻量监听。
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Input, Space, Typography } from 'antd';
import { useStorageState } from '@tx-labs/react-hooks';
import { makeStorageKey } from '../utils/makeStorageKey';
import { createInTabSyncer } from './utils/createInTabSyncer';

const syncer = createInTabSyncer();

function getLocalStorage() {
  return typeof window === 'undefined' ? null : window.localStorage;
}

function Editor({ k }: { k: string }) {
  const [value, { set }] = useStorageState<string>(k, {
    storage: getLocalStorage,
    syncer,
    prefix: 'demo',
    schema: 'v1',
    defaultValue: '',
  });

  return (
    <Space orientation="vertical" style={{ width: '100%' }} size={6}>
      <Typography.Text strong>Panel A（编辑）</Typography.Text>
      <Input
        placeholder="输入内容（写入 localStorage）"
        value={value}
        onChange={(e) => set(e.target.value)}
      />
      <Typography.Text type="secondary">
        当前 value：<Typography.Text code>{value || '""'}</Typography.Text>
      </Typography.Text>
    </Space>
  );
}

function Viewer({ k }: { k: string }) {
  const [value] = useStorageState<string>(k, {
    storage: getLocalStorage,
    syncer,
    prefix: 'demo',
    schema: 'v1',
    defaultValue: '',
  });

  return (
    <Space orientation="vertical" style={{ width: '100%' }} size={6}>
      <Typography.Text strong>Panel B（只读）</Typography.Text>
      <Typography.Text>
        同步后的 value：<Typography.Text code>{value || '""'}</Typography.Text>
      </Typography.Text>
    </Space>
  );
}

function Observer({ value }: { value: string }) {
  const [times, setTimes] = useState(0);

  useEffect(() => {
    setTimes((n) => n + 1);
  }, [value]);

  return (
    <Typography.Text type="secondary">
      Observer：仅用 <Typography.Text code>useEffect([value])</Typography.Text> 监听，已触发 {times}{' '}
      次
    </Typography.Text>
  );
}

export default function DemoUseStorageStateSync() {
  const key = 'shared-text';
  const storageKey = useMemo(() => makeStorageKey(key, { prefix: 'demo', schema: 'v1' }), [key]);

  const [value] = useStorageState<string>(key, {
    storage: getLocalStorage,
    syncer,
    prefix: 'demo',
    schema: 'v1',
    defaultValue: '',
  });

  const stored = getLocalStorage()?.getItem(storageKey);

  return (
    <Space orientation="vertical" style={{ width: '100%' }} size={12}>
      <Alert
        type="info"
        showIcon
        title="提示"
        description={
          <>
            <div>
              Panel A / B 使用同一个 key。A 写入后会 emit，同 tab 的订阅者会自动对齐 state。
            </div>
            <div>
              因为 Hook 内置订阅保证 state 对齐，外部只要{' '}
              <Typography.Text code>useEffect([value])</Typography.Text> 就能做轻量监控。
            </div>
          </>
        }
      />

      <Space orientation="vertical" size={6}>
        <Typography.Text type="secondary">
          storageKey：<Typography.Text code>{storageKey}</Typography.Text>
        </Typography.Text>
        <Typography.Text type="secondary">
          storage raw：<Typography.Text code>{stored ?? 'null'}</Typography.Text>
        </Typography.Text>
        <Observer value={value} />
      </Space>

      <Space align="start" style={{ width: '100%' }} size={16}>
        <div style={{ flex: 1 }}>
          <Editor k={key} />
        </div>
        <div style={{ flex: 1 }}>
          <Viewer k={key} />
        </div>
      </Space>
    </Space>
  );
}
