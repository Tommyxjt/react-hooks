import { render, act } from '@testing-library/react';
import React, { useState } from 'react';
import useTitle from '..';

// 用于测试自定义 Hook 的组件包装器
function TestComponent() {
  const [title, setTitle] = useState('初始标题');
  useTitle(title);

  return (
    <div>
      <h1>{title}</h1>
      <button onClick={() => setTitle('更新标题')}>更新标题</button>
    </div>
  );
}

describe('useTitle', () => {
  it('should set the document title to the provided title', () => {
    const { getByText } = render(<TestComponent />);

    // 初始标题
    expect(document.title).toBe('初始标题');

    // 模拟更新标题
    act(() => {
      getByText('更新标题').click();
    });

    // 更新后的标题
    expect(document.title).toBe('更新标题');
  });
});
