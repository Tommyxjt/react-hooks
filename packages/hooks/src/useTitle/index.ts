import { useEffect } from 'react';

/** useTitle: 动态设置网页的标题 */
function useTitle(title: string) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}

export default useTitle;
