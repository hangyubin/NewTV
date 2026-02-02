import type { Metadata } from 'next';
import Link from 'next/link';
import React, { useState } from 'react';

import AiConfig from '@/components/admin/AiConfig';
import BackupConfig from '@/components/admin/BackupConfig';
import LiveSourceConfig from '@/components/admin/LiveSourceConfig';
import SiteConfig from '@/components/admin/SiteConfig';
import ThemeConfig from '@/components/admin/ThemeConfig';
import UserConfig from '@/components/admin/UserConfig';
import VideoSourceConfig from '@/components/admin/VideoSourceConfig';

export const metadata: Metadata = {
  title: '管理后台',
  description: 'NewTV 管理后台',
};

const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('site');

  const tabs = [
    { id: 'site', name: '站点配置', component: SiteConfig },
    { id: 'video', name: '视频源配置', component: VideoSourceConfig },
    { id: 'live', name: '直播源配置', component: LiveSourceConfig },
    { id: 'user', name: '用户配置', component: UserConfig },
    { id: 'ai', name: 'AI配置', component: AiConfig },
    { id: 'theme', name: '主题配置', component: ThemeConfig },
    { id: 'backup', name: '备份配置', component: BackupConfig },
  ];

  const ActiveComponent = tabs.find((tab) => tab.id === activeTab)?.component || SiteConfig;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-semibold text-gray-800">
                NewTV
              </Link>
              <span className="ml-4 text-gray-500">/ 管理后台</span>
            </div>
            <div className="flex items-center">
              <Link href="/" className="text-gray-600 hover:text-gray-900">
                返回首页
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-lg font-medium text-gray-900">管理后台</h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              配置站点、视频源、用户等设置
            </p>
          </div>
          <div className="border-t border-gray-200">
            <nav className="flex -mb-px space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
          <div className="px-4 py-6">
            <ActiveComponent />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;