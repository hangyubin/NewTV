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
  const [isSubscribedConfig, setIsSubscribedConfig] = React.useState<boolean>(false);
  
  // 当配置变化时，更新JSON文本
  React.useEffect(() => {
    if (config) {
      // 安全检查：确保ConfigSubscribtion存在
      const subscribtion = config.ConfigSubscribtion || { URL: '', AutoUpdate: false, LastCheck: '' };
      // 检查是否有订阅URL，如果有则标记为订阅配置
      setIsSubscribedConfig(!!subscribtion.URL.trim());
      setJsonConfig(JSON.stringify(config, null, 2));
      setJsonError(null);
    }
  }, [config]);
  
  // 智能JSON清理：移除无效字符，使JSON符合标准格式
  const cleanupJson = (jsonStr: string): string => {
    let cleaned = jsonStr;
    
    // 移除所有反引号
    cleaned = cleaned.replace(/`/g, '');
    
    // 移除可能的HTML标签
    cleaned = cleaned.replace(/<[^>]*>/g, '');
    
    // 移除可能的注释
    cleaned = cleaned.replace(/\/\/.*$/gm, '');
    cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // 确保字符串使用双引号
    // 注意：这个处理比较简单，可能需要根据实际情况调整
    cleaned = cleaned.replace(/'([^']*)'/g, '"$1"');
    
    return cleaned;
  };
  
  // 验证JSON语法 - 支持清理后再验证
  const validateJson = (jsonStr: string): boolean => {
    try {
      JSON.parse(jsonStr);
      setJsonError(null);
      return true;
    } catch (err) {
      // 尝试清理后再验证
      try {
        const cleanedJson = cleanupJson(jsonStr);
        JSON.parse(cleanedJson);
        setJsonError(null);
        return true;
      } catch (cleanedErr) {
        // 提供更友好的错误信息
        let errorMsg = '无效的JSON格式';
        if (cleanedErr instanceof Error) {
          errorMsg = `JSON语法错误: ${cleanedErr.message}`;
          // 添加常见错误提示
          if (cleanedErr.message.includes('Unexpected token')) {
            errorMsg += '，系统已尝试自动清理无效字符，但仍无法解析';
          }
        }
        setJsonError(errorMsg);
        return false;
      }
    }
  };
  
  // 处理JSON文本变化 - 只有非订阅配置才能修改
  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!isSubscribedConfig) {
      let value = e.target.value;
      setJsonConfig(value);
      validateJson(value);
    }
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
              <div className='md:col-span-2 flex flex-col sm:flex-row gap-2'>
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
                  className='flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
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
                            message: '订阅链接可用，配置文件检查更新完成',
                            timer: 2000,
                          });
                          await refreshConfig();
                        } else {
                          throw new Error('订阅链接不可用或检查更新失败');
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
                  disabled={!config.ConfigSubscribtion.URL.trim()}
                >
                  检查更新
                </button>
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
          </div>
        </div>
        
        {/* 配置文件信息 */}
        <div>
          <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>
            配置文件
          </h4>
          <div className='p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800'>
            <div className='space-y-4'>
              <div>
                <div className='font-medium text-gray-900 dark:text-gray-100 mb-2'>
                  配置文件编辑
                </div>
                <div className='overflow-auto max-h-[50rem]'>
                  <textarea
                    value={jsonConfig}
                    onChange={handleJsonChange}
                    className={`w-full h-full p-0 m-0 bg-transparent border-none resize-none text-xs text-gray-800 dark:text-gray-200 font-mono ${isSubscribedConfig ? 'opacity-60' : ''}`}
                    style={{ minHeight: '500px' }}
                    spellCheck={false}
                    disabled={isSubscribedConfig}
                  />
                </div>
                {jsonError && !isSubscribedConfig && (
                  <div className='p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 mt-2'>
                    <div className='text-sm text-red-700 dark:text-red-300'>
                      JSON语法错误: {jsonError}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* 保存设置按钮 - 只有非订阅配置才能保存 */}
        {!isSubscribedConfig && (
          <div className='flex justify-end'>
            <button
              onClick={async () => {
                // 验证JSON语法
                if (!validateJson(jsonConfig)) {
                  showAlert({
                    type: 'error',
                    title: 'JSON格式错误',
                    message: jsonError || '无效的JSON格式',
                    showConfirm: true,
                  });
                  return;
                }
                
                await withLoading('saveConfigSubscription', async () => {
                  try {
                    // 添加详细日志，帮助调试
                    console.log('开始保存配置...');
                    console.log('原始JSON配置:', jsonConfig);
                    
                    // 智能清理JSON，确保符合标准格式
                    const cleanedJson = cleanupJson(jsonConfig);
                    console.log('清理后的JSON配置:', cleanedJson);
                    
                    // 首先验证JSON配置
                    let parsedConfig: unknown;
                    try {
                      parsedConfig = JSON.parse(cleanedJson);
                      console.log('JSON解析成功:', typeof parsedConfig);
                    } catch (parseErr) {
                      console.error('JSON解析失败:', parseErr);
                      throw new Error(`JSON解析错误: ${parseErr instanceof Error ? parseErr.message : '无效的JSON格式'}`);
                    }
                    
                    // 验证解析后的配置结构
                    if (!parsedConfig || typeof parsedConfig !== 'object') {
                      console.error('配置结构无效:', parsedConfig);
                      throw new Error('解析后的配置必须是一个对象');
                    }
                    
                    // 更新配置状态 - 添加错误捕获
                    try {
                      setConfig(parsedConfig as AdminConfig);
                      console.log('配置状态更新成功');
                    } catch (setConfigErr) {
                      console.error('配置状态更新失败:', setConfigErr);
                      throw new Error(`配置状态更新失败: ${setConfigErr instanceof Error ? setConfigErr.message : '未知错误'}`);
                    }
                    
                    // 保存配置到数据库 - 使用清理后的JSON
                    console.log('开始保存到数据库...');
                    let saveResponse: Response;
                    try {
                      // 设置5秒超时
                      const savePromise = fetch('/api/admin/config', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: cleanedJson,
                      });
                      saveResponse = await Promise.race([
                        savePromise,
                        new Promise<Response>((_, reject) => 
                          setTimeout(() => reject(new Error('数据库保存超时')), 5000)
                        )
                      ]);
                      console.log('数据库保存响应:', saveResponse.status, saveResponse.statusText);
                    } catch (saveErr) {
                      console.error('数据库保存失败:', saveErr);
                      throw new Error(`数据库保存失败: ${saveErr instanceof Error ? saveErr.message : '未知错误'}`);
                    }
                    
                    // 写入JSON文件 - 使用清理后的JSON
                    console.log('开始写入JSON文件...');
                    let writeResponse: Response;
                    try {
                      // 设置5秒超时
                      const writePromise = fetch('/api/admin/config_file', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ configFile: cleanedJson }),
                      });
                      writeResponse = await Promise.race([
                        writePromise,
                        new Promise<Response>((_, reject) => 
                          setTimeout(() => reject(new Error('JSON文件写入超时')), 5000)
                        )
                      ]);
                      console.log('JSON文件写入响应:', writeResponse.status, writeResponse.statusText);
                    } catch (writeErr) {
                      console.error('JSON文件写入失败:', writeErr);
                      throw new Error(`JSON文件写入失败: ${writeErr instanceof Error ? writeErr.message : '未知错误'}`);
                    }
                    
                    if (saveResponse.ok && writeResponse.ok) {
                      console.log('保存成功');
                      showAlert({
                        type: 'success',
                        title: '保存成功',
                        message: '配置已成功保存并写入JSON文件，视频源列表已更新',
                        timer: 2000,
                      });
                      // 刷新配置 - 添加错误捕获
                      try {
                        await refreshConfig();
                        console.log('配置刷新成功');
                      } catch (refreshErr) {
                        console.error('配置刷新失败:', refreshErr);
                        // 刷新失败不影响保存成功的结果，只记录日志
                      }
                    } else {
                      // 获取详细错误信息
                      let saveErrorMsg = '';
                      let writeErrorMsg = '';
                      
                      try {
                        const saveError = await saveResponse.json();
                        saveErrorMsg = saveError.error || `HTTP ${saveResponse.status}: ${saveResponse.statusText}`;
                      } catch {
                        saveErrorMsg = `HTTP ${saveResponse.status}: ${saveResponse.statusText}`;
                      }
                      
                      try {
                        const writeError = await writeResponse.json();
                        writeErrorMsg = writeError.error || `HTTP ${writeResponse.status}: ${writeResponse.statusText}`;
                      } catch {
                        writeErrorMsg = `HTTP ${writeResponse.status}: ${writeResponse.statusText}`;
                      }
                      
                      const errorMsg = `保存失败 - 数据库: ${saveErrorMsg}, JSON文件: ${writeErrorMsg}`;
                      console.error(errorMsg);
                      throw new Error(errorMsg);
                    }
                  } catch (err) {
                    console.error('保存设置总错误:', err);
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
        )}
      </div>
    </CollapsibleTab>
  );
};

export default ConfigSubscription;