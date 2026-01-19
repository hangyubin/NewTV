import React from 'react';
import { Database } from 'lucide-react';
import { AdminConfig } from '@/lib/admin.types';
import { useAlertModal, showSuccess, showError } from './useAlertModal';
import { useLoadingState } from './useLoadingState';
import { buttonStyles } from './ButtonStyles';
import CollapsibleTab from './CollapsibleTab';

// 配置文件和订阅管理组件的属性定义
export interface ConfigSubscriptionProps {
  config: AdminConfig | null;
  role: 'owner' | 'admin' | null;
  refreshConfig: () => Promise<void>;
  setConfig: React.Dispatch<React.SetStateAction<AdminConfig | null>>;
  isExpanded?: boolean;
  onToggle?: () => void;
}

// 配置文件和订阅管理组件
const ConfigSubscription = ({
  config,
  role,
  refreshConfig,
  setConfig,
  isExpanded = true,
  onToggle = () => {},
}: ConfigSubscriptionProps) => {
  const { alertModal, showAlert, hideAlert } = useAlertModal();
  const { isLoading, withLoading } = useLoadingState();
  
  // JSON编辑状态
  const [jsonConfig, setJsonConfig] = React.useState<string>('');
  const [jsonError, setJsonError] = React.useState<string | null>(null);
  const [isEditing, setIsEditing] = React.useState<boolean>(false);
  
  // 当配置变化时，更新JSON文本
  React.useEffect(() => {
    if (config) {
      setJsonConfig(JSON.stringify(config, null, 2));
      setJsonError(null);
    }
  }, [config]);
  
  // 验证JSON语法
  const validateJson = (jsonStr: string): boolean => {
    try {
      JSON.parse(jsonStr);
      setJsonError(null);
      return true;
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : '无效的JSON格式');
      return false;
    }
  };
  
  // 处理JSON文本变化
  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setJsonConfig(value);
    validateJson(value);
  };
  
  // 应用JSON配置
  const applyJsonConfig = async () => {
    if (!validateJson(jsonConfig)) {
      showAlert({
        type: 'error',
        title: 'JSON格式错误',
        message: jsonError || '无效的JSON格式',
        showConfirm: true,
      });
      return;
    }
    
    await withLoading('applyJsonConfig', async () => {
      try {
        // 写入JSON文件 - 使用正确的API端点
        const response = await fetch('/api/admin/config_file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ configFile: jsonConfig }),
        });
        if (response.ok) {
          // 先关闭编辑模式，提升用户体验
          setIsEditing(false);
          
          // 重新获取配置，确保视频源列表正确更新
          await refreshConfig();
          
          showAlert({
            type: 'success',
            title: '应用成功',
            message: 'JSON配置已成功应用并保存，视频源列表已更新',
            timer: 2000,
          });
        } else {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || '写入配置文件失败');
        }
      } catch (err) {
        showError(
          err instanceof Error ? err.message : '应用失败',
          showAlert
        );
      }
    });
  };
  
  if (!config) {
    return (
      <div className='text-center text-gray-500 dark:text-gray-400'>
        加载中...
      </div>
    );
  }
  
  return (
    <CollapsibleTab
      title="配置文件与订阅"
      icon={<Database className="w-6 h-6 text-blue-500" />}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <div className='space-y-6'>
        {/* 配置文件信息 */}
        <div>
          <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>
            配置文件
          </h4>
          <div className='p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800'>
            <div className='space-y-4'>
              <div className='flex items-center justify-between'>
                <div>
                  <div className='font-medium text-gray-900 dark:text-gray-100'>
                    配置文件路径
                  </div>
                  <div className='text-sm text-gray-600 dark:text-gray-400 break-all max-w-lg'>
                    {config.ConfigFile}
                  </div>
                </div>
                <div className='flex items-center space-x-2'>
                  <button
                    onClick={async () => {
                      await withLoading('checkConfigUpdate', async () => {
                        try {
                          const response = await fetch('/api/admin/config/check-update', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                          });
                          if (response.ok) {
                            showAlert({
                              type: 'success',
                              title: '检查成功',
                              message: '配置文件检查更新完成',
                              timer: 2000,
                            });
                            await refreshConfig();
                          } else {
                            throw new Error('检查更新失败');
                          }
                        } catch (err) {
                          showError(
                            err instanceof Error ? err.message : '检查更新失败',
                            showAlert
                          );
                        }
                      });
                    }}
                    className={buttonStyles.primary}
                  >
                    检查更新
                  </button>
                  <button
                    onClick={async () => {
                      await withLoading('writeConfigFile', async () => {
                        try {
                          // 使用正确的API端点
                          const response = await fetch('/api/admin/config_file', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ configFile: JSON.stringify(config) }),
                          });
                          if (response.ok) {
                            showAlert({
                              type: 'success',
                              title: '写入成功',
                              message: '配置已成功写入JSON文件，视频源列表已更新',
                              timer: 2000,
                            });
                            await refreshConfig();
                          } else {
                            const errorData = await response.json().catch(() => ({}));
                            throw new Error(errorData.error || '写入配置文件失败');
                          }
                        } catch (err) {
                          showError(
                            err instanceof Error ? err.message : '写入失败',
                            showAlert
                          );
                        }
                      });
                    }}
                    className={buttonStyles.success}
                    disabled={isEditing}
                  >
                    写入JSON文件
                  </button>
                  <button
                    onClick={() => {
                      if (isEditing) {
                        // 取消编辑，恢复原始配置
                        setJsonConfig(JSON.stringify(config, null, 2));
                        setJsonError(null);
                        setIsEditing(false);
                      } else {
                        // 开始编辑
                        setIsEditing(true);
                      }
                    }}
                    className={isEditing ? buttonStyles.warning : buttonStyles.secondary}
                  >
                    {isEditing ? '取消编辑' : '编辑JSON'}
                  </button>
                </div>
              </div>
              
              {/* JSON配置编辑/预览 */}
              <div>
                <div className='font-medium text-gray-900 dark:text-gray-100 mb-2'>
                  {isEditing ? '配置文件编辑' : '配置文件预览'}
                </div>
                {isEditing ? (
                  <>
                    <div className='p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-300 dark:border-gray-700 overflow-auto max-h-96'>
                      <textarea
                        value={jsonConfig}
                        onChange={handleJsonChange}
                        className='w-full h-full p-0 m-0 bg-transparent border-none resize-none text-xs text-gray-800 dark:text-gray-200 font-mono'
                        style={{ minHeight: '300px' }}
                        spellCheck={false}
                      />
                    </div>
                    {jsonError && (
                      <div className='p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800'>
                        <div className='text-sm text-red-700 dark:text-red-300'>
                          JSON语法错误: {jsonError}
                        </div>
                      </div>
                    )}
                    <div className='flex justify-end space-x-2 mt-2'>
                      <button
                        onClick={applyJsonConfig}
                        disabled={!!jsonError || isLoading('applyJsonConfig')}
                        className={`${buttonStyles.success} ${(!!jsonError || isLoading('applyJsonConfig')) ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        应用配置
                      </button>
                    </div>
                  </>
                ) : (
                  <div className='p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-300 dark:border-gray-700 overflow-auto max-h-48'>
                    <pre className='text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap'>
                      {JSON.stringify(config, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* 订阅管理 */}
        <div>
          <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>
            订阅管理
          </h4>
          <div className='space-y-4'>
            {/* 订阅URL */}
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4 items-start'>
              <div className='md:col-span-1'>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  订阅URL
                </label>
                <div className='text-xs text-gray-500 dark:text-gray-400'>
                  配置订阅的远程URL，用于自动更新配置
                </div>
              </div>
              <div className='md:col-span-2'>
                <input
                  type='text'
                  placeholder='订阅URL'
                  value={config.ConfigSubscribtion.URL}
                  onChange={(e) => {
                    setConfig((prev) => ({
                      ...prev!,
                      ConfigSubscribtion: {
                        ...prev!.ConfigSubscribtion,
                        URL: e.target.value,
                      },
                    }));
                  }}
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
              </div>
            </div>
            
            {/* 自动更新开关 */}
            <div className='p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800'>
              <div className='flex items-center justify-between'>
                <div>
                  <div className='font-medium text-gray-900 dark:text-gray-100'>
                    自动更新
                  </div>
                  <div className='text-sm text-gray-600 dark:text-gray-400'>
                    启用后，系统将定期自动更新配置
                  </div>
                  <div className='text-xs text-gray-500 dark:text-gray-500 mt-1'>
                    上次检查: {config.ConfigSubscribtion.LastCheck}
                  </div>
                </div>
                <div className='flex items-center'>
                  <button
                    type='button'
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${config.ConfigSubscribtion.AutoUpdate ? buttonStyles.toggleOn : buttonStyles.toggleOff}`}
                    role='switch'
                    aria-checked={config.ConfigSubscribtion.AutoUpdate}
                    onClick={async () => {
                      // 乐观更新：立即更新UI状态
                      const previousValue = config.ConfigSubscribtion.AutoUpdate;
                      const newValue = !previousValue;

                      // 立即更新本地状态
                      setConfig((prev) => ({
                        ...prev!,
                        ConfigSubscribtion: {
                          ...prev!.ConfigSubscribtion,
                          AutoUpdate: newValue,
                        },
                      }));

                      await withLoading('toggleAutoUpdate', async () => {
                        try {
                          const response = await fetch('/api/admin/config', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              ...config,
                              ConfigSubscribtion: {
                                ...config.ConfigSubscribtion,
                                AutoUpdate: newValue,
                              },
                            }),
                          });
                          if (response.ok) {
                            showAlert({
                              type: 'success',
                              title: '设置已更新',
                              message: newValue
                                ? '已开启自动更新'
                                : '已关闭自动更新',
                              timer: 2000,
                            });
                            await refreshConfig();
                          } else {
                            throw new Error('更新配置失败');
                          }
                        } catch (err) {
                          // 发生错误时回滚状态
                          setConfig((prev) => ({
                            ...prev!,
                            ConfigSubscribtion: {
                              ...prev!.ConfigSubscribtion,
                              AutoUpdate: previousValue,
                            },
                          }));
                          showError(
                            err instanceof Error ? err.message : '操作失败',
                            showAlert
                          );
                        }
                      });
                    }}
                  >
                    <span
                      aria-hidden='true'
                      className={`pointer-events-none inline-block h-5 w-5 rounded-full ${buttonStyles.toggleThumb} shadow transform ring-0 transition duration-200 ease-in-out ${config.ConfigSubscribtion.AutoUpdate ? buttonStyles.toggleThumbOn : buttonStyles.toggleThumbOff}`}
                    />
                  </button>
                  <span className='ml-3 text-sm font-medium text-gray-900 dark:text-gray-100'>
                    {config.ConfigSubscribtion.AutoUpdate ? '开启' : '关闭'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* 手动更新按钮 */}
            <div className='flex justify-end'>
              <button
                onClick={async () => {
                  await withLoading('manualUpdateConfig', async () => {
                    try {
                      const response = await fetch('/api/admin/config/update', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(config.ConfigSubscribtion),
                      });
                      if (response.ok) {
                        showAlert({
                          type: 'success',
                          title: '更新成功',
                          message: '配置已成功更新',
                          timer: 2000,
                        });
                        await refreshConfig();
                      } else {
                        throw new Error('更新失败');
                      }
                    } catch (err) {
                      showError(
                        err instanceof Error ? err.message : '更新失败',
                        showAlert
                      );
                    }
                  });
                }}
                className={buttonStyles.success}
              >
                手动更新配置
              </button>
            </div>
          </div>
        </div>
        
        {/* 保存设置按钮 */}
        <div className='flex justify-end'>
          <button
            onClick={async () => {
              await withLoading('saveConfigSubscription', async () => {
                try {
                  const response = await fetch('/api/admin/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(config),
                  });
                  if (response.ok) {
                    showAlert({
                      type: 'success',
                      title: '保存成功',
                      message: '配置订阅设置已成功保存',
                      timer: 2000,
                    });
                    await refreshConfig();
                  } else {
                    throw new Error('保存配置失败');
                  }
                } catch (err) {
                  showError(
                    err instanceof Error ? err.message : '保存失败',
                    showAlert
                  );
                }
              });
            }}
            disabled={isLoading('saveConfigSubscription')}
            className={`${buttonStyles.primary} ${isLoading('saveConfigSubscription') ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            保存设置
          </button>
        </div>
      </div>
    </CollapsibleTab>
  );
};

export default ConfigSubscription;