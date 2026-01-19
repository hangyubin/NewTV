/* eslint-disable @typescript-eslint/no-explicit-any, no-console, @typescript-eslint/no-non-null-assertion,react-hooks/exhaustive-deps,@typescript-eslint/no-empty-function */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Database, Settings, Tv, Users, Video } from 'lucide-react';
import { AdminConfig, AdminConfigResult } from '@/lib/admin.types';
import { getAuthInfoFromBrowserCookie } from '@/lib/auth';

import DataMigration from '@/components/DataMigration';
import PageLayout from '@/components/PageLayout';

// 导入我们创建的组件
import AlertModal from '@/components/admin/AlertModal';
import UserConfig from '@/components/admin/UserConfig';
import SiteConfig from '@/components/admin/SiteConfig';
import SourceConfig from '@/components/admin/SourceConfig';
import ConfigSubscription from '@/components/admin/ConfigSubscription';
import LiveSourceConfig from '@/components/admin/LiveSourceConfig';
import CategoryConfig from '@/components/admin/CategoryConfig';
import CollapsibleTab from '@/components/admin/CollapsibleTab';
import { useAlertModal } from '@/components/admin/useAlertModal';

const AdminPage = () => {
  const { alertModal, showAlert, hideAlert } = useAlertModal();

  // 状态管理
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [role, setRole] = useState<'owner' | 'admin' | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 标签页状态
  const [activeTab, setActiveTab] = useState<string>('site');
  const [expandedTabs, setExpandedTabs] = useState<Record<string, boolean>>({
    config: false,
    site: true,
    source: false,
    live: false,
    category: false,
    user: false,
    migration: false,
  });

  // 切换标签页展开状态 - 实现手风琴效果
  const toggleTab = useCallback((tab: string) => {
    setExpandedTabs((prev) => {
      // 手风琴效果：展开当前标签页，关闭其他所有标签页
      const newExpandedTabs: Record<string, boolean> = {};
      Object.keys(prev).forEach(key => {
        newExpandedTabs[key] = key === tab && !prev[key];
      });
      return newExpandedTabs;
    });
  }, []);

  // 刷新配置数据
  const refreshConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/config');
      if (res.ok) {
        const result = (await res.json()) as AdminConfigResult;
        setConfig(result.Config as AdminConfig);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初始化加载配置
  useEffect(() => {
    const loadConfig = async () => {
      // 获取当前用户角色
      const authInfo = getAuthInfoFromBrowserCookie();
      if (authInfo) {
        setRole(authInfo.role === 'owner' || authInfo.role === 'admin' ? authInfo.role : null);
      }

      await refreshConfig();
    };
    loadConfig();
  }, [refreshConfig]);

  // 渲染加载状态
  if (isLoading) {
    return (
      <PageLayout>
        <div className='flex items-center justify-center min-h-[400px]'>
          <div className='text-center'>
            <div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4'></div>
            <p className='text-gray-500 dark:text-gray-400'>加载配置中...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>
            管理后台
          </h1>
          <p className='mt-2 text-sm text-gray-600 dark:text-gray-400'>
            配置站点设置、管理视频源和用户权限
          </p>
        </div>

        {/* 配置面板 */}
        <div className='space-y-6'>
          {/* 配置文件与订阅 */}
          <ConfigSubscription 
            config={config} 
            role={role} 
            refreshConfig={refreshConfig} 
            setConfig={setConfig} 
            isExpanded={expandedTabs.config}
            onToggle={() => toggleTab('config')}
          />

          {/* 站点配置 */}
          <SiteConfig 
            config={config} 
            role={role} 
            refreshConfig={refreshConfig} 
            setConfig={setConfig} 
            isExpanded={expandedTabs.site}
            onToggle={() => toggleTab('site')}
          />

          {/* 视频源管理 */}
          <SourceConfig 
            config={config} 
            role={role} 
            refreshConfig={refreshConfig} 
            setConfig={setConfig} 
            isExpanded={expandedTabs.source}
            onToggle={() => toggleTab('source')}
          />

          {/* 直播源管理 */}
          <LiveSourceConfig 
            config={config} 
            role={role} 
            refreshConfig={refreshConfig} 
            setConfig={setConfig} 
            isExpanded={expandedTabs.live}
            onToggle={() => toggleTab('live')}
          />

          {/* 分类管理 */}
          <CategoryConfig 
            config={config} 
            role={role} 
            refreshConfig={refreshConfig} 
            setConfig={setConfig} 
            isExpanded={expandedTabs.category}
            onToggle={() => toggleTab('category')}
          />

          {/* 用户管理 */}
          <UserConfig 
            config={config} 
            role={role} 
            refreshConfig={refreshConfig} 
            setConfig={setConfig} 
            isExpanded={expandedTabs.user}
            onToggle={() => toggleTab('user')}
          />

          {/* 数据迁移 */}
          <CollapsibleTab
            title="数据迁移"
            icon={<Database className="w-6 h-6 text-green-500" />}
            isExpanded={expandedTabs.migration}
            onToggle={() => toggleTab('migration')}
          >
            <DataMigration onRefreshConfig={() => refreshConfig()} />
          </CollapsibleTab>
        </div>
      </div>

      {/* 全局弹窗 */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={hideAlert}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        timer={alertModal.timer}
        showConfirm={alertModal.showConfirm}
      />
    </PageLayout>
  );
};

export default AdminPage;