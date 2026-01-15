// SSEComponent.jsx
import React, { useState, useEffect, useRef } from 'react';

const SSEComponent = () => {
  const [messages, setMessages] = useState('');
  const [status, setStatus] = useState('未连接');
  const eventSourceRef = useRef(null);

  // 连接 SSE
  const connectSSE = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setStatus('连接中...');

    // 创建 EventSource 连接
    eventSourceRef.current = new EventSource('http://10.77.69.69:9999/api/sse/stream');

    // 监听消息事件
    eventSourceRef.current.onmessage = (event) => {
      console.log('event', event);
      const data = JSON.parse(event.data);
      setMessages(event);
    };

    // 监听自定义事件
    // eventSourceRef.current.addEventListener('customEvent', (event) => {
    //   const data = JSON.parse(event.data);
    //   setMessages((prev) => [
    //     ...prev,
    //     {
    //       id: Date.now(),
    //       time: new Date().toLocaleTimeString(),
    //       text: `自定义事件: ${data.customData}`,
    //     },
    //   ]);
    // });

    // 连接打开
    eventSourceRef.current.onopen = () => {
      setStatus('已连接');
    };

    // 错误处理
    eventSourceRef.current.onerror = (error) => {
      console.error('SSE 错误:', error);
      setStatus('连接错误');
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  };

  // 断开连接
  const disconnectSSE = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setStatus('已断开');
    }
  };

  // 清空消息
  const clearMessages = () => {
    setMessages('');
  };

  // 组件卸载时断开连接
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h1>SSE 实时消息示例</h1>

      <div style={{ marginBottom: '20px' }}>
        <button onClick={connectSSE} style={{ marginRight: '10px', padding: '8px 16px' }}>
          连接 SSE
        </button>

        <button onClick={disconnectSSE} style={{ marginRight: '10px', padding: '8px 16px' }}>
          断开连接
        </button>

        <button onClick={clearMessages} style={{ padding: '8px 16px' }}>
          清空消息
        </button>

        <div style={{ marginTop: '10px' }}>
          状态: <strong>{status}</strong>
        </div>
      </div>

      <div
        style={{
          border: '1px solid #ccc',
          padding: '10px',
          height: '300px',
          overflowY: 'auto',
          backgroundColor: '#f5f5f5',
        }}
      >
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#999' }}>暂无消息</div>
        ) : (
          // messages.map((msg) => (
          <div
            style={{
              padding: '8px',
              margin: '5px 0',
              backgroundColor: 'white',
              borderLeft: '4px solid #007bff',
              borderRadius: '4px',
            }}
          >
            <div>{messages}</div>
          </div>
          // ))
        )}
      </div>
    </div>
  );
};

export default SSEComponent;
