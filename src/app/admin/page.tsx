/* eslint-disable @typescript-eslint/no-explicit-any, no-console, @typescript-eslint/no-non-null-assertion,react-hooks/exhaustive-deps,@typescript-eslint/no-empty-function */

'use client';

import {
  closestCenter,
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from '@dnd-kit/modifiers';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  AlertCircle,
  AlertTriangle,
  Bot,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Database,
  ExternalLink,
  FileText,
  FolderOpen,
  Settings,
  Trash2,
  Tv,
  Users,
  Video,
} from 'lucide-react';
import { GripVertical } from 'lucide-react';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { AdminConfig, AdminConfigResult } from '@/lib/admin.types';
import { getAuthInfoFromBrowserCookie } from '@/lib/auth';

import DataMigration from '@/components/DataMigration';
import PageLayout from '@/components/PageLayout';
import ExternalAIConfigComponent from '@/components/AIConfigComponent';

// 统一按钮样式系统
const buttonStyles = {
  // 主要操作按钮（蓝色）- 用于配置、设置、确认等
  primary: 'px-3 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg transition-colors',
  // 成功操作按钮（绿色）- 用于添加、启用、保存等
  success: 'px-3 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg transition-colors',
  // 危险操作按钮（红色）- 用于删除、禁用、重置等
  danger: 'px-3 py-1.5 text-sm font-medium bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded-lg transition-colors',
  // 次要操作按钮（灰色）- 用于取消、关闭等
  secondary: 'px-3 py-1.5 text-sm font-medium bg-gray-600 hover:bg-gray-700 dark:bg-gray-600 dark:hover:bg-gray-700 text-white rounded-lg transition-colors',
  // 警告操作按钮（黄色）- 用于批量禁用等
  warning: 'px-3 py-1.5 text-sm font-medium bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white rounded-lg transition-colors',
  // 小尺寸主要按钮
  primarySmall: 'px-2 py-1 text-xs font-medium bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-md transition-colors',
  // 小尺寸成功按钮
  successSmall: 'px-2 py-1 text-xs font-medium bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-md transition-colors',
  // 小尺寸危险按钮
  dangerSmall: 'px-2 py-1 text-xs font-medium bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded-md transition-colors',
  // 小尺寸次要按钮
  secondarySmall: 'px-2 py-1 text-xs font-medium bg-gray-600 hover:bg-gray-700 dark:bg-gray-600 dark:hover:bg-gray-700 text-white rounded-md transition-colors',
  // 小尺寸警告按钮
  warningSmall: 'px-2 py-1 text-xs font-medium bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white rounded-md transition-colors',
  // 圆角小按钮（用于表格操作等）
  roundedPrimary: 'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 dark:text-blue-200 transition-colors',
  roundedSuccess: 'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/40 dark:hover:bg-green-900/60 dark:text-green-200 transition-colors',
  roundedDanger: 'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/40 dark:hover:bg-red-900/60 dark:text-red-200 transition-colors',
  roundedSecondary: 'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-700/40 dark:hover:bg-gray-700/60 dark:text-gray-200 transition-colors',
  roundedWarning: 'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/40 dark:hover:bg-yellow-900/60 dark:text-yellow-200 transition-colors',
  roundedPurple: 'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-900/40 dark:hover:bg-purple-900/60 dark:text-purple-200 transition-colors',
  // 禁用状态
  disabled: 'px-3 py-1.5 text-sm font-medium bg-gray-400 dark:bg-gray-600 cursor-not-allowed text-white rounded-lg transition-colors',
  disabledSmall: 'px-2 py-1 text-xs font-medium bg-gray-400 dark:bg-gray-600 cursor-not-allowed text-white rounded-md transition-colors',
  // 开关按钮样式
  toggleOn: 'bg-blue-600 dark:bg-blue-600',
  toggleOff: 'bg-gray-200 dark:bg-gray-700',
  toggleThumb: 'bg-white',
  toggleThumbOn: 'translate-x-6',
  toggleThumbOff: 'translate-x-1',
  // 快速操作按钮样式
  quickAction: 'px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors',
};

// 通用弹窗组件
interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'success' | 'error' | 'warning';
  title: string;
  message?: string;
  timer?: number;
  showConfirm?: boolean;
}

