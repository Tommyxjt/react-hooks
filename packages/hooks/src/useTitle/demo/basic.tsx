/**
 * title: 基础用法
 * description: 设置网页标题
 */
import React, { useState } from 'react';
import useTitle from '..';
import { Button, Space, Alert } from 'antd';

function TitleUpdater() {
  const [title, setTitle] = useState('初始标题');

  useTitle(title);

  return (
    <Space orientation="vertical" size={12}>
      <Alert showIcon title="观察浏览器标签的标题" />
      <Button onClick={() => setTitle('更新标题')}>更新标题</Button>
      <Button danger onClick={() => setTitle('初始标题')}>
        重置为初始标题
      </Button>
    </Space>
  );
}

export default TitleUpdater;
