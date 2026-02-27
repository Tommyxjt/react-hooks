/**
 * title: 基础用法
 * description: 写入 localStorage；提供 set / remove / reset。默认 JSON serializer 下，set(undefined) 等价于 remove（缺省=不存在），状态回退到 defaultValue。
 */
import React, { useMemo } from 'react';
import { Alert, Button, Space, Typography } from 'antd';
import { useStorageState, useForceUpdate } from '@tx-labs/react-hooks';
import { makeStorageKey } from '../utils/makeStorageKey';
import { createInTabSyncer } from './utils/createInTabSyncer';

// demo 只需要同 tab 同步即可（跨 tab 由具体 storage 的能力 + 对应 syncer 决定）
const syncer = createInTabSyncer();

function getLocalStorage() {
  return typeof window === 'undefined' ? null : window.localStorage;
}

export default function DemoUseStorageStateBasic() {
  const forceUpdate = useForceUpdate();

  const key = 'counter';
  const storageKey = useMemo(() => makeStorageKey(key, { prefix: 'demo', schema: 'v1' }), [key]);

  const [value, { set, remove, reset }] = useStorageState<number | undefined>(key, {
    storage: getLocalStorage,
    syncer,
    prefix: 'demo',
    schema: 'v1',
    defaultValue: 0,
    persistDefaultValue: true,
  });

  const stored = getLocalStorage()?.getItem(storageKey);

  return (
    <Space orientation="vertical" style={{ width: '100%' }} size={12}>
      <Alert
        type="info"
        showIcon
        title={
          <div>
            这个 demo 把状态写入 localStorage，并演示 set/remove/reset
            的语义差异。建议打开控制台同步查看 LocalStorage 实际的值.
          </div>
        }
        description={
          <>
            <div>
              1. 默认 JSON serializer 下，<Typography.Text code>set(undefined)</Typography.Text>{' '}
              等价于 <Typography.Text code>remove</Typography.Text>（缺省=不存在）。
            </div>
            <div>
              2. 默认值只是回退，不会自动落盘；开启{' '}
              <Typography.Text code>persistDefaultValue</Typography.Text> 才会在挂载时把缺失项写入
              storage。
            </div>
          </>
        }
      />

      <Space orientation="vertical" size={6}>
        <Typography.Text>
          当前 value：<Typography.Text strong>{String(value)}</Typography.Text>
        </Typography.Text>
        <Typography.Text type="secondary">
          storageKey：<Typography.Text code>{storageKey}</Typography.Text>
        </Typography.Text>
        <Typography.Text type="secondary">
          storage raw：<Typography.Text code>{stored ?? 'null'}</Typography.Text>
        </Typography.Text>
      </Space>

      <Space wrap>
        <Button type="primary" onClick={() => set((v) => (v ?? 0) + 1)}>
          +1
        </Button>
        <Button
          onClick={() => {
            set(undefined);

            // 这边仅为了 Demo 演示 LocalStorage 实时情况，需要触发 render
            forceUpdate();
          }}
        >
          set(undefined)
        </Button>
        <Button
          onClick={() => {
            reset();

            // 这边仅为了 Demo 演示 LocalStorage 实时情况，需要触发 render
            forceUpdate();
          }}
        >
          reset()
        </Button>
        <Button
          danger
          onClick={() => {
            remove();

            // 这边仅为了 Demo 演示 LocalStorage 实时情况，需要触发 render
            forceUpdate();
          }}
        >
          remove()
        </Button>
      </Space>
    </Space>
  );
}
