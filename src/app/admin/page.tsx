/* eslint-disable @typescript-eslint/no-explicit-any, no-console, @typescript-eslint/no-non-null-assertion,react-hooks/exhaustive-deps,@typescript-eslint/no-empty-function */

'use client';

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { AdminConfig } from '@/lib/admin.types';

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

// 主页面组件
const AdminPage = () => {
  const { alertModal, showAlert, hideAlert } = useAlertModal();
  const { isLoading, withLoading } = useLoadingState();
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [expandedTabs, setExpandedTabs] = useState({
    siteConfig: true,
    videoSources: false,
    liveSources: false,
    categories: false,
    configFile: false,
  });

  // 获取配置数据
  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/admin/config');
      if (!response.ok) {
        throw new Error('获取配置失败');
      }
      const data = await response.json();
      setConfig(data);
    } catch (error) {
      showError(error instanceof Error ? error.message : '获取配置失败', showAlert);
    }
  };

  // 刷新配置
  const refreshConfig = async () => {
    await fetchConfig();
  };

  // 初始化时获取配置
  useEffect(() => {
    fetchConfig();
  }, []);

  // 切换标签展开/折叠
  const toggleTab = (tab: keyof typeof expandedTabs) => {
    setExpandedTabs(prev => ({
      ...prev,
      [tab]: !prev[tab]
    }));
  };

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8'>
      <div className='max-w-7xl mx-auto'>
        {/* 页面标题 */}
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>
            后台管理
          </h1>
          <p className='mt-2 text-sm text-gray-600 dark:text-gray-400'>
            配置站点设置、视频源、直播源等
          </p>
        </div>

        {/* 配置标签 */}
        <div className='space-y-6'>
          {/* 站点配置 */}
          <CollapsibleTab
            title='站点配置'
            isExpanded={expandedTabs.siteConfig}
            onToggle={() => toggleTab('siteConfig')}
          >
            <SiteConfigComponent config={config} refreshConfig={refreshConfig} />
          </CollapsibleTab>

          {/* 视频源配置 */}
          <CollapsibleTab
            title='视频源配置'
            isExpanded={expandedTabs.videoSources}
            onToggle={() => toggleTab('videoSources')}
          >
            <VideoSourceConfig config={config} refreshConfig={refreshConfig} />
          </CollapsibleTab>

          {/* 直播源配置 */}
          <CollapsibleTab
            title='直播源配置'
            isExpanded={expandedTabs.liveSources}
            onToggle={() => toggleTab('liveSources')}
          >
            <LiveSourceConfig config={config} refreshConfig={refreshConfig} />
          </CollapsibleTab>

          {/* 分类配置 */}
          <CollapsibleTab
            title='分类配置'
            isExpanded={expandedTabs.categories}
            onToggle={() => toggleTab('categories')}
          >
            <CategoryConfig config={config} refreshConfig={refreshConfig} />
          </CollapsibleTab>

          {/* 配置文件 */}
          <CollapsibleTab
            title='配置文件'
            isExpanded={expandedTabs.configFile}
            onToggle={() => toggleTab('configFile')}
          >
            <ConfigFileComponent config={config} refreshConfig={refreshConfig} />
          </CollapsibleTab>
        </div>

        {/* 通用弹窗 */}
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
    </div>
  );
};

export default AdminPage;