const AlertModal = ({
  isOpen,
  onClose,
  type,
  title,
  message,
  timer,
  showConfirm = false
}: AlertModalProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      if (timer) {
        setTimeout(() => {
          onClose();
        }, timer);
      }
    } else {
      setIsVisible(false);
    }
  }, [isOpen, timer, onClose]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-8 h-8 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-8 h-8 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-8 h-8 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      default:
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    }
  };

  return createPortal(
    <div className={`fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full border ${getBgColor()} transition-all duration-200 ${isVisible ? 'scale-100' : 'scale-95'}`}>
        <div className="p-6 text-center">
          <div className="flex justify-center mb-4">
            {getIcon()}
          </div>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {title}
          </h3>

          {message && (
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {message}
            </p>
          )}

          {showConfirm && (
            <button
              onClick={onClose}
              className={`px-4 py-2 text-sm font-medium ${buttonStyles.primary}`}
            >
              确定
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

// 弹窗状态管理
const useAlertModal = () => {
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning';
    title: string;
    message?: string;
    timer?: number;
    showConfirm?: boolean;
  }>({
    isOpen: false,
    type: 'success',
    title: '',
  });

  const showAlert = (config: Omit<typeof alertModal, 'isOpen'>) => {
    setAlertModal({ ...config, isOpen: true });
  };

  const hideAlert = () => {
    setAlertModal(prev => ({ ...prev, isOpen: false }));
  };

  return { alertModal, showAlert, hideAlert };
};

// 统一弹窗方法（必须在首次使用前定义）
const showError = (message: string, showAlert?: (config: any) => void) => {
  if (showAlert) {
    showAlert({ type: 'error', title: '错误', message, showConfirm: true });
  } else {
    console.error(message);
  }
};

const showSuccess = (message: string, showAlert?: (config: any) => void) => {
  if (showAlert) {
    showAlert({ type: 'success', title: '成功', message, timer: 2000 });
  } else {
    console.log(message);
  }
};

// 通用加载状态管理系统
interface LoadingState {
  [key: string]: boolean;
}

const useLoadingState = () => {
  const [loadingStates, setLoadingStates] = useState<LoadingState>({});

  const setLoading = (key: string, loading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: loading }));
  };

  const isLoading = (key: string) => loadingStates[key] || false;

  const withLoading = async (key: string, operation: () => Promise<any>): Promise<any> => {
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

// 新增站点配置类型
interface SiteConfig {
  SiteName: string;
  Announcement: string;
  SearchDownstreamMaxPage: number;
  SiteInterfaceCacheTime: number;
  DoubanProxyType: string;
  DoubanProxy: string;
  DoubanImageProxyType: string;
  DoubanImageProxy: string;
  DisableYellowFilter: boolean;
  FluidSearch: boolean;
}

// 视频源数据类型
interface DataSource {
  name: string;
  key: string;
  api: string;
  detail?: string;
  disabled?: boolean;
  from: 'config' | 'custom';
}

// 直播源数据类型
interface LiveDataSource {
  name: string;
  key: string;
  url: string;
  ua?: string;
  epg?: string;
  channelNumber?: number;
  disabled?: boolean;
  from: 'config' | 'custom';
}

// 自定义分类数据类型
interface CustomCategory {
  name?: string;
  type: 'movie' | 'tv';
  query: string;
  disabled?: boolean;
  from: 'config' | 'custom';
}

// 可折叠标签组件
interface CollapsibleTabProps {
  title: string;
  icon?: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const CollapsibleTab = ({
  title,
  icon,
  isExpanded,
  onToggle,
  children,
}: CollapsibleTabProps) => {
  return (
    <div className='rounded-xl shadow-sm mb-4 overflow-hidden bg-white/80 backdrop-blur-md dark:bg-gray-800/50 dark:ring-1 dark:ring-gray-700'>
      <button
        onClick={onToggle}
        className='w-full px-6 py-4 flex items-center justify-between bg-gray-50/70 dark:bg-gray-800/60 hover:bg-gray-100/80 dark:hover:bg-gray-700/60 transition-colors'
      >
        <div className='flex items-center gap-3'>
          {icon}
          <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100'>
            {title}
          </h3>
        </div>
        <div className='text-gray-500 dark:text-gray-400'>
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>

      {isExpanded && <div className='px-6 py-4'>{children}</div>}
    </div>
  );
};

// 配置文件组件
const ConfigFileComponent = ({ config, refreshConfig }: { config: AdminConfig | null; refreshConfig: () => Promise<void> }) => {
  const { alertModal, showAlert, hideAlert } = useAlertModal();
  const { isLoading, withLoading } = useLoadingState();
  const [content, setContent] = useState('');

  useEffect(() => {
    if (config?.ConfigFile) {
      setContent(config.ConfigFile);
    }
  }, [config]);

  const handleSave = async () => {
    await withLoading('saveConfigFile', async () => {
      try {
        const response = await fetch('/api/admin/config_file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        });

        if (!response.ok) {
          throw new Error('保存失败');
        }

        showAlert({ type: 'success', title: '保存成功', message: '配置文件已更新，页面将自动刷新' });
        await refreshConfig();
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (error) {
        showError(error instanceof Error ? error.message : '保存失败', showAlert);
      }
    });
  };

  return (
    <div className='space-y-4'>
      <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4'>
        <div className='flex items-center space-x-2'>
          <AlertCircle size={20} className='text-blue-600 dark:text-blue-400' />
          <h4 className='text-sm font-medium text-blue-800 dark:text-blue-300'>
            配置文件编辑
          </h4>
        </div>
        <p className='mt-1 text-sm text-blue-700 dark:text-blue-400'>
          编辑配置文件将直接修改服务器上的配置文件，建议在修改前备份原始配置。
        </p>
      </div>

      <div className='space-y-2'>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className='w-full h-96 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 font-mono text-sm'
          placeholder='配置文件内容'
        />
        <div className='flex justify-end'>
          <button
            onClick={handleSave}
            disabled={isLoading('saveConfigFile')}
            className={`px-4 py-2 ${isLoading('saveConfigFile') ? buttonStyles.disabled : buttonStyles.primary} rounded-lg transition-colors`}
          >
            {isLoading('saveConfigFile') ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={hideAlert}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        timer={alertModal.timer}
        showConfirm={alertModal.showConfirm}
      />
    </div>
  );
};

// 视频源配置组件
const VideoSourceConfig = ({ config, refreshConfig }: { config: AdminConfig | null; refreshConfig: () => Promise<void> }) => {
  const { alertModal, showAlert, hideAlert } = useAlertModal();
  const { isLoading, withLoading } = useLoadingState();
  const [sources, setSources] = useState<DataSource[]>([]);

  useEffect(() => {
    if (config?.SourceConfig) {
      setSources(config.SourceConfig);
    }
  }, [config]);

  const handleToggleSource = async (key: string, disabled: boolean) => {
    await withLoading(`toggleSource_${key}`, async () => {
      try {
        const response = await fetch('/api/admin/source', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, disabled: !disabled }),
        });

        if (!response.ok) {
          throw new Error('更新失败');
        }

        showSuccess('更新成功', showAlert);
        await refreshConfig();
      } catch (error) {
        showError(error instanceof Error ? error.message : '更新失败', showAlert);
      }
    });
  };

  const handleAddSource = async (source: Omit<DataSource, 'from'>) => {
    await withLoading('addSource', async () => {
      try {
        const response = await fetch('/api/admin/source', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...source, action: 'add' }),
        });

        if (!response.ok) {
          throw new Error('添加失败');
        }

        showSuccess('添加成功', showAlert);
        await refreshConfig();
      } catch (error) {
        showError(error instanceof Error ? error.message : '添加失败', showAlert);
      }
    });
  };

  const handleDeleteSource = async (key: string) => {
    await withLoading(`deleteSource_${key}`, async () => {
      try {
        const response = await fetch('/api/admin/source', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, action: 'delete' }),
        });

        if (!response.ok) {
          throw new Error('删除失败');
        }

        showSuccess('删除成功', showAlert);
        await refreshConfig();
      } catch (error) {
        showError(error instanceof Error ? error.message : '删除失败', showAlert);
      }
    });
  };

  return (
    <div className='space-y-4'>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        {sources.map((source) => (
          <div key={source.key} className='bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm'>
            <div className='flex items-center justify-between'>
              <div>
                <h3 className='font-medium text-gray-900 dark:text-gray-100'>
                  {source.name}
                </h3>
                <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                  {source.api}
                </p>
              </div>
              <div className='flex items-center space-x-2'>
                <button
                  type='button'
                  onClick={() => handleToggleSource(source.key, source.disabled || false)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${source.disabled ? buttonStyles.toggleOff : buttonStyles.toggleOn}
                    `}
                  role='switch'
                  aria-checked={!source.disabled}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full ${buttonStyles.toggleThumb} shadow transform ring-0 transition duration-200 ease-in-out ${source.disabled ? buttonStyles.toggleThumbOff : buttonStyles.toggleThumbOn}
                      `}
                  />
                </button>
                <button
                  onClick={() => handleDeleteSource(source.key)}
                  className={buttonStyles.roundedDanger}
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={hideAlert}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        timer={alertModal.timer}
        showConfirm={alertModal.showConfirm}
      />
    </div>
  );
};

// 直播源配置组件
const LiveSourceConfig = ({ config, refreshConfig }: { config: AdminConfig | null; refreshConfig: () => Promise<void> }) => {
  const { alertModal, showAlert, hideAlert } = useAlertModal();
  const { isLoading, withLoading } = useLoadingState();
  const [sources, setSources] = useState<LiveDataSource[]>([]);

  useEffect(() => {
    if (config?.LiveConfig) {
      setSources(config.LiveConfig);
    }
  }, [config]);

  const handleToggleSource = async (key: string, disabled: boolean) => {
    await withLoading(`toggleLiveSource_${key}`, async () => {
      try {
        const response = await fetch('/api/admin/live', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, disabled: !disabled }),
        });

        if (!response.ok) {
          throw new Error('更新失败');
        }

        showSuccess('更新成功', showAlert);
        await refreshConfig();
      } catch (error) {
        showError(error instanceof Error ? error.message : '更新失败', showAlert);
      }
    });
  };

  const handleRefreshChannels = async () => {
    await withLoading('refreshLiveChannels', async () => {
      try {
        const response = await fetch('/api/admin/live/refresh');

        if (!response.ok) {
          throw new Error('刷新失败');
        }

        showSuccess('刷新成功', showAlert);
        await refreshConfig();
      } catch (error) {
        showError(error instanceof Error ? error.message : '刷新失败', showAlert);
      }
    });
  };

  return (
    <div className='space-y-4'>
      <div className='flex justify-end'>
        <button
          onClick={handleRefreshChannels}
          disabled={isLoading('refreshLiveChannels')}
          className={`px-4 py-2 ${isLoading('refreshLiveChannels') ? buttonStyles.disabled : buttonStyles.primary} rounded-lg transition-colors`}
        >
          {isLoading('refreshLiveChannels') ? '刷新中...' : '刷新频道'}
        </button>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        {sources.map((source) => (
          <div key={source.key} className='bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm'>
            <div className='flex items-center justify-between'>
              <div>
                <h3 className='font-medium text-gray-900 dark:text-gray-100'>
                  {source.name}
                </h3>
                <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                  {source.url}
                </p>
              </div>
              <div className='flex items-center space-x-2'>
                <button
                  type='button'
                  onClick={() => handleToggleSource(source.key, source.disabled || false)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${source.disabled ? buttonStyles.toggleOff : buttonStyles.toggleOn}
                    `}
                  role='switch'
                  aria-checked={!source.disabled}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full ${buttonStyles.toggleThumb} shadow transform ring-0 transition duration-200 ease-in-out ${source.disabled ? buttonStyles.toggleThumbOff : buttonStyles.toggleThumbOn}
                      `}
                  />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={hideAlert}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        timer={alertModal.timer}
        showConfirm={alertModal.showConfirm}
      />
    </div>
  );
};

// 站点配置组件
const SiteConfigComponent = ({ config, refreshConfig }: { config: AdminConfig | null; refreshConfig: () => Promise<void> }) => {
  const { alertModal, showAlert, hideAlert } = useAlertModal();
  const { isLoading, withLoading } = useLoadingState();
  const [siteSettings, setSiteSettings] = useState<SiteConfig>({
    SiteName: '',
    Announcement: '',
    SearchDownstreamMaxPage: 1,
    SiteInterfaceCacheTime: 7200,
    DoubanProxyType: 'cmliussss-cdn-tencent',
    DoubanProxy: '',
    DoubanImageProxyType: 'cmliussss-cdn-tencent',
    DoubanImageProxy: '',
    DisableYellowFilter: false,
    FluidSearch: true,
  });

  // 豆瓣数据源相关状态
  const [isDoubanDropdownOpen, setIsDoubanDropdownOpen] = useState(false);
  const [isDoubanImageProxyDropdownOpen, setIsDoubanImageProxyDropdownOpen] =
    useState(false);

  // 豆瓣数据源选项
  const doubanDataSourceOptions = [
    { value: 'direct', label: '直连（服务器直接请求豆瓣）' },
    { value: 'cors-proxy-zwei', label: 'Cors Proxy By Zwei' },
    {
      value: 'cmliussss-cdn-tencent',
      label: '豆瓣 CDN By CMLiussss（腾讯云）',
    },
    { value: 'cmliussss-cdn-ali', label: '豆瓣 CDN By CMLiussss（阿里云）' },
    { value: 'custom', label: '自定义代理' },
  ];

  // 豆瓣图片代理选项
  const doubanImageProxyTypeOptions = [
    { value: 'direct', label: '直连（浏览器直接请求豆瓣）' },
    { value: 'server', label: '服务器代理（由服务器代理请求豆瓣）' },
    { value: 'img3', label: '豆瓣官方精品 CDN（阿里云）' },
    {
      value: 'cmliussss-cdn-tencent',
      label: '豆瓣 CDN By CMLiussss（腾讯云）',
    },
    { value: 'cmliussss-cdn-ali', label: '豆瓣 CDN By CMLiussss（阿里云）' },
    { value: 'custom', label: '自定义代理' },
  ];

  useEffect(() => {
    if (config?.SiteConfig) {
      setSiteSettings({
        SiteName: config.SiteConfig.SiteName || '',
        Announcement: config.SiteConfig.Announcement || '',
        SearchDownstreamMaxPage: config.SiteConfig.SearchDownstreamMaxPage || 1,
        SiteInterfaceCacheTime: config.SiteConfig.SiteInterfaceCacheTime || 7200,
        DoubanProxyType: config.SiteConfig.DoubanProxyType || 'cmliussss-cdn-tencent',
        DoubanProxy: config.SiteConfig.DoubanProxy || '',
        DoubanImageProxyType: config.SiteConfig.DoubanImageProxyType || 'cmliussss-cdn-tencent',
        DoubanImageProxy: config.SiteConfig.DoubanImageProxy || '',
        DisableYellowFilter: config.SiteConfig.DisableYellowFilter || false,
        FluidSearch: config.SiteConfig.FluidSearch !== false,
      });
    }
  }, [config]);

  const handleSave = async () => {
    await withLoading('saveSiteConfig', async () => {
      try {
        const response = await fetch('/api/admin/site', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(siteSettings),
        });

        if (!response.ok) {
          throw new Error('保存失败');
        }

        showAlert({ type: 'success', title: '保存成功', message: '站点配置已更新，页面将自动刷新' });
        await refreshConfig();
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (error) {
        showError(error instanceof Error ? error.message : '保存失败', showAlert);
      }
    });
  };

  return (
    <div className='space-y-6'>
      <div className='bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700'>
        <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-6'>
          站点基本配置
        </h3>

        <div className='space-y-6'>
          {/* 站点名称 */}
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              站点名称
            </label>
            <input
              type='text'
              value={siteSettings.SiteName}
              onChange={(e) => setSiteSettings({ ...siteSettings, SiteName: e.target.value })}
              placeholder='请输入站点名称'
              className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
            />
          </div>

          {/* 公告 */}
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              公告
            </label>
            <textarea
              value={siteSettings.Announcement}
              onChange={(e) => setSiteSettings({ ...siteSettings, Announcement: e.target.value })}
              placeholder='请输入站点公告（可选）'
              className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
              rows={3}
            />
          </div>

          {/* 搜索下游最大页数 */}
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              搜索下游最大页数
            </label>
            <input
              type='number'
              value={siteSettings.SearchDownstreamMaxPage}
              onChange={(e) => setSiteSettings({ ...siteSettings, SearchDownstreamMaxPage: parseInt(e.target.value) || 1 })}
              min={1}
              max={10}
              className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
            />
          </div>

          {/* 站点界面缓存时间 */}
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              站点界面缓存时间（秒）
            </label>
            <input
              type='number'
              value={siteSettings.SiteInterfaceCacheTime}
              onChange={(e) => setSiteSettings({ ...siteSettings, SiteInterfaceCacheTime: parseInt(e.target.value) || 7200 })}
              min={60}
              max={86400}
              className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
            />
          </div>

          {/* 禁用黄色过滤 */}
          <div className='flex items-center justify-between'>
            <div>
              <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                禁用黄色过滤
              </label>
              <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                禁用后将不会过滤可能包含黄色内容的搜索结果
              </p>
            </div>
            <button
              type='button'
              onClick={() => setSiteSettings({ ...siteSettings, DisableYellowFilter: !siteSettings.DisableYellowFilter })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${siteSettings.DisableYellowFilter ? buttonStyles.toggleOn : buttonStyles.toggleOff
                }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${siteSettings.DisableYellowFilter ? buttonStyles.toggleThumbOn : buttonStyles.toggleThumbOff
                  }`}
              />
            </button>
          </div>

          {/* 流式搜索 */}
          <div className='flex items-center justify-between'>
            <div>
              <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                流式搜索
              </label>
              <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                启用后搜索结果将实时流式显示，提升搜索体验
              </p>
            </div>
            <button
              type='button'
              onClick={() => setSiteSettings({ ...siteSettings, FluidSearch: !siteSettings.FluidSearch })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${siteSettings.FluidSearch ? buttonStyles.toggleOn : buttonStyles.toggleOff
                }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${siteSettings.FluidSearch ? buttonStyles.toggleThumbOn : buttonStyles.toggleThumbOff
                  }`}
              />
            </button>
          </div>

          {/* 豆瓣数据源 */}
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              豆瓣数据源
            </label>
            <div className='relative'>
              <button
                type='button'
                onClick={() => setIsDoubanDropdownOpen(!isDoubanDropdownOpen)}
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white flex justify-between items-center'
              >
                <span>
                  {doubanDataSourceOptions.find(option => option.value === siteSettings.DoubanProxyType)?.label || siteSettings.DoubanProxyType}
                </span>
                <ChevronDown size={16} className={`transition-transform ${isDoubanDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDoubanDropdownOpen && (
                <div className='absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto'>
                  {doubanDataSourceOptions.map((option) => (
                    <button
                      key={option.value}
                      type='button'
                      onClick={() => {
                        setSiteSettings({ ...siteSettings, DoubanProxyType: option.value });
                        setIsDoubanDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${siteSettings.DoubanProxyType === option.value ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {siteSettings.DoubanProxyType === 'custom' && (
              <input
                type='text'
                value={siteSettings.DoubanProxy}
                onChange={(e) => setSiteSettings({ ...siteSettings, DoubanProxy: e.target.value })}
                placeholder='请输入自定义代理地址'
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white mt-2'
              />
            )}
          </div>

          {/* 豆瓣图片代理 */}
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              豆瓣图片代理
            </label>
            <div className='relative'>
              <button
                type='button'
                onClick={() => setIsDoubanImageProxyDropdownOpen(!isDoubanImageProxyDropdownOpen)}
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white flex justify-between items-center'
              >
                <span>
                  {doubanImageProxyTypeOptions.find(option => option.value === siteSettings.DoubanImageProxyType)?.label || siteSettings.DoubanImageProxyType}
                </span>
                <ChevronDown size={16} className={`transition-transform ${isDoubanImageProxyDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDoubanImageProxyDropdownOpen && (
                <div className='absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto'>
                  {doubanImageProxyTypeOptions.map((option) => (
                    <button
                      key={option.value}
                      type='button'
                      onClick={() => {
                        setSiteSettings({ ...siteSettings, DoubanImageProxyType: option.value });
                        setIsDoubanImageProxyDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${siteSettings.DoubanImageProxyType === option.value ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {siteSettings.DoubanImageProxyType === 'custom' && (
              <input
                type='text'
                value={siteSettings.DoubanImageProxy}
                onChange={(e) => setSiteSettings({ ...siteSettings, DoubanImageProxy: e.target.value })}
                placeholder='请输入自定义图片代理地址'
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white mt-2'
              />
            )}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className='flex justify-end mt-6'>
          <button
            onClick={handleSave}
            disabled={isLoading('saveSiteConfig')}
            className={`px-4 py-2 ${isLoading('saveSiteConfig')
              ? buttonStyles.disabled
              : buttonStyles.success
              } rounded-lg transition-colors`}
          >
            {isLoading('saveSiteConfig') ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      {/* 通用弹窗组件 */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={hideAlert}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        timer={alertModal.timer}
        showConfirm={alertModal.showConfirm}
      />
    </div>
  );
};

// 分类配置组件
const CategoryConfig = ({ config, refreshConfig }: { config: AdminConfig | null; refreshConfig: () => Promise<void> }) => {
  const { alertModal, showAlert, hideAlert } = useAlertModal();
  const { isLoading, withLoading } = useLoadingState();
  const [categories, setCategories] = useState<CustomCategory[]>([]);

  useEffect(() => {
    if (config?.CustomCategories) {
      setCategories(config.CustomCategories);
    }
  }, [config]);

  const handleToggleCategory = async (index: number, disabled: boolean) => {
    const updatedCategories = [...categories];
    updatedCategories[index] = { ...updatedCategories[index], disabled: !disabled };

    await withLoading(`toggleCategory_${index}`, async () => {
      try {
        const response = await fetch('/api/admin/category', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ categories: updatedCategories }),
        });

        if (!response.ok) {
          throw new Error('更新失败');
        }

        showSuccess('更新成功', showAlert);
        await refreshConfig();
      } catch (error) {
        showError(error instanceof Error ? error.message : '更新失败', showAlert);
      }
    });
  };

  return (
    <div className='space-y-4'>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        {categories.map((category, index) => (
          <div key={index} className='bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm'>
            <div className='flex items-center justify-between'>
              <div>
                <h3 className='font-medium text-gray-900 dark:text-gray-100'>
                  {category.name || `分类 ${index + 1}`}
                </h3>
                <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                  类型: {category.type === 'movie' ? '电影' : '电视剧'} | 查询: {category.query}
                </p>
              </div>
              <div className='flex items-center space-x-2'>
                <button
                  type='button'
                  onClick={() => handleToggleCategory(index, category.disabled || false)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${category.disabled ? buttonStyles.toggleOff : buttonStyles.toggleOn}
                    `}
                  role='switch'
                  aria-checked={!category.disabled}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full ${buttonStyles.toggleThumb} shadow transform ring-0 transition duration-200 ease-in-out ${category.disabled ? buttonStyles.toggleThumbOff : buttonStyles.toggleThumbOn}
                      `}
                  />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={hideAlert}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        timer={alertModal.timer}
        showConfirm={alertModal.showConfirm}
      />
    </div>
  );
};

// 用户配置组件
const UserConfig = ({ config, role, refreshConfig, setConfig }: { config: AdminConfig | null; role: 'owner' | 'admin' | null; refreshConfig: () => Promise<void>; setConfig: React.Dispatch<React.SetStateAction<AdminConfig | null>> }) => {
  const { alertModal, showAlert, hideAlert } = useAlertModal();
  const { isLoading, withLoading } = useLoadingState();
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [showChangePasswordForm, setShowChangePasswordForm] = useState(false);
  const [showAddUserGroupForm, setShowAddUserGroupForm] = useState(false);
  const [showEditUserGroupForm, setShowEditUserGroupForm] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    userGroup: '',
  });
  const [changePasswordUser, setChangePasswordUser] = useState({
    username: '',
    password: '',
  });
  const [newUserGroup, setNewUserGroup] = useState({
    name: '',
    enabledApis: [] as string[],
  });
  const [editingUserGroup, setEditingUserGroup] = useState<{
    name: string;
    enabledApis: string[];
  } | null>(null);
  const [showConfigureApisModal, setShowConfigureApisModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    username: string;
    role: 'user' | 'admin' | 'owner';
    enabledApis?: string[];
    tags?: string[];
  } | null>(null);
  const [selectedApis, setSelectedApis] = useState<string[]>([]);
  const [showConfigureUserGroupModal, setShowConfigureUserGroupModal] = useState(false);
  const [selectedUserForGroup, setSelectedUserForGroup] = useState<{
    username: string;
    role: 'user' | 'admin' | 'owner';
    tags?: string[];
  } | null>(null);
  const [selectedUserGroups, setSelectedUserGroups] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showBatchUserGroupModal, setShowBatchUserGroupModal] = useState(false);
  const [selectedUserGroup, setSelectedUserGroup] = useState<string>('');
  const [showDeleteUserGroupModal, setShowDeleteUserGroupModal] = useState(false);
  const [deletingUserGroup, setDeletingUserGroup] = useState<{
    name: string;
    affectedUsers: Array<{ username: string; role: 'user' | 'admin' | 'owner' }>;
  } | null>(null);
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);

  // 当前登录用户
  const currentUsername = getAuthInfoFromBrowserCookie()?.username || null;

  // 使用 useMemo 计算全选状态，避免每次渲染都重新计算
  const selectAllUsers = useMemo(() => {
    const selectableUserCount = config?.UserConfig?.Users?.filter(user =>
    (role === 'owner' ||
      (role === 'admin' &&
        (user.role === 'user' ||
          user.username === currentUsername)))
    ).length || 0;
    return selectedUsers.size === selectableUserCount && selectedUsers.size > 0;
  }, [selectedUsers.size, config?.UserConfig?.Users, role, currentUsername]);

  // 获取用户组列表
  const userGroups = config?.UserConfig?.Tags || [];

  // 处理用户组相关操作
  const handleUserGroupAction = async (
    action: 'add' | 'edit' | 'delete',
    groupName: string,
    enabledApis?: string[]
  ) => {
    return withLoading(`userGroup_${action}_${groupName}`, async () => {
      try {
        const res = await fetch('/api/admin/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'userGroup',
            groupAction: action,
            groupName,
            enabledApis,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `操作失败: ${res.status}`);
        }

        await refreshConfig();

        if (action === 'add') {
          setNewUserGroup({ name: '', enabledApis: [] });
          setShowAddUserGroupForm(false);
        } else if (action === 'edit') {
          setEditingUserGroup(null);
          setShowEditUserGroupForm(false);
        }

        showSuccess(action === 'add' ? '用户组添加成功' : action === 'edit' ? '用户组更新成功' : '用户组删除成功', showAlert);
      } catch (err) {
        showError(err instanceof Error ? err.message : '操作失败', showAlert);
        throw err;
      }
    });
  };

  const handleAddUserGroup = () => {
    if (!newUserGroup.name.trim()) return;
    handleUserGroupAction('add', newUserGroup.name, newUserGroup.enabledApis);
  };

  const handleEditUserGroup = () => {
    if (!editingUserGroup?.name.trim()) return;
    handleUserGroupAction('edit', editingUserGroup.name, editingUserGroup.enabledApis);
  };

  const handleDeleteUserGroup = (groupName: string) => {
    // 计算会受影响的用户数量
    const affectedUsers = config?.UserConfig?.Users?.filter(user =>
      user.tags && user.tags.includes(groupName)
    ) || [];

    setDeletingUserGroup({
      name: groupName,
      affectedUsers: affectedUsers.map(u => ({ username: u.username, role: u.role }))
    });
    setShowDeleteUserGroupModal(true);
  };

  const handleConfirmDeleteUserGroup = async () => {
    if (!deletingUserGroup) return;

    try {
      await handleUserGroupAction('delete', deletingUserGroup.name);
      setShowDeleteUserGroupModal(false);
      setDeletingUserGroup(null);
    } catch (err) {
      // 错误处理已在 handleUserGroupAction 中处理
    }
  };

  const handleStartEditUserGroup = (group: { name: string; enabledApis: string[] }) => {
    setEditingUserGroup({ ...group });
    setShowEditUserGroupForm(true);
    setShowAddUserGroupForm(false);
  };

  // 为用户分配用户组
  const handleAssignUserGroup = async (username: string, userGroups: string[]) => {
    return withLoading(`assignUserGroup_${username}`, async () => {
      try {
        const res = await fetch('/api/admin/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetUsername: username,
            action: 'updateUserGroups',
            userGroups,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `操作失败: ${res.status}`);
        }

        await refreshConfig();
        showSuccess('用户组分配成功', showAlert);
      } catch (err) {
        showError(err instanceof Error ? err.message : '操作失败', showAlert);
        throw err;
      }
    });
  };

  const handleBanUser = async (uname: string) => {
    await withLoading(`banUser_${uname}`, () => handleUserAction('ban', uname));
  };

  const handleUnbanUser = async (uname: string) => {
    await withLoading(`unbanUser_${uname}`, () => handleUserAction('unban', uname));
  };

  const handleSetAdmin = async (uname: string) => {
    await withLoading(`setAdmin_${uname}`, () => handleUserAction('setAdmin', uname));
  };

  const handleRemoveAdmin = async (uname: string) => {
    await withLoading(`removeAdmin_${uname}`, () => handleUserAction('cancelAdmin', uname));
  };

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.password) return;
    await withLoading('addUser', async () => {
      await handleUserAction('add', newUser.username, newUser.password, newUser.userGroup);
      setNewUser({ username: '', password: '', userGroup: '' });
      setShowAddUserForm(false);
    });
  };

  const handleChangePassword = async () => {
    if (!changePasswordUser.username || !changePasswordUser.password) return;
    await withLoading(`changePassword_${changePasswordUser.username}`, async () => {
      await handleUserAction(
        'changePassword',
        changePasswordUser.username,
        changePasswordUser.password
      );
      setChangePasswordUser({ username: '', password: '' });
      setShowChangePasswordForm(false);
    });
  };

  const handleShowChangePasswordForm = (username: string) => {
    setChangePasswordUser({ username, password: '' });
    setShowChangePasswordForm(true);
    setShowAddUserForm(false);
  };

  const handleDeleteUser = (username: string) => {
    setDeletingUser(username);
    setShowDeleteUserModal(true);
  };

  const handleConfigureUserApis = (user: {
    username: string;
    role: 'user' | 'admin' | 'owner';
    enabledApis?: string[];
  }) => {
    setSelectedUser(user);
    setSelectedApis(user.enabledApis || []);
    setShowConfigureApisModal(true);
  };

  const handleConfigureUserGroup = (user: {
    username: string;
    role: 'user' | 'admin' | 'owner';
    tags?: string[];
  }) => {
    setSelectedUserForGroup(user);
    setSelectedUserGroups(user.tags || []);
    setShowConfigureUserGroupModal(true);
  };

  const handleSaveUserGroups = async () => {
    if (!selectedUserForGroup) return;

    await withLoading(`saveUserGroups_${selectedUserForGroup.username}`, async () => {
      try {
        await handleAssignUserGroup(selectedUserForGroup.username, selectedUserGroups);
        setShowConfigureUserGroupModal(false);
        setSelectedUserForGroup(null);
        setSelectedUserGroups([]);
      } catch (err) {
        // 错误处理已在 handleAssignUserGroup 中处理
      }
    });
  };

  // 处理用户选择
  const handleSelectUser = useCallback((username: string, checked: boolean) => {
    setSelectedUsers(prev => {
      const newSelectedUsers = new Set(prev);
      if (checked) {
        newSelectedUsers.add(username);
      } else {
        newSelectedUsers.delete(username);
      }
      return newSelectedUsers;
    });
  }, []);

  const handleSelectAllUsers = useCallback((checked: boolean) => {
    if (checked) {
      // 只选择自己有权限操作的用户
      const selectableUsernames = config?.UserConfig?.Users?.filter(user =>
      (role === 'owner' ||
        (role === 'admin' &&
          (user.role === 'user' ||
            user.username === currentUsername)))
      ).map(u => u.username) || [];
      setSelectedUsers(new Set(selectableUsernames));
    } else {
      setSelectedUsers(new Set());
    }
  }, [config?.UserConfig?.Users, role, currentUsername]);

  // 批量设置用户组
  const handleBatchSetUserGroup = async (userGroup: string) => {
    if (selectedUsers.size === 0) return;

    await withLoading('batchSetUserGroup', async () => {
      try {
        const res = await fetch('/api/admin/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'batchUpdateUserGroups',
            usernames: Array.from(selectedUsers),
            userGroups: userGroup === '' ? [] : [userGroup],
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `操作失败: ${res.status}`);
        }

        const userCount = selectedUsers.size;
        setSelectedUsers(new Set());
        setShowBatchUserGroupModal(false);
        setSelectedUserGroup('');
        showSuccess(`已为 ${userCount} 个用户设置用户组: ${userGroup}`, showAlert);

        // 刷新配置
        await refreshConfig();
      } catch (err) {
        showError('批量设置用户组失败', showAlert);
        throw err;
      }
    });
  };

  // 提取URL域名的辅助函数
  const extractDomain = (url: string): string => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      // 如果URL格式不正确，返回原字符串
      return url;
    }
  };

  const handleSaveUserApis = async () => {
    if (!selectedUser) return;

    await withLoading(`saveUserApis_${selectedUser.username}`, async () => {
      try {
        const res = await fetch('/api/admin/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetUsername: selectedUser.username,
            action: 'updateUserApis',
            enabledApis: selectedApis,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `操作失败: ${res.status}`);
        }

        // 成功后刷新配置
        await refreshConfig();
        setShowConfigureApisModal(false);
        setSelectedUser(null);
        setSelectedApis([]);
      } catch (err) {
        showError(err instanceof Error ? err.message : '操作失败', showAlert);
        throw err;
      }
    });
  };

  // 通用请求函数
  const handleUserAction = async (
    action:
      | 'add'
      | 'ban'
      | 'unban'
      | 'setAdmin'
      | 'cancelAdmin'
      | 'changePassword'
      | 'deleteUser',
    targetUsername: string,
    targetPassword?: string,
    userGroup?: string
  ) => {
    try {
      const res = await fetch('/api/admin/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUsername,
          ...(targetPassword ? { targetPassword } : {}),
          ...(userGroup ? { userGroup } : {}),
          action,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `操作失败: ${res.status}`);
      }

      // 成功后刷新配置
      await refreshConfig();
      showSuccess(action === 'add' ? '用户添加成功' : action === 'ban' ? '用户封禁成功' : action === 'unban' ? '用户解封成功' : action === 'setAdmin' ? '设置管理员成功' : action === 'cancelAdmin' ? '取消管理员成功' : action === 'changePassword' ? '密码修改成功' : '用户删除成功', showAlert);
    } catch (err) {
      showError(err instanceof Error ? err.message : '操作失败', showAlert);
      throw err;
    }
  };

  return (
    <div className='space-y-4'>
      <div className='flex justify-between items-center mb-4'>
        <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
          用户管理
        </h3>
        <button
          onClick={() => setShowAddUserForm(true)}
          className={buttonStyles.primary}
        >
          添加用户
        </button>
      </div>

      {/* 用户列表 */}
      <div className='overflow-x-auto'>
        <table className='w-full text-sm text-left text-gray-500 dark:text-gray-400'>
          <thead className='text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300'>
            <tr>
              <th scope='col' className='px-6 py-3'>
                用户名
              </th>
              <th scope='col' className='px-6 py-3'>
                角色
              </th>
              <th scope='col' className='px-6 py-3'>
                状态
              </th>
              <th scope='col' className='px-6 py-3'>
                用户组
              </th>
              <th scope='col' className='px-6 py-3'>
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {config?.UserConfig?.Users?.map((user) => {
              const isCurrentUser = user.username === currentUsername;
              const canManage = role === 'owner' || (role === 'admin' && user.role === 'user') || isCurrentUser;

              return (
                <tr key={user.username} className='bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'>
                  <td className='px-6 py-4 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap'>
                    {user.username}
                  </td>
                  <td className='px-6 py-4'>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.role === 'owner' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200' : user.role === 'admin' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700/40 dark:text-gray-200'}`}>
                      {user.role === 'owner' ? '所有者' : user.role === 'admin' ? '管理员' : '用户'}
                    </span>
                  </td>
                  <td className='px-6 py-4'>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.banned ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200' : 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'}`}>
                      {user.banned ? '已封禁' : '正常'}
                    </span>
                  </td>
                  <td className='px-6 py-4'>
                    <div className='flex flex-wrap gap-1'>
                      {user.tags?.map((tag) => (
                        <span key={tag} className='inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700/40 dark:text-gray-200'>
                          {tag}
                        </span>
                      )) || (
                        <span className='text-xs text-gray-500 dark:text-gray-400'>无</span>
                      )}
                    </div>
                  </td>
                  <td className='px-6 py-4'>
                    <div className='flex space-x-2'>
                      {canManage && !isCurrentUser && (
                        <>
                          {user.banned ? (
                            <button
                              onClick={() => handleUnbanUser(user.username)}
                              className={buttonStyles.roundedSuccess}
                            >
                              解封
                            </button>
                          ) : (
                            <button
                              onClick={() => handleBanUser(user.username)}
                              className={buttonStyles.roundedDanger}
                            >
                              封禁
                            </button>
                          )}
                          {role === 'owner' && user.role === 'user' && (
                            <button
                              onClick={() => handleSetAdmin(user.username)}
                              className={buttonStyles.roundedPrimary}
                            >
                              设为管理员
                            </button>
                          )}
                          {role === 'owner' && user.role === 'admin' && (
                            <button
                              onClick={() => handleRemoveAdmin(user.username)}
                              className={buttonStyles.roundedSecondary}
                            >
                              取消管理员
                            </button>
                          )}
                        </>
                      )}
                      {canManage && (
                        <>
                          <button
                            onClick={() => handleShowChangePasswordForm(user.username)}
                            className={buttonStyles.roundedSecondary}
                          >
                            修改密码
                          </button>
                          <button
                            onClick={() => handleConfigureUserApis(user)}
                            className={buttonStyles.roundedPurple}
                          >
                            配置API
                          </button>
                          <button
                            onClick={() => handleConfigureUserGroup(user)}
                            className={buttonStyles.roundedWarning}
                          >
                            配置用户组
                          </button>
                        </>
                      )}
                      {role === 'owner' && !isCurrentUser && (
                        <button
                          onClick={() => handleDeleteUser(user.username)}
                          className={buttonStyles.roundedDanger}
                        >
                          删除
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 添加用户表单 */}
      {showAddUserForm && (
        <div className='bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm'>
          <h4 className='font-medium text-gray-900 dark:text-gray-100 mb-3'>
            添加用户
          </h4>
          <div className='space-y-3'>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                用户名
              </label>
              <input
                type='text'
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                placeholder='请输入用户名'
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                密码
              </label>
              <input
                type='password'
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder='请输入密码'
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                用户组
              </label>
              <select
                value={newUser.userGroup}
                onChange={(e) => setNewUser({ ...newUser, userGroup: e.target.value })}
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
              >
                <option value=''>选择用户组</option>
                {userGroups.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </div>
            <div className='flex justify-end space-x-2'>
              <button
                onClick={() => setShowAddUserForm(false)}
                className={buttonStyles.secondary}
              >
                取消
              </button>
              <button
                onClick={handleAddUser}
                disabled={isLoading('addUser')}
                className={`${isLoading('addUser') ? buttonStyles.disabled : buttonStyles.primary}`}
              >
                {isLoading('addUser') ? '添加中...' : '添加'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 修改密码表单 */}
      {showChangePasswordForm && (
        <div className='bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm'>
          <h4 className='font-medium text-gray-900 dark:text-gray-100 mb-3'>
            修改密码 - {changePasswordUser.username}
          </h4>
          <div className='space-y-3'>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                新密码
              </label>
              <input
                type='password'
                value={changePasswordUser.password}
                onChange={(e) => setChangePasswordUser({ ...changePasswordUser, password: e.target.value })}
                placeholder='请输入新密码'
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
              />
            </div>
            <div className='flex justify-end space-x-2'>
              <button
                onClick={() => setShowChangePasswordForm(false)}
                className={buttonStyles.secondary}
              >
                取消
              </button>
              <button
                onClick={handleChangePassword}
                disabled={isLoading(`changePassword_${changePasswordUser.username}`)}
                className={`${isLoading(`changePassword_${changePasswordUser.username}`) ? buttonStyles.disabled : buttonStyles.primary}`}
              >
                {isLoading(`changePassword_${changePasswordUser.username}`) ? '修改中...' : '修改'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 添加用户组表单 */}
      {showAddUserGroupForm && (
        <div className='bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm'>
          <h4 className='font-medium text-gray-900 dark:text-gray-100 mb-3'>
            添加用户组
          </h4>
          <div className='space-y-3'>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                用户组名称
              </label>
              <input
                type='text'
                value={newUserGroup.name}
                onChange={(e) => setNewUserGroup({ ...newUserGroup, name: e.target.value })}
                placeholder='请输入用户组名称'
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
              />
            </div>
            <div className='flex justify-end space-x-2'>
              <button
                onClick={() => setShowAddUserGroupForm(false)}
                className={buttonStyles.secondary}
              >
                取消
              </button>
              <button
                onClick={handleAddUserGroup}
                className={buttonStyles.primary}
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑用户组表单 */}
      {showEditUserGroupForm && editingUserGroup && (
        <div className='bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm'>
          <h4 className='font-medium text-gray-900 dark:text-gray-100 mb-3'>
            编辑用户组 - {editingUserGroup.name}
          </h4>
          <div className='space-y-3'>
            <div className='flex justify-end space-x-2'>
              <button
                onClick={() => setShowEditUserGroupForm(false)}
                className={buttonStyles.secondary}
              >
                取消
              </button>
              <button
                onClick={handleEditUserGroup}
                className={buttonStyles.primary}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 配置API弹窗 */}
      {showConfigureApisModal && selectedUser && (
        <div className='fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4'>
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full'>
            <div className='p-4 border-b border-gray-200 dark:border-gray-700'>
              <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                配置API - {selectedUser.username}
              </h3>
            </div>
            <div className='p-4 max-h-80 overflow-y-auto'>
              <div className='space-y-2'>
                {(['search', 'play', 'live', 'ai', 'admin']).map((api) => (
                  <div key={api} className='flex items-center justify-between'>
                    <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                      {api === 'search' ? '搜索' : api === 'play' ? '播放' : api === 'live' ? '直播' : api === 'ai' ? 'AI' : '管理员'}
                    </label>
                    <input
                      type='checkbox'
                      checked={selectedApis.includes(api)}
                      onChange={(e) => setSelectedApis(e.target.checked ? [...selectedApis, api] : selectedApis.filter(a => a !== api))}
                      className='w-4 h-4 text-blue-600 rounded focus:ring-blue-500'
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className='p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-2'>
              <button
                onClick={() => setShowConfigureApisModal(false)}
                className={buttonStyles.secondary}
              >
                取消
              </button>
              <button
                onClick={handleSaveUserApis}
                className={buttonStyles.primary}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 配置用户组弹窗 */}
      {showConfigureUserGroupModal && selectedUserForGroup && (
        <div className='fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4'>
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full'>
            <div className='p-4 border-b border-gray-200 dark:border-gray-700'>
              <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                配置用户组 - {selectedUserForGroup.username}
              </h3>
            </div>
            <div className='p-4 max-h-80 overflow-y-auto'>
              <div className='space-y-2'>
                {userGroups.map((group) => (
                  <div key={group} className='flex items-center justify-between'>
                    <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                      {group}
                    </label>
                    <input
                      type='checkbox'
                      checked={selectedUserGroups.includes(group)}
                      onChange={(e) => setSelectedUserGroups(e.target.checked ? [...selectedUserGroups, group] : selectedUserGroups.filter(g => g !== group))}
                      className='w-4 h-4 text-blue-600 rounded focus:ring-blue-500'
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className='p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-2'>
              <button
                onClick={() => setShowConfigureUserGroupModal(false)}
                className={buttonStyles.secondary}
              >
                取消
              </button>
              <button
                onClick={handleSaveUserGroups}
                className={buttonStyles.primary}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除用户组确认弹窗 */}
      {showDeleteUserGroupModal && deletingUserGroup && (
        <div className='fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4'>
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full'>
            <div className='p-4 border-b border-gray-200 dark:border-gray-700'>
              <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                确认删除用户组
              </h3>
            </div>
            <div className='p-4'>
              <p className='text-sm text-gray-600 dark:text-gray-400 mb-4'>
                确定要删除用户组 <span className='font-medium'>{deletingUserGroup.name}</span> 吗？
              </p>
              {deletingUserGroup.affectedUsers.length > 0 && (
                <div className='mb-4'>
                  <p className='text-sm text-gray-600 dark:text-gray-400 mb-2'>
                    此操作将影响以下用户：
                  </p>
                  <div className='space-y-1'>
                    {deletingUserGroup.affectedUsers.map((user) => (
                      <div key={user.username} className='flex items-center justify-between text-sm'>
                        <span>{user.username}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${user.role === 'owner' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200' : user.role === 'admin' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700/40 dark:text-gray-200'}`}>
                          {user.role === 'owner' ? '所有者' : user.role === 'admin' ? '管理员' : '用户'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className='p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-2'>
              <button
                onClick={() => setShowDeleteUserGroupModal(false)}
                className={buttonStyles.secondary}
              >
                取消
              </button>
              <button
                onClick={handleConfirmDeleteUserGroup}
                className={buttonStyles.danger}
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除用户确认弹窗 */}
      {showDeleteUserModal && deletingUser && (
        <div className='fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4'>
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full'>
            <div className='p-4 border-b border-gray-200 dark:border-gray-700'>
              <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                确认删除用户
              </h3>
            </div>
            <div className='p-4'>
              <p className='text-sm text-gray-600 dark:text-gray-400'>
                确定要删除用户 <span className='font-medium'>{deletingUser}</span> 吗？
              </p>
            </div>
            <div className='p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-2'>
              <button
                onClick={() => setShowDeleteUserModal(false)}
                className={buttonStyles.secondary}
              >
                取消
              </button>
              <button
                onClick={() => {
                  handleUserAction('deleteUser', deletingUser);
                  setShowDeleteUserModal(false);
                }}
                className={buttonStyles.danger}
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 通用弹窗组件 */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={hideAlert}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        timer={alertModal.timer}
        showConfirm={alertModal.showConfirm}
      />
    </div>
  );
};