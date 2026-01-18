import React from 'react';
import { Settings } from 'lucide-react';
import { AdminConfig } from '@/lib/admin.types';
import { useAlertModal, showSuccess, showError } from './useAlertModal';
import { useLoadingState } from './useLoadingState';
import { buttonStyles } from './ButtonStyles';
import CollapsibleTab from './CollapsibleTab';

// 站点配置组件的属性定义
export interface SiteConfigProps {
  config: AdminConfig | null;
  role: 'owner' | 'admin' | null;
  refreshConfig: () => Promise<void>;
  setConfig: React.Dispatch<React.SetStateAction<AdminConfig | null>>;
}

// 站点配置组件
const SiteConfig = ({
  config,
  role,
  refreshConfig,
  setConfig,
}: SiteConfigProps) => {
  const { alertModal, showAlert, hideAlert } = useAlertModal();
  const { isLoading, withLoading } = useLoadingState();
  
  if (!config) {
    return (
      <div className='text-center text-gray-500 dark:text-gray-400'>
        加载中...
      </div>
    );
  }
  
  return (
    <CollapsibleTab
      title="站点配置"
      icon={<Settings className="w-6 h-6 text-blue-500" />}
      isExpanded={true}
      onToggle={() => {}}
    >
      <div className='space-y-6'>
        {/* 站点基本设置 */}
        <div>
          <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>
            基本设置
          </h4>
          <div className='space-y-4'>
            {/* 站点名称 */}
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4 items-start'>
              <div className='md:col-span-1'>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  站点名称
                </label>
                <div className='text-xs text-gray-500 dark:text-gray-400'>
                  显示在网站标题和导航栏中的站点名称
                </div>
              </div>
              <div className='md:col-span-2'>
                <input
                  type='text'
                  placeholder='站点名称'
                  value={config.SiteConfig.SiteName}
                  onChange={(e) => {
                    setConfig((prev) => ({
                      ...prev!,
                      SiteConfig: {
                        ...prev!.SiteConfig,
                        SiteName: e.target.value,
                      },
                    }));
                  }}
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
              </div>
            </div>
            
            {/* 公告 */}
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4 items-start'>
              <div className='md:col-span-1'>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  站点公告
                </label>
                <div className='text-xs text-gray-500 dark:text-gray-400'>
                  显示在网站顶部的公告信息，支持换行
                </div>
              </div>
              <div className='md:col-span-2'>
                <textarea
                  placeholder='站点公告'
                  value={config.SiteConfig.Announcement}
                  onChange={(e) => {
                    setConfig((prev) => ({
                      ...prev!,
                      SiteConfig: {
                        ...prev!.SiteConfig,
                        Announcement: e.target.value,
                      },
                    }));
                  }}
                  rows={3}
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* 搜索设置 */}
        <div>
          <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>
            搜索设置
          </h4>
          <div className='space-y-4'>
            {/* 搜索下游最大页数 */}
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4 items-center'>
              <div className='md:col-span-1'>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  搜索下游最大页数
                </label>
                <div className='text-xs text-gray-500 dark:text-gray-400'>
                  搜索时从下游源获取的最大页数
                </div>
              </div>
              <div className='md:col-span-2'>
                <input
                  type='number'
                  min='1'
                  max='20'
                  placeholder='搜索下游最大页数'
                  value={config.SiteConfig.SearchDownstreamMaxPage}
                  onChange={(e) => {
                    setConfig((prev) => ({
                      ...prev!,
                      SiteConfig: {
                        ...prev!.SiteConfig,
                        SearchDownstreamMaxPage: parseInt(e.target.value),
                      },
                    }));
                  }}
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
              </div>
            </div>
            
            {/* 站点接口缓存时间 */}
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4 items-center'>
              <div className='md:col-span-1'>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  站点接口缓存时间 (秒)
                </label>
                <div className='text-xs text-gray-500 dark:text-gray-400'>
                  站点接口数据的缓存时间，单位为秒
                </div>
              </div>
              <div className='md:col-span-2'>
                <input
                  type='number'
                  min='0'
                  max='86400'
                  placeholder='站点接口缓存时间'
                  value={config.SiteConfig.SiteInterfaceCacheTime}
                  onChange={(e) => {
                    setConfig((prev) => ({
                      ...prev!,
                      SiteConfig: {
                        ...prev!.SiteConfig,
                        SiteInterfaceCacheTime: parseInt(e.target.value),
                      },
                    }));
                  }}
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
              </div>
            </div>
            
            {/* 流畅搜索 */}
            <div className='p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800'>
              <div className='flex items-center justify-between'>
                <div>
                  <div className='font-medium text-gray-900 dark:text-gray-100'>
                    流畅搜索
                  </div>
                  <div className='text-sm text-gray-600 dark:text-gray-400'>
                    启用后，搜索结果将以流畅方式加载，提升用户体验
                  </div>
                </div>
                <div className='flex items-center'>
                  <button
                    type='button'
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${config.SiteConfig.FluidSearch ? buttonStyles.toggleOn : buttonStyles.toggleOff}`}
                    role='switch'
                    aria-checked={config.SiteConfig.FluidSearch}
                    onClick={async () => {
                      // 乐观更新：立即更新UI状态
                      const previousValue = config.SiteConfig.FluidSearch;
                      const newValue = !previousValue;

                      // 立即更新本地状态
                      setConfig((prev) => ({
                        ...prev!,
                        SiteConfig: {
                          ...prev!.SiteConfig,
                          FluidSearch: newValue,
                        },
                      }));

                      await withLoading('toggleFluidSearch', async () => {
                        try {
                          const response = await fetch('/api/admin/config', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              ...config,
                              SiteConfig: {
                                ...config.SiteConfig,
                                FluidSearch: newValue,
                              },
                            }),
                          });
                          if (response.ok) {
                            showAlert({
                              type: 'success',
                              title: '设置已更新',
                              message: newValue
                                ? '已开启流畅搜索'
                                : '已关闭流畅搜索',
                              timer: 2000,
                            });
                          } else {
                            throw new Error('更新配置失败');
                          }
                        } catch (err) {
                          // 发生错误时回滚状态
                          setConfig((prev) => ({
                            ...prev!,
                            SiteConfig: {
                              ...prev!.SiteConfig,
                              FluidSearch: previousValue,
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
                      className={`pointer-events-none inline-block h-5 w-5 rounded-full ${buttonStyles.toggleThumb} shadow transform ring-0 transition duration-200 ease-in-out ${config.SiteConfig.FluidSearch ? buttonStyles.toggleThumbOn : buttonStyles.toggleThumbOff}`}
                    />
                  </button>
                  <span className='ml-3 text-sm font-medium text-gray-900 dark:text-gray-100'>
                    {config.SiteConfig.FluidSearch ? '开启' : '关闭'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* 豆瓣设置 */}
        <div>
          <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>
            豆瓣设置
          </h4>
          <div className='space-y-4'>
            {/* 豆瓣代理类型 */}
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4 items-center'>
              <div className='md:col-span-1'>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  豆瓣代理类型
                </label>
                <div className='text-xs text-gray-500 dark:text-gray-400'>
                  选择豆瓣API的代理类型
                </div>
              </div>
              <div className='md:col-span-2'>
                <select
                  value={config.SiteConfig.DoubanProxyType}
                  onChange={(e) => {
                    setConfig((prev) => ({
                      ...prev!,
                      SiteConfig: {
                        ...prev!.SiteConfig,
                        DoubanProxyType: e.target.value,
                      },
                    }));
                  }}
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                >
                  <option value=''>无代理</option>
                  <option value='http'>HTTP代理</option>
                  <option value='https'>HTTPS代理</option>
                  <option value='socks5'>SOCKS5代理</option>
                </select>
              </div>
            </div>
            
            {/* 豆瓣代理地址 */}
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4 items-center'>
              <div className='md:col-span-1'>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  豆瓣代理地址
                </label>
                <div className='text-xs text-gray-500 dark:text-gray-400'>
                  豆瓣API的代理地址，格式为：host:port
                </div>
              </div>
              <div className='md:col-span-2'>
                <input
                  type='text'
                  placeholder='豆瓣代理地址'
                  value={config.SiteConfig.DoubanProxy}
                  onChange={(e) => {
                    setConfig((prev) => ({
                      ...prev!,
                      SiteConfig: {
                        ...prev!.SiteConfig,
                        DoubanProxy: e.target.value,
                      },
                    }));
                  }}
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
              </div>
            </div>
            
            {/* 豆瓣图片代理类型 */}
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4 items-center'>
              <div className='md:col-span-1'>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  豆瓣图片代理类型
                </label>
                <div className='text-xs text-gray-500 dark:text-gray-400'>
                  选择豆瓣图片的代理类型
                </div>
              </div>
              <div className='md:col-span-2'>
                <select
                  value={config.SiteConfig.DoubanImageProxyType}
                  onChange={(e) => {
                    setConfig((prev) => ({
                      ...prev!,
                      SiteConfig: {
                        ...prev!.SiteConfig,
                        DoubanImageProxyType: e.target.value,
                      },
                    }));
                  }}
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                >
                  <option value=''>无代理</option>
                  <option value='http'>HTTP代理</option>
                  <option value='https'>HTTPS代理</option>
                  <option value='socks5'>SOCKS5代理</option>
                </select>
              </div>
            </div>
            
            {/* 豆瓣图片代理地址 */}
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4 items-center'>
              <div className='md:col-span-1'>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  豆瓣图片代理地址
                </label>
                <div className='text-xs text-gray-500 dark:text-gray-400'>
                  豆瓣图片的代理地址，格式为：host:port
                </div>
              </div>
              <div className='md:col-span-2'>
                <input
                  type='text'
                  placeholder='豆瓣图片代理地址'
                  value={config.SiteConfig.DoubanImageProxy}
                  onChange={(e) => {
                    setConfig((prev) => ({
                      ...prev!,
                      SiteConfig: {
                        ...prev!.SiteConfig,
                        DoubanImageProxy: e.target.value,
                      },
                    }));
                  }}
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* 安全设置 */}
        <div>
          <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>
            安全设置
          </h4>
          <div className='space-y-4'>
            {/* 禁用黄色过滤 */}
            <div className='p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800'>
              <div className='flex items-center justify-between'>
                <div>
                  <div className='font-medium text-gray-900 dark:text-gray-100'>
                    禁用黄色过滤
                  </div>
                  <div className='text-sm text-gray-600 dark:text-gray-400'>
                    关闭后，系统将启用黄色内容过滤，保护用户安全
                  </div>
                </div>
                <div className='flex items-center'>
                  <button
                    type='button'
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${config.SiteConfig.DisableYellowFilter ? buttonStyles.toggleOn : buttonStyles.toggleOff}`}
                    role='switch'
                    aria-checked={config.SiteConfig.DisableYellowFilter}
                    onClick={async () => {
                      // 乐观更新：立即更新UI状态
                      const previousValue = config.SiteConfig.DisableYellowFilter;
                      const newValue = !previousValue;

                      // 立即更新本地状态
                      setConfig((prev) => ({
                        ...prev!,
                        SiteConfig: {
                          ...prev!.SiteConfig,
                          DisableYellowFilter: newValue,
                        },
                      }));

                      await withLoading('toggleDisableYellowFilter', async () => {
                        try {
                          const response = await fetch('/api/admin/config', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              ...config,
                              SiteConfig: {
                                ...config.SiteConfig,
                                DisableYellowFilter: newValue,
                              },
                            }),
                          });
                          if (response.ok) {
                            showAlert({
                              type: 'success',
                              title: '设置已更新',
                              message: newValue
                                ? '已禁用黄色过滤'
                                : '已启用黄色过滤',
                              timer: 2000,
                            });
                          } else {
                            throw new Error('更新配置失败');
                          }
                        } catch (err) {
                          // 发生错误时回滚状态
                          setConfig((prev) => ({
                            ...prev!,
                            SiteConfig: {
                              ...prev!.SiteConfig,
                              DisableYellowFilter: previousValue,
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
                      className={`pointer-events-none inline-block h-5 w-5 rounded-full ${buttonStyles.toggleThumb} shadow transform ring-0 transition duration-200 ease-in-out ${config.SiteConfig.DisableYellowFilter ? buttonStyles.toggleThumbOn : buttonStyles.toggleThumbOff}`}
                    />
                  </button>
                  <span className='ml-3 text-sm font-medium text-gray-900 dark:text-gray-100'>
                    {config.SiteConfig.DisableYellowFilter ? '禁用' : '启用'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* 保存设置按钮 */}
        <div className='flex justify-end'>
          <button
            onClick={async () => {
              await withLoading('saveSiteConfig', async () => {
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
                      message: '站点配置已成功保存',
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
            disabled={isLoading('saveSiteConfig')}
            className={`${buttonStyles.primary} ${isLoading('saveSiteConfig') ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            保存站点配置
          </button>
        </div>
      </div>
    </CollapsibleTab>
  );
};

export default SiteConfig;
