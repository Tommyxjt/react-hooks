/**
 * title: 跨 tab 登录态同步
 * description: 点击 Login（mock 500ms）写入 token123 到 localStorage。打开两个同源 tab：一个 tab 登录/登出后，另一个 tab 会自动同步并 rerender。
 */
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Space, Typography } from 'antd';
import { useLocalStorageState } from '@tx-labs/react-hooks';

const TOKEN_KEY = 'auth:token';

export default function DemoUseLocalStorageStateCrossTabAuth() {
  const [token, { set, remove }] = useLocalStorageState<string | undefined>(TOKEN_KEY, {
    prefix: 'demo',
    schema: 'v1',
  });

  const [loading, setLoading] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const login = () => {
    if (loading || token) return;

    setLoading(true);

    if (timerRef.current !== null) window.clearTimeout(timerRef.current);

    timerRef.current = window.setTimeout(() => {
      set('token123');
      setLoading(false);
      timerRef.current = null;
    }, 500);
  };

  const logout = () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;

    setLoading(false);
    remove();
  };

  let status = '未登录';
  if (loading) status = '登录中...';
  if (!loading && token) status = '已登录';

  return (
    <Space orientation="vertical" style={{ width: '100%' }} size={12}>
      <Alert
        type="info"
        showIcon
        title="操作说明"
        description="打开两个同源 tab。在任意 tab 点击 Login/Logout，另一个 tab 会自动同步并更新 UI。"
      />

      <Space orientation="vertical" size={6}>
        <Typography.Text>
          状态：<Typography.Text strong>{status}</Typography.Text>
        </Typography.Text>
        <Typography.Text type="secondary">
          token：<Typography.Text code>{token ?? 'null'}</Typography.Text>
        </Typography.Text>
      </Space>

      <Space wrap>
        <Button type="primary" loading={loading} disabled={!!token} onClick={login}>
          Login（mock）
        </Button>
        <Button danger disabled={!token && !loading} onClick={logout}>
          Logout
        </Button>
      </Space>
    </Space>
  );
}
