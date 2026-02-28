/**
 * title: 基础用法（跨 tab 同步）
 * description: 使用 cookie 存 token，并开启 BroadcastChannel 信号。打开两个同源 tab：任一 tab 登录/登出后，另一 tab 会立即同步并更新 UI（无需等待下一次请求/交互）。
 */
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Space, Typography } from 'antd';
import { useCookieState } from '@tx-labs/react-hooks';

const KEY = 'auth:token';
const CHANNEL = 'demo:cookie-signal';

export default function DemoUseCookieStateBasic() {
  const [token, { set, remove }] = useCookieState<string | undefined>(KEY, {
    prefix: 'demo',
    schema: 'v1',
    signal: 'broadcast',
    signalChannelName: CHANNEL,
    cookie: {
      sameSite: 'Lax',
    },
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
        description={
          <>
            <div>
              打开两个同源 tab。任意 tab 点击 Login/Logout，另一个 tab 会立即同步并更新 UI。
            </div>
            <div>
              提示：HttpOnly cookie 不在本 Hook 能力范围内（JS 读写不到），本 demo 演示的是
              document.cookie 可读写的 cookie。
            </div>
          </>
        }
      />

      <Space orientation="vertical" size={6}>
        <Typography.Text>
          状态：<Typography.Text strong>{status}</Typography.Text>
        </Typography.Text>
        <Typography.Text type="secondary">
          token：<Typography.Text code>{token ?? 'null'}</Typography.Text>
        </Typography.Text>
        <Typography.Text type="secondary">
          signalChannelName：<Typography.Text code>{CHANNEL}</Typography.Text>
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
