/* eslint-disable @typescript-eslint/no-explicit-any, no-console, @typescript-eslint/no-non-null-assertion,react-hooks/exhaustive-deps,@typescript-eslint/no-empty-function */

'use client';



import { useCallback, useEffect,useState } from 'react';

import { AdminConfig } from '@/lib/admin.types';

import DataMigration from '@/components/DataMigration';
import PageLayout from '@/components/PageLayout';


// 主管理页面组件
const AdminPage = () => {
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [role, setRole] = useState<'owner' | 'admin' | null>(null);
  const [activeTab, setActiveTab] = useState('site');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [expandedTabs, setExpandedTabs] = useState<{
    [key: string]: boolean;
  }>({
    site: true,
    user: false,
    dataSource: false,
    liveDataSource: false,
    customCategory: false,
    dataMigration: false,
  });

  // 直播源管理状态
  const [isAddLiveSourceModalOpen, setIsAddLiveSourceModalOpen] = useState(false);
  const [isEditLiveSourceModalOpen, setIsEditLiveSourceModalOpen] = useState(false);
  const [currentLiveSource, setCurrentLiveSource] = useState<any>({
    key: '',
    name: '',
    url: '',
    ua: '',
    epg: ''
  });

  // 自定义分类管理状态
  const [isAddCustomCategoryModalOpen, setIsAddCustomCategoryModalOpen] = useState(false);
  const [isEditCustomCategoryModalOpen, setIsEditCustomCategoryModalOpen] = useState(false);
  const [currentCustomCategory, setCurrentCustomCategory] = useState<any>({
    name: '',
    type: 'movie',
    query: ''
  });

  // 配置文件设置状态
  const [isConfigFileModalOpen, setIsConfigFileModalOpen] = useState(false);
  const [configFileContent, setConfigFileContent] = useState('');
  const [subscriptionUrl, setSubscriptionUrl] = useState('');
  const [autoUpdate, setAutoUpdate] = useState(false);

  const refreshConfig = useCallback(async () => {
    const res = await fetch('/api/admin/config');
    if (res.ok) {
      const data = await res.json();
      setConfig(data.Config);
      setRole(data.Role);
    }
  }, []);

  useEffect(() => {
    refreshConfig();
  }, [refreshConfig]);

  const toggleTab = (tab: string) => {
    setActiveTab(tab);
    setExpandedTabs(prev => ({
      ...prev,
      [tab]: !prev[tab],
    }));
  };

  // 直播源管理事件处理函数
  const handleAddLiveSource = () => {
    setCurrentLiveSource({
      key: '',
      name: '',
      url: '',
      ua: '',
      epg: ''
    });
    setIsAddLiveSourceModalOpen(true);
  };

  const handleEditLiveSource = (liveSource: any) => {
    setCurrentLiveSource(liveSource);
    setIsEditLiveSourceModalOpen(true);
  };

  const handleLiveSourceSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const action = isEditLiveSourceModalOpen ? 'edit' : 'add';
      const response = await fetch('/api/admin/live', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          ...currentLiveSource
        })
      });
      if (response.ok) {
        await refreshConfig();
        if (isEditLiveSourceModalOpen) {
          setIsEditLiveSourceModalOpen(false);
        } else {
          setIsAddLiveSourceModalOpen(false);
        }
      }
    } catch (error) {
      console.error('操作失败:', error);
    }
  };

  const handleDeleteLiveSource = async (key: string) => {
    try {
      const response = await fetch('/api/admin/live', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'delete',
          key
        })
      });
      if (response.ok) {
        await refreshConfig();
      }
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  const handleToggleLiveSourceStatus = async (key: string, currentStatus: boolean) => {
    try {
      const action = currentStatus ? 'disable' : 'enable';
      const response = await fetch('/api/admin/live', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          key
        })
      });
      if (response.ok) {
        await refreshConfig();
      }
    } catch (error) {
      console.error('操作失败:', error);
    }
  };

  // 自定义分类管理事件处理函数
  const handleAddCustomCategory = () => {
    setCurrentCustomCategory({
      name: '',
      type: 'movie',
      query: ''
    });
    setIsAddCustomCategoryModalOpen(true);
  };

  const handleEditCustomCategory = (category: any) => {
    setCurrentCustomCategory(category);
    setIsEditCustomCategoryModalOpen(true);
  };

  const handleCustomCategorySubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const action = isEditCustomCategoryModalOpen ? 'edit' : 'add';
      const response = await fetch('/api/admin/category', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          ...currentCustomCategory
        })
      });
      if (response.ok) {
        await refreshConfig();
        if (isEditCustomCategoryModalOpen) {
          setIsEditCustomCategoryModalOpen(false);
        } else {
          setIsAddCustomCategoryModalOpen(false);
        }
      }
    } catch (error) {
      console.error('操作失败:', error);
    }
  };

  const handleDeleteCustomCategory = async (query: string, type: string) => {
    try {
      const response = await fetch('/api/admin/category', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'delete',
          query,
          type
        })
      });
      if (response.ok) {
        await refreshConfig();
      }
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  const handleToggleCustomCategoryStatus = async (query: string, type: string, currentStatus: boolean) => {
    try {
      const action = currentStatus ? 'disable' : 'enable';
      const response = await fetch('/api/admin/category', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          query,
          type
        })
      });
      if (response.ok) {
        await refreshConfig();
      }
    } catch (error) {
      console.error('操作失败:', error);
    }
  };

  // 配置文件设置事件处理函数
  const handleOpenConfigFileModal = () => {
    if (config) {
      setConfigFileContent(config.ConfigFile || '');
      setSubscriptionUrl(config.ConfigSubscribtion.URL || '');
      setAutoUpdate(config.ConfigSubscribtion.AutoUpdate || false);
    }
    setIsConfigFileModalOpen(true);
  };

  // 视频源多选功能状态
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // 处理单个视频源选择
  const handleSelectSource = (key: string) => {
    setSelectedSources(prev => {
      if (prev.includes(key)) {
        return prev.filter(k => k !== key);
      } else {
        return [...prev, key];
      }
    });
  };

  // 处理全选/取消全选
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedSources([]);
    } else {
      const allKeys = config?.SourceConfig.map(source => source.key) || [];
      setSelectedSources(allKeys);
    }
    setSelectAll(!selectAll);
  };

  // 处理批量删除
  const handleBatchDelete = async () => {
    if (selectedSources.length === 0) {
      alert('请先选择要删除的视频源');
      return;
    }

    if (confirm(`确定要删除选中的 ${selectedSources.length} 个视频源吗？`)) {
      try {
        const response = await fetch('/api/admin/source', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'batch_delete',
            keys: selectedSources,
          }),
        });
        if (response.ok) {
          await refreshConfig();
          setSelectedSources([]);
          setSelectAll(false);
          alert('批量删除成功！');
        } else {
          const errorData = await response.json();
          alert(`批量删除失败：${errorData.error || '未知错误'}`);
        }
      } catch (error) {
        console.error('批量删除失败:', error);
        alert('批量删除失败：网络错误');
      }
    }
  };

  // 处理批量启用/禁用
  const handleBatchToggleStatus = async (action: 'enable' | 'disable') => {
    if (selectedSources.length === 0) {
      alert('请先选择要操作的视频源');
      return;
    }

    try {
      const batchAction = action === 'enable' ? 'batch_enable' : 'batch_disable';
      const response = await fetch('/api/admin/source', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: batchAction,
          keys: selectedSources,
        }),
      });
      if (response.ok) {
        await refreshConfig();
        setSelectedSources([]);
        setSelectAll(false);
        alert(`批量${action === 'enable' ? '启用' : '禁用'}成功！`);
      } else {
        const errorData = await response.json();
        alert(`批量${action === 'enable' ? '启用' : '禁用'}失败：${errorData.error || '未知错误'}`);
      }
    } catch (error) {
      console.error(`批量${action === 'enable' ? '启用' : '禁用'}失败:`, error);
      alert(`批量${action === 'enable' ? '启用' : '禁用'}失败：网络错误`);
    }
  };

  const handleConfigFileSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const response = await fetch('/api/admin/config_file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          configFile: configFileContent,
          subscriptionUrl,
          autoUpdate,
          lastCheckTime: new Date().toISOString()
        })
      });
      if (response.ok) {
        await refreshConfig();
        setIsConfigFileModalOpen(false);
      }
    } catch (error) {
      console.error('操作失败:', error);
    }
  };

  // 保存站点配置
  const handleSiteConfigSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    
    // 构建站点配置对象
    const siteConfig = {
      SiteName: formData.get('SiteName') as string,
      Announcement: formData.get('Announcement') as string,
      SearchDownstreamMaxPage: parseInt(formData.get('SearchDownstreamMaxPage') as string || '0'),
      SiteInterfaceCacheTime: parseInt(formData.get('SiteInterfaceCacheTime') as string || '0'),
      DoubanProxyType: formData.get('DoubanProxyType') as string,
      DoubanProxy: formData.get('DoubanProxy') as string,
      DoubanImageProxyType: formData.get('DoubanImageProxyType') as string,
      DoubanImageProxy: formData.get('DoubanImageProxy') as string,
      DisableYellowFilter: formData.get('DisableYellowFilter') === 'true',
      FluidSearch: formData.get('FluidSearch') === 'true',
    };
    
    try {
      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          SiteConfig: siteConfig
        })
      });
      if (response.ok) {
        await refreshConfig();
      }
    } catch (error) {
      console.error('保存站点配置失败:', error);
    }
  };

  if (!config || !role) {
    return (
      <div className='flex items-center justify-center min-h-[50vh] text-gray-500 dark:text-gray-400'>
        加载中...
      </div>
    );
  }

  return (
    <PageLayout>
      <div className='max-w-7xl mx-auto py-6 sm:px-6 lg:px-8'>
        <div className='bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden'>
          <div className='px-6 py-4 border-b border-gray-200 dark:border-gray-700'>
            <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>管理后台</h1>
            <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>
              欢迎回来，{role === 'owner' ? '站长' : '管理员'}！
            </p>
          </div>

          <div className='p-6'>
            {/* 主标签页 */}
            <div className='mb-6 flex flex-wrap gap-2'>
              <button
                onClick={() => toggleTab('site')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'site'
                  ? 'bg-blue-600 text-white dark:bg-blue-600 dark:text-white'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
              >
                站点设置
              </button>
              <button
                onClick={() => toggleTab('user')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'user'
                  ? 'bg-blue-600 text-white dark:bg-blue-600 dark:text-white'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
              >
                用户管理
              </button>
              <button
                onClick={() => toggleTab('dataSource')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'dataSource'
                  ? 'bg-blue-600 text-white dark:bg-blue-600 dark:text-white'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
              >
                视频源管理
              </button>
              <button
                onClick={() => toggleTab('liveDataSource')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'liveDataSource'
                  ? 'bg-blue-600 text-white dark:bg-blue-600 dark:text-white'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
              >
                直播源管理
              </button>
              <button
                onClick={() => toggleTab('customCategory')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'customCategory'
                  ? 'bg-blue-600 text-white dark:bg-blue-600 dark:text-white'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
              >
                自定义分类
              </button>
              <button
                onClick={handleOpenConfigFileModal}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'config'
                  ? 'bg-blue-600 text-white dark:bg-blue-600 dark:text-white'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
              >
                配置文件
              </button>
              <button
                onClick={() => toggleTab('dataMigration')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'dataMigration'
                  ? 'bg-blue-600 text-white dark:bg-blue-600 dark:text-white'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
              >
                数据迁移
              </button>
            </div>

            {/* 站点设置 */}
            {activeTab === 'site' && (
              <div className='space-y-6'>
                <form onSubmit={handleSiteConfigSubmit} className='space-y-6'>
                  <div>
                  <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>
                    基本设置
                  </h4>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                        站点名称
                      </label>
                      <input
                        type='text'
                        name='SiteName'
                        placeholder='输入站点名称'
                        defaultValue={config.SiteConfig.SiteName}
                        className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                        公告
                      </label>
                      <textarea
                        name='Announcement'
                        placeholder='输入站点公告'
                        defaultValue={config.SiteConfig.Announcement}
                        rows={3}
                        className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                        搜索下游最大页数
                      </label>
                      <input
                        type='number'
                        name='SearchDownstreamMaxPage'
                        placeholder='输入搜索下游最大页数'
                        defaultValue={config.SiteConfig.SearchDownstreamMaxPage}
                        className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                        站点接口缓存时间 (秒)
                      </label>
                      <input
                        type='number'
                        name='SiteInterfaceCacheTime'
                        placeholder='输入站点接口缓存时间'
                        defaultValue={config.SiteConfig.SiteInterfaceCacheTime}
                        className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>
                    豆瓣代理设置
                  </h4>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                        豆瓣代理类型
                      </label>
                      <input
                        type='text'
                        name='DoubanProxyType'
                        placeholder='输入豆瓣代理类型'
                        defaultValue={config.SiteConfig.DoubanProxyType}
                        className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                        豆瓣代理地址
                      </label>
                      <input
                        type='text'
                        name='DoubanProxy'
                        placeholder='输入豆瓣代理地址'
                        defaultValue={config.SiteConfig.DoubanProxy}
                        className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                        豆瓣图片代理类型
                      </label>
                      <input
                        type='text'
                        name='DoubanImageProxyType'
                        placeholder='输入豆瓣图片代理类型'
                        defaultValue={config.SiteConfig.DoubanImageProxyType}
                        className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                        豆瓣图片代理地址
                      </label>
                      <input
                        type='text'
                        name='DoubanImageProxy'
                        placeholder='输入豆瓣图片代理地址'
                        defaultValue={config.SiteConfig.DoubanImageProxy}
                        className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>
                    高级设置
                  </h4>
                  <div className='space-y-4'>
                    <div className='flex items-center justify-between'>
                      <div>
                        <div className='font-medium text-gray-900 dark:text-gray-100'>
                          禁用黄色过滤
                        </div>
                        <div className='text-sm text-gray-600 dark:text-gray-400'>
                          控制是否禁用黄色内容过滤
                        </div>
                      </div>
                      <div className='flex items-center'>
                        <input
                          type='hidden'
                          name='DisableYellowFilter'
                          value={config.SiteConfig.DisableYellowFilter ? 'true' : 'false'}
                        />
                        <button
                          type="button"
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${config.SiteConfig.DisableYellowFilter ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                          role="switch"
                          aria-checked={config.SiteConfig.DisableYellowFilter}
                          onClick={(e) => {
                            const input = document.querySelector('input[name="DisableYellowFilter"]') as HTMLInputElement;
                            const button = e.currentTarget;
                            const isChecked = button.ariaChecked === 'true';
                            input.value = isChecked ? 'false' : 'true';
                            button.ariaChecked = (!isChecked).toString();
                            // 更新按钮样式
                            const newCheckedState = !isChecked;
                            button.className = `relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${newCheckedState ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`;
                            // 更新内部span样式
                            const span = button.querySelector('span');
                            if (span) {
                              span.className = `pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out ${newCheckedState ? 'translate-x-5' : 'translate-x-1'}`;
                            }
                            // 更新显示文本
                            const textSpan = button.nextElementSibling as HTMLSpanElement;
                            if (textSpan) {
                              textSpan.textContent = newCheckedState ? '开启' : '关闭';
                            }
                          }}
                        >
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out ${config.SiteConfig.DisableYellowFilter ? 'translate-x-5' : 'translate-x-1'}`}
                          />
                        </button>
                        <span className='ml-3 text-sm font-medium text-gray-900 dark:text-gray-100'>
                          {config.SiteConfig.DisableYellowFilter ? '开启' : '关闭'}
                        </span>
                      </div>
                    </div>
                    
                    <div className='flex items-center justify-between'>
                      <div>
                        <div className='font-medium text-gray-900 dark:text-gray-100'>
                          流畅搜索
                        </div>
                        <div className='text-sm text-gray-600 dark:text-gray-400'>
                          控制是否启用流畅搜索功能
                        </div>
                      </div>
                      <div className='flex items-center'>
                        <input
                          type='hidden'
                          name='FluidSearch'
                          value={config.SiteConfig.FluidSearch ? 'true' : 'false'}
                        />
                        <button
                          type="button"
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${config.SiteConfig.FluidSearch ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                          role="switch"
                          aria-checked={config.SiteConfig.FluidSearch}
                          onClick={(e) => {
                            const input = document.querySelector('input[name="FluidSearch"]') as HTMLInputElement;
                            const button = e.currentTarget;
                            const isChecked = button.ariaChecked === 'true';
                            input.value = isChecked ? 'false' : 'true';
                            button.ariaChecked = (!isChecked).toString();
                            // 更新按钮样式
                            const newCheckedState = !isChecked;
                            button.className = `relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${newCheckedState ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`;
                            // 更新内部span样式
                            const span = button.querySelector('span');
                            if (span) {
                              span.className = `pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out ${newCheckedState ? 'translate-x-5' : 'translate-x-1'}`;
                            }
                            // 更新显示文本
                            const textSpan = button.nextElementSibling as HTMLSpanElement;
                            if (textSpan) {
                              textSpan.textContent = newCheckedState ? '开启' : '关闭';
                            }
                          }}
                        >
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out ${config.SiteConfig.FluidSearch ? 'translate-x-5' : 'translate-x-1'}`}
                          />
                        </button>
                        <span className='ml-3 text-sm font-medium text-gray-900 dark:text-gray-100'>
                          {config.SiteConfig.FluidSearch ? '开启' : '关闭'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* 保存按钮 */}
                <div className='flex justify-end space-x-3 mt-6'>
                  <button
                    type='submit'
                    className='px-4 py-2 bg-blue-600 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-700'
                  >
                    保存
                  </button>
                </div>
              </form>
            </div>
          )}

            {/* 用户管理 */}
            {activeTab === 'user' && (
              <div className='space-y-6'>
                {/* 用户注册设置 - 仅站长可见 */}
                {role === 'owner' && (
                  <div>
                    <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>
                      注册设置
                    </h4>
                    <div className='p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800'>
                      <div className='flex items-center justify-between'>
                        <div>
                          <div className='font-medium text-gray-900 dark:text-gray-100'>
                            允许用户注册
                          </div>
                          <div className='text-sm text-gray-600 dark:text-gray-400'>
                            控制是否允许新用户通过注册页面自行注册账户
                          </div>
                        </div>
                        <div className='flex items-center'>
                          <button
                            type="button"
                            className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 bg-gray-200 dark:bg-gray-700"
                            role="switch"
                            aria-checked={false}
                          >
                            <span
                              aria-hidden="true"
                              className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out translate-x-1"
                            />
                          </button>
                          <span className='ml-3 text-sm font-medium text-gray-900 dark:text-gray-100'>
                            关闭
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 用户统计 */}
                <div>
                  <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>
                    用户统计
                  </h4>
                  <div className='grid grid-cols-3 gap-4'>
                    <div className='p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800'>
                      <div className='text-2xl font-bold text-green-800 dark:text-green-300'>
                        {config.UserConfig.Users.length}
                      </div>
                      <div className='text-sm text-green-600 dark:text-green-400'>
                        总用户数
                      </div>
                    </div>
                    <div className='p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800'>
                      <div className='text-2xl font-bold text-blue-800 dark:text-blue-300'>
                        0
                      </div>
                      <div className='text-sm text-blue-600 dark:text-blue-400'>
                        待审核用户
                      </div>
                    </div>
                    <div className='p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800'>
                      <div className='text-2xl font-bold text-purple-800 dark:text-purple-300'>
                        0
                      </div>
                      <div className='text-sm text-purple-600 dark:text-purple-400'>
                        今日新增
                      </div>
                    </div>
                  </div>
                </div>

                {/* 用户列表 */}
                <div>
                  <div className='flex items-center justify-between mb-3'>
                    <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                      用户列表
                    </h4>
                    <button
                      className='px-3 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg transition-colors'
                    >
                      添加用户
                    </button>
                  </div>

                  <div className='border border-gray-200 dark:border-gray-700 rounded-lg max-h-[28rem] overflow-y-auto overflow-x-auto relative'>
                    <table className='min-w-full divide-y divide-gray-200 dark:divide-gray-700'>
                      <thead className='bg-gray-50 dark:bg-gray-900 sticky top-0 z-10'>
                        <tr>
                          <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                            用户名
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                            角色
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                            状态
                          </th>
                          <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                            操作
                          </th>
                        </tr>
                      </thead>
                      <tbody className='bg-white dark:bg-black divide-y divide-gray-200 dark:divide-gray-700'>
                        {config.UserConfig.Users.map((user) => (
                          <tr key={user.username} className='hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'>
                            <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100'>
                              {user.username}
                            </td>
                            <td className='px-6 py-4 whitespace-nowrap'>
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${user.role === 'owner'
                                  ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300'
                                  : user.role === 'admin'
                                    ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                  }`}
                              >
                                {user.role === 'owner'
                                  ? '站长'
                                  : user.role === 'admin'
                                    ? '管理员'
                                    : '普通用户'}
                              </span>
                            </td>
                            <td className='px-6 py-4 whitespace-nowrap'>
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${!user.banned
                                  ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300'
                                  : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300'
                                  }`}
                              >
                                {!user.banned ? '正常' : '已封禁'}
                              </span>
                            </td>
                            <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2'>
                              <button className='px-2 py-1 text-xs font-medium bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-md transition-colors'>
                                修改密码
                              </button>
                              {user.role === 'admin' ? (
                                <button className='px-2 py-1 text-xs font-medium bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded-md transition-colors'>
                                  取消管理员
                                </button>
                              ) : (
                                <button className='px-2 py-1 text-xs font-medium bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white rounded-md transition-colors'>
                                  设置管理员
                                </button>
                              )}
                              {!user.banned ? (
                                <button className='px-2 py-1 text-xs font-medium bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded-md transition-colors'>
                                  封禁
                                </button>
                              ) : (
                                <button className='px-2 py-1 text-xs font-medium bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white rounded-md transition-colors'>
                                  解封
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 视频源管理 */}
            {activeTab === 'dataSource' && (
              <div className='space-y-6'>
                <div>
                  <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>
                    视频源管理
                  </h4>
                  <div className='flex items-center justify-between mb-3'>
                    <div className='flex space-x-2'>
                      <button
                        onClick={() => {
                          // 导出视频源配置
                          const dataStr = JSON.stringify(config.SourceConfig, null, 2);
                          const dataBlob = new Blob([dataStr], { type: 'application/json' });
                          const url = URL.createObjectURL(dataBlob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = 'video-sources.json';
                          link.click();
                          URL.revokeObjectURL(url);
                        }}
                        className='px-3 py-1.5 text-sm font-medium bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-700 text-white rounded-lg transition-colors'
                      >
                        导出配置
                      </button>
                      <label
                        htmlFor='import-sources'
                        className='px-3 py-1.5 text-sm font-medium bg-green-600 dark:bg-green-600 hover:bg-green-700 dark:hover:bg-green-700 text-white rounded-lg transition-colors cursor-pointer'
                      >
                        导入配置
                      </label>
                      <input
                          id='import-sources'
                          type='file'
                          accept='.json'
                          className='hidden'
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = async (event) => {
                                try {
                                  let jsonString = event.target?.result as string;
                                  // 清理JSON字符串中的反引号
                                  jsonString = jsonString.replace(/`/g, '');
                                  const importedSources = JSON.parse(jsonString);
                                  if (Array.isArray(importedSources)) {
                                    // 调用API导入视频源
                                    const response = await fetch('/api/admin/source', {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json',
                                      },
                                      body: JSON.stringify({
                                        action: 'import',
                                        sources: importedSources,
                                      }),
                                    });
                                    
                                    if (response.ok) {
                                      await refreshConfig();
                                      alert('视频源配置导入成功！');
                                    } else {
                                      const errorData = await response.json();
                                      alert(`导入失败：${errorData.error || '未知错误'}`);
                                    }
                                  } else {
                                    alert('导入的文件格式不正确！请确保文件是JSON数组格式。');
                                  }
                                } catch (error) {
                                  alert(`导入失败：${(error as Error).message}`);
                                }
                              };
                              reader.readAsText(file);
                            }
                          }}
                        />
                    </div>
                    <button
                      onClick={async () => {
                        // 添加视频源
                        const key = prompt('请输入视频源标识（key）:');
                        const name = prompt('请输入视频源名称:');
                        const api = prompt('请输入API地址:');
                        const detail = prompt('请输入描述（可选）:');
                        
                        if (key && name && api) {
                          const response = await fetch('/api/admin/source', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              action: 'add',
                              key,
                              name,
                              api,
                              detail,
                            }),
                          });
                          if (response.ok) {
                            await refreshConfig();
                            alert('添加成功！');
                          } else {
                            const errorData = await response.json();
                            alert(`添加失败：${errorData.error || '未知错误'}`);
                          }
                        } else {
                          alert('请填写必要的信息！');
                        }
                      }}
                      className='px-3 py-1.5 text-sm font-medium bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-700 text-white rounded-lg transition-colors'
                    >
                      添加视频源
                    </button>
                  </div>
                  
                  {/* 批量操作按钮 */}
                  {selectedSources.length > 0 && (
                    <div className='flex space-x-2 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg'>
                      <span className='text-sm text-gray-700 dark:text-gray-300'>
                        已选择 {selectedSources.length} 个视频源
                      </span>
                      <button
                        onClick={() => handleBatchToggleStatus('enable')}
                        className='px-3 py-1.5 text-sm font-medium bg-green-600 dark:bg-green-600 hover:bg-green-700 dark:hover:bg-green-700 text-white rounded-lg transition-colors'
                      >
                        批量启用
                      </button>
                      <button
                        onClick={() => handleBatchToggleStatus('disable')}
                        className='px-3 py-1.5 text-sm font-medium bg-yellow-600 dark:bg-yellow-600 hover:bg-yellow-700 dark:hover:bg-yellow-700 text-white rounded-lg transition-colors'
                      >
                        批量禁用
                      </button>
                      <button
                        onClick={handleBatchDelete}
                        className='px-3 py-1.5 text-sm font-medium bg-red-600 dark:bg-red-600 hover:bg-red-700 dark:hover:bg-red-700 text-white rounded-lg transition-colors'
                      >
                        批量删除
                      </button>
                    </div>
                  )}
                  <div className='border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden'>
                    <table className='min-w-full divide-y divide-gray-200 dark:divide-gray-700'>
                      <thead className='bg-gray-50 dark:bg-gray-900'>
                        <tr>
                          <th className='px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                            <input
                              type='checkbox'
                              checked={selectAll}
                              onChange={handleSelectAll}
                              className='h-4 w-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                            />
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                            名称
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                            API地址
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                            来源
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                            状态
                          </th>
                          <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                            操作
                          </th>
                        </tr>
                      </thead>
                      <tbody className='bg-white dark:bg-black divide-y divide-gray-200 dark:divide-gray-700'>
                        {config.SourceConfig.map((source) => (
                          <tr key={source.key} className='hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'>
                            <td className='px-3 py-4 whitespace-nowrap'>
                              <input
                                type='checkbox'
                                checked={selectedSources.includes(source.key)}
                                onChange={() => handleSelectSource(source.key)}
                                className='h-4 w-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                              />
                            </td>
                            <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100'>
                              {source.name}
                            </td>
                            <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400'>
                              {source.api}
                            </td>
                            <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400'>
                              {source.from === 'config' ? '系统配置' : '自定义'}
                            </td>
                            <td className='px-6 py-4 whitespace-nowrap'>
                              <button
                                onClick={async () => {
                                  // 切换视频源状态
                                  const action = source.disabled ? 'enable' : 'disable';
                                  const response = await fetch('/api/admin/source', {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                      action,
                                      key: source.key,
                                    }),
                                  });
                                  if (response.ok) {
                                    await refreshConfig();
                                  } else {
                                    const errorData = await response.json();
                                    alert(`操作失败：${errorData.error || '未知错误'}`);
                                  }
                                }}
                                className={`px-2 py-1 text-xs rounded-full cursor-pointer ${source.disabled ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800/20' : 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800/20'}`}
                              >
                                {source.disabled ? '已禁用' : '已启用'}
                              </button>
                            </td>
                            <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2'>
                              <button
                                onClick={async () => {
                                  // 编辑视频源
                                  const newName = prompt('请输入新的视频源名称:', source.name);
                                  const newApi = prompt('请输入新的API地址:', source.api);
                                  const newDetail = prompt('请输入新的描述（可选）:', source.detail || '');
                                  
                                  if (newName && newApi) {
                                    // 使用import action来更新视频源
                                    const response = await fetch('/api/admin/source', {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json',
                                      },
                                      body: JSON.stringify({
                                        action: 'import',
                                        sources: [{
                                          key: source.key,
                                          name: newName,
                                          api: newApi,
                                          detail: newDetail,
                                          disabled: source.disabled,
                                        }],
                                      }),
                                    });
                                    if (response.ok) {
                                      await refreshConfig();
                                    } else {
                                      const errorData = await response.json();
                                      alert(`操作失败：${errorData.error || '未知错误'}`);
                                    }
                                  }
                                }}
                                className='text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300'
                              >
                                编辑
                              </button>
                              <button
                                onClick={async () => {
                                  // 删除视频源
                                  if (confirm(`确定要删除视频源 "${source.name}" 吗？`)) {
                                    const response = await fetch('/api/admin/source', {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json',
                                      },
                                      body: JSON.stringify({
                                        action: 'delete',
                                        key: source.key,
                                      }),
                                    });
                                    if (response.ok) {
                                      await refreshConfig();
                                    } else {
                                      const errorData = await response.json();
                                      alert(`操作失败：${errorData.error || '未知错误'}`);
                                    }
                                  }
                                }}
                                className='text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300'
                              >
                                删除
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 直播源管理 */}
            {activeTab === 'liveDataSource' && (
              <div className='space-y-6'>
                <div>
                  <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>
                    直播源管理
                  </h4>
                  <div className='flex items-center justify-between mb-3'>
                    <div className='flex space-x-2'>
                      <button
                        onClick={handleAddLiveSource}
                        className='px-3 py-1.5 text-sm font-medium bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-700 text-white rounded-lg transition-colors'
                      >
                        添加直播源
                      </button>
                    </div>
                  </div>
                  <div className='border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden'>
                    <table className='min-w-full divide-y divide-gray-200 dark:divide-gray-700'>
                      <thead className='bg-gray-50 dark:bg-gray-900'>
                        <tr>
                          <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                            名称
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                            地址
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                            来源
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                            状态
                          </th>
                          <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                            操作
                          </th>
                        </tr>
                      </thead>
                      <tbody className='bg-white dark:bg-black divide-y divide-gray-200 dark:divide-gray-700'>
                        {(config.LiveConfig || []).map((liveSource) => (
                          <tr key={liveSource.key} className='hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'>
                            <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100'>
                              {liveSource.name}
                            </td>
                            <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400'>
                              {liveSource.url}
                            </td>
                            <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400'>
                              {liveSource.from === 'config' ? '系统配置' : '自定义'}
                            </td>
                            <td className='px-6 py-4 whitespace-nowrap'>
                              <button
                                onClick={() => handleToggleLiveSourceStatus(liveSource.key, !liveSource.disabled)}
                                className={`px-2 py-1 text-xs rounded-full ${liveSource.disabled ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800/20' : 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800/20'}`}
                              >
                                {liveSource.disabled ? '已禁用' : '已启用'}
                              </button>
                            </td>
                            <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2'>
                              {liveSource.from !== 'config' && (
                                <>
                                  <button
                                    onClick={() => handleEditLiveSource(liveSource)}
                                    className='text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300'
                                  >
                                    编辑
                                  </button>
                                  <button
                                    onClick={() => handleDeleteLiveSource(liveSource.key)}
                                    className='text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300'
                                  >
                                    删除
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 自定义分类 */}
            {activeTab === 'customCategory' && (
              <div className='space-y-6'>
                <div>
                  <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>
                    自定义分类
                  </h4>
                  <div className='flex items-center justify-between mb-3'>
                    <div className='flex space-x-2'>
                      <button
                        onClick={handleAddCustomCategory}
                        className='px-3 py-1.5 text-sm font-medium bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-700 text-white rounded-lg transition-colors'
                      >
                        添加自定义分类
                      </button>
                    </div>
                  </div>
                  <div className='border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden'>
                    <table className='min-w-full divide-y divide-gray-200 dark:divide-gray-700'>
                      <thead className='bg-gray-50 dark:bg-gray-900'>
                        <tr>
                          <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                            名称
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                            类型
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                            查询
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                            来源
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                            状态
                          </th>
                          <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                            操作
                          </th>
                        </tr>
                      </thead>
                      <tbody className='bg-white dark:bg-black divide-y divide-gray-200 dark:divide-gray-700'>
                        {config.CustomCategories.map((category, index) => (
                          <tr key={index} className='hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'>
                            <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100'>
                              {category.name || `分类${index + 1}`}
                            </td>
                            <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400'>
                              {category.type === 'movie' ? '电影' : '电视剧'}
                            </td>
                            <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400'>
                              {category.query}
                            </td>
                            <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400'>
                              {category.from === 'config' ? '系统配置' : '自定义'}
                            </td>
                            <td className='px-6 py-4 whitespace-nowrap'>
                              <button
                                onClick={() => handleToggleCustomCategoryStatus(category.query, category.type, !category.disabled)}
                                className={`px-2 py-1 text-xs rounded-full ${category.disabled ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800/20' : 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800/20'}`}
                              >
                                {category.disabled ? '已禁用' : '已启用'}
                              </button>
                            </td>
                            <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2'>
                              {category.from !== 'config' && (
                                <>
                                  <button
                                    onClick={() => handleEditCustomCategory(category)}
                                    className='text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300'
                                  >
                                    编辑
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCustomCategory(category.query, category.type)}
                                    className='text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300'
                                  >
                                    删除
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 数据迁移 */}
            {activeTab === 'dataMigration' && (
              <div>
                <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>
                  数据迁移
                </h4>
                <div className='p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700'>
                  <DataMigration />
                </div>
              </div>
            )}
          </div>

          {/* 添加直播源模态框 */}
          {(isAddLiveSourceModalOpen || isEditLiveSourceModalOpen) && (
            <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
              <div className='bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md'>
                <div className='p-4 border-b border-gray-200 dark:border-gray-700'>
                  <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100'>
                    {isEditLiveSourceModalOpen ? '编辑直播源' : '添加直播源'}
                  </h3>
                </div>
                <form onSubmit={handleLiveSourceSubmit} className='p-4'>
                  <div className='space-y-4'>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                        Key
                      </label>
                      <input
                        type='text'
                        value={currentLiveSource.key}
                        onChange={(e) => setCurrentLiveSource({...currentLiveSource, key: e.target.value})}
                        disabled={isEditLiveSourceModalOpen}
                        className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                        required
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                        名称
                      </label>
                      <input
                        type='text'
                        value={currentLiveSource.name}
                        onChange={(e) => setCurrentLiveSource({...currentLiveSource, name: e.target.value})}
                        className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                        required
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                        URL
                      </label>
                      <input
                        type='url'
                        value={currentLiveSource.url}
                        onChange={(e) => setCurrentLiveSource({...currentLiveSource, url: e.target.value})}
                        className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                        required
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                        User Agent
                      </label>
                      <input
                        type='text'
                        value={currentLiveSource.ua}
                        onChange={(e) => setCurrentLiveSource({...currentLiveSource, ua: e.target.value})}
                        className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                        EPG URL
                      </label>
                      <input
                        type='url'
                        value={currentLiveSource.epg}
                        onChange={(e) => setCurrentLiveSource({...currentLiveSource, epg: e.target.value})}
                        className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                      />
                    </div>
                  </div>
                  <div className='flex justify-end space-x-3 mt-6'>
                    <button
                      type='button'
                      onClick={() => {
                        setIsAddLiveSourceModalOpen(false);
                        setIsEditLiveSourceModalOpen(false);
                      }}
                      className='px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
                    >
                      取消
                    </button>
                    <button
                      type='submit'
                      className='px-4 py-2 bg-blue-600 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-700'
                    >
                      保存
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 添加自定义分类模态框 */}
          {(isAddCustomCategoryModalOpen || isEditCustomCategoryModalOpen) && (
            <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
              <div className='bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md'>
                <div className='p-4 border-b border-gray-200 dark:border-gray-700'>
                  <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100'>
                    {isEditCustomCategoryModalOpen ? '编辑自定义分类' : '添加自定义分类'}
                  </h3>
                </div>
                <form onSubmit={handleCustomCategorySubmit} className='p-4'>
                  <div className='space-y-4'>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                        名称
                      </label>
                      <input
                        type='text'
                        value={currentCustomCategory.name}
                        onChange={(e) => setCurrentCustomCategory({...currentCustomCategory, name: e.target.value})}
                        className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                        required
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                        类型
                      </label>
                      <select
                        value={currentCustomCategory.type}
                        onChange={(e) => setCurrentCustomCategory({...currentCustomCategory, type: e.target.value})}
                        className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                        required
                      >
                        <option value='movie'>电影</option>
                        <option value='tv'>电视剧</option>
                      </select>
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                        查询
                      </label>
                      <input
                        type='text'
                        value={currentCustomCategory.query}
                        onChange={(e) => setCurrentCustomCategory({...currentCustomCategory, query: e.target.value})}
                        className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                        required
                      />
                    </div>
                  </div>
                  <div className='flex justify-end space-x-3 mt-6'>
                    <button
                      type='button'
                      onClick={() => {
                        setIsAddCustomCategoryModalOpen(false);
                        setIsEditCustomCategoryModalOpen(false);
                      }}
                      className='px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
                    >
                      取消
                    </button>
                    <button
                      type='submit'
                      className='px-4 py-2 bg-blue-600 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-700'
                    >
                      保存
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 配置文件设置模态框 */}
          {isConfigFileModalOpen && (
            <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
              <div className='bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-3xl'>
                <div className='p-4 border-b border-gray-200 dark:border-gray-700'>
                  <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100'>
                    配置文件设置
                  </h3>
                </div>
                <form onSubmit={handleConfigFileSubmit} className='p-4'>
                  <div className='space-y-4'>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                        配置文件内容
                      </label>
                      <textarea
                        value={configFileContent}
                        onChange={(e) => setConfigFileContent(e.target.value)}
                        rows={10}
                        className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm'
                        required
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                        订阅URL
                      </label>
                      <input
                        type='url'
                        value={subscriptionUrl}
                        onChange={(e) => setSubscriptionUrl(e.target.value)}
                        className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                      />
                    </div>
                    <div className='flex items-center justify-between'>
                      <div>
                        <div className='font-medium text-gray-900 dark:text-gray-100'>
                          自动更新
                        </div>
                        <div className='text-sm text-gray-600 dark:text-gray-400'>
                          控制是否自动更新配置文件
                        </div>
                      </div>
                      <button
                        type="button"
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${autoUpdate ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                        onClick={() => setAutoUpdate(!autoUpdate)}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out ${autoUpdate ? 'translate-x-5' : 'translate-x-1'}`}
                        />
                      </button>
                    </div>
                  </div>
                  <div className='flex justify-end space-x-3 mt-6'>
                    <button
                      type='button'
                      onClick={() => setIsConfigFileModalOpen(false)}
                      className='px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
                    >
                      取消
                    </button>
                    <button
                      type='submit'
                      className='px-4 py-2 bg-blue-600 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-700'
                    >
                      保存
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default AdminPage;