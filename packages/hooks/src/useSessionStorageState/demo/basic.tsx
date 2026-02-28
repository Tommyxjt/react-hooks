/**
 * title: 基础用法
 * description: 三步向导进度（tab 会话内有效）：刷新后仍保留；关闭该 tab 自动清空；不会跨 tab 同步。
 */
import React from 'react';
import { Alert, Button, Space, Steps } from 'antd';
import { useSessionStorageState } from '@tx-labs/react-hooks';

const KEY = 'wizard:step';
const MAX_STEP = 2;

export default function DemoUseSessionStorageStateBasic() {
  const [step, { set, reset }] = useSessionStorageState<number>(KEY, {
    prefix: 'demo',
    schema: 'v1',
    defaultValue: 0,
  });

  const prev = () => {
    set((s) => Math.max(0, s - 1));
  };

  const next = () => {
    set((s) => Math.min(MAX_STEP, s + 1));
  };

  return (
    <Space orientation="vertical" style={{ width: '100%' }} size={12}>
      <Alert
        type="info"
        showIcon
        title="说明"
        description="这个 demo 用 sessionStorage 保存向导进度：刷新页面仍能恢复；关闭该 tab 后会自动清空；新开一个 tab 不会共享进度。"
      />

      <Steps
        current={step}
        items={[{ title: '填写信息' }, { title: '确认内容' }, { title: '完成' }]}
      />

      <Space wrap>
        <Button onClick={prev} disabled={step <= 0}>
          Prev
        </Button>
        <Button type="primary" onClick={next} disabled={step >= MAX_STEP}>
          Next
        </Button>
        <Button onClick={reset}>Reset</Button>
      </Space>
    </Space>
  );
}
