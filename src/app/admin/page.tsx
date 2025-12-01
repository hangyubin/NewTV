/* eslint-disable @typescript-eslint/no-explicit-any, no-console, @typescript-eslint/no-non-null-assertion,react-hooks/exhaustive-deps,@typescript-eslint/no-empty-function */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  AlertTriangle,
  Bot,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Cloud,
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

import { AdminConfig } from '@/lib/admin.types';
import { getAuthInfoFromBrowserCookie } from '@/lib/auth';

import DataMigration from '@/components/DataMigration';
import PageLayout from '@/components/PageLayout';
import ExternalAIConfigComponent from '@/components/AIConfigComponent';

// 主管理页面组件
const AdminPage = () => {
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [role, setRole] = useState<'owner' | 'admin' | null>(null);
  const [activeTab, setActiveTab] = useState('site');
  const [expandedTabs, setExpandedTabs] = useState<{
    [key: string]: boolean;
  }>({
    site: true,
    user: false,
    dataSource: false,
    liveDataSource: false,
    customCategory: false,
    ai: false,
    cloudDisk: false,
    dataMigration: false,
  });

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
                onClick={() => toggleTab('ai')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'ai'
                  ? 'bg-blue-600 text-white dark:bg-blue-600 dark:text-white'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
              >
                AI设置
              </button>
              <button
                onClick={() => toggleTab('cloudDisk')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'cloudDisk'
                  ? 'bg-blue-600 text-white dark:bg-blue-600 dark:text-white'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
              >
                云盘设置
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
                        <button
                          type="button"
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${config.SiteConfig.DisableYellowFilter ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                          role="switch"
                          aria-checked={config.SiteConfig.DisableYellowFilter}
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
                        <button
                          type="button"
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${config.SiteConfig.FluidSearch ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                          role="switch"
                          aria-checked={config.SiteConfig.FluidSearch}
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
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 bg-gray-200 dark:bg-gray-700`}
                            role="switch"
                            aria-checked={false}
                          >
                            <span
                              aria-hidden="true"
                              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out translate-x-1`}
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
                  <div className='border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden'>
                    <table className='min-w-full divide-y divide-gray-200 dark:divide-gray-700'>
                      <thead className='bg-gray-50 dark:bg-gray-900'>
                        <tr>
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
                              <span className={`px-2 py-1 text-xs rounded-full ${source.disabled ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300' : 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'}`}>
                                {source.disabled ? '已禁用' : '已启用'}
                              </span>
                            </td>
                            <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2'>
                              <button className='text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300'>
                                编辑
                              </button>
                              <button className='text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300'>
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
                              <span className={`px-2 py-1 text-xs rounded-full ${liveSource.disabled ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300' : 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'}`}>
                                {liveSource.disabled ? '已禁用' : '已启用'}
                              </span>
                            </td>
                            <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2'>
                              <button className='text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300'>
                                编辑
                              </button>
                              <button className='text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300'>
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

            {/* 自定义分类 */}
            {activeTab === 'customCategory' && (
              <div className='space-y-6'>
                <div>
                  <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>
                    自定义分类
                  </h4>
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
                              <span className={`px-2 py-1 text-xs rounded-full ${category.disabled ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300' : 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'}`}>
                                {category.disabled ? '已禁用' : '已启用'}
                              </span>
                            </td>
                            <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2'>
                              <button className='text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300'>
                                编辑
                              </button>
                              <button className='text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300'>
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

            {/* AI设置 */}
            {activeTab === 'ai' && (
              <div className='space-y-6'>
                <div>
                  <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>
                    AI设置
                  </h4>
                  <div className='p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700'>
                    <ExternalAIConfigComponent />
                  </div>
                </div>
              </div>
            )}

            {/* 云盘设置 */}
            {activeTab === 'cloudDisk' && (
              <div className='space-y-6'>
                <div>
                  <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>
                    云盘设置
                  </h4>
                  <div className='space-y-4'>
                    <div className='flex items-center justify-between'>
                      <div>
                        <div className='font-medium text-gray-900 dark:text-gray-100'>
                          启用云盘
                        </div>
                        <div className='text-sm text-gray-600 dark:text-gray-400'>
                          控制是否启用云盘功能
                        </div>
                      </div>
                      <div className='flex items-center'>
                        <button
                          type="button"
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${(config.CloudDiskConfig?.enabled || false) ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                          role="switch"
                          aria-checked={config.CloudDiskConfig?.enabled || false}
                        >
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out ${(config.CloudDiskConfig?.enabled || false) ? 'translate-x-5' : 'translate-x-1'}`}
                          />
                        </button>
                        <span className='ml-3 text-sm font-medium text-gray-900 dark:text-gray-100'>
                          {(config.CloudDiskConfig?.enabled || false) ? '开启' : '关闭'}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                        云盘名称
                      </label>
                      <input
                        type='text'
                        placeholder='输入云盘名称'
                        defaultValue={config.CloudDiskConfig?.name || '网盘'}
                        className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                      />
                    </div>
                    
                    <div>
                      <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                        云盘API地址
                      </label>
                      <input
                        type='text'
                        placeholder='输入云盘API地址'
                        defaultValue={config.CloudDiskConfig?.apiUrl || ''}
                        className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                      />
                    </div>
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
        </div>
      </div>
    </PageLayout>
  );
};

export default AdminPage;