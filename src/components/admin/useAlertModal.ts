import { useState } from 'react';

// 弹窗状态接口定义
export interface AlertModalState {
  isOpen: boolean;
  type: 'success' | 'error' | 'warning';
  title: string;
  message?: string;
  timer?: number;
  showConfirm?: boolean;
}

// 弹窗状态管理hook
export const useAlertModal = () => {
  const [alertModal, setAlertModal] = useState<AlertModalState>({
    isOpen: false,
    type: 'success',
    title: '',
  });

  // 显示弹窗
  const showAlert = (config: Omit<AlertModalState, 'isOpen'>) => {
    setAlertModal({ ...config, isOpen: true });
  };

  // 隐藏弹窗
  const hideAlert = () => {
    setAlertModal((prev) => ({ ...prev, isOpen: false }));
  };

  return { alertModal, showAlert, hideAlert };
};

// 显示错误消息
export const showError = (message: string, showAlert?: (config: Omit<AlertModalState, 'isOpen'>) => void) => {
  if (showAlert) {
    showAlert({ type: 'error', title: '错误', message, showConfirm: true });
  } else {
    console.error(message);
  }
};

// 显示成功消息
export const showSuccess = (message: string, showAlert?: (config: Omit<AlertModalState, 'isOpen'>) => void) => {
  if (showAlert) {
    showAlert({ type: 'success', title: '成功', message, timer: 2000 });
  } else {
    console.log(message);
  }
};
