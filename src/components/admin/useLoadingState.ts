import { useState } from 'react';

// 加载状态接口
export interface LoadingState {
  [key: string]: boolean;
}

// 加载状态管理hook
export const useLoadingState = () => {
  const [loadingStates, setLoadingStates] = useState<LoadingState>({});

  // 设置加载状态
  const setLoading = (key: string, loading: boolean) => {
    setLoadingStates((prev) => ({ ...prev, [key]: loading }));
  };

  // 检查是否正在加载
  const isLoading = (key: string) => loadingStates[key] || false;

  // 包装异步操作，自动管理加载状态
  const withLoading = async (
    key: string,
    operation: () => Promise<any>
  ): Promise<any> => {
    setLoading(key, true);
    try {
      const result = await operation();
      return result;
    } finally {
      setLoading(key, false);
    }
  };

  return { loadingStates, setLoading, isLoading, withLoading };
};
