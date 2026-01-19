import React, { useCallback } from 'react';
import { Tv } from 'lucide-react';
import { AdminConfig } from '@/lib/admin.types';
import { useAlertModal, showSuccess, showError } from './useAlertModal';
import { useLoadingState } from './useLoadingState';
import { buttonStyles } from './ButtonStyles';
import CollapsibleTab from './CollapsibleTab';

// 直播源管理组件的属性定义
export interface LiveSourceConfigProps {
  config: AdminConfig | null;
  role: 'owner' | 'admin' | null;
  refreshConfig: () => Promise<void>;
  setConfig: React.Dispatch<React.SetStateAction<AdminConfig | null>>;
  isExpanded?: boolean;
  onToggle?: () => void;
}

// 直播源管理组件
const LiveSourceConfig = ({
  config,
  role,
  refreshConfig,
  setConfig,
  isExpanded = true,
  onToggle = () => {},
}: LiveSourceConfigProps) => {
  const { alertModal, showAlert, hideAlert } = useAlertModal();
  const { isLoading, withLoading } = useLoadingState();
  
  // 表单状态管理
  const [showAddSourceForm, setShowAddSourceForm] = React.useState(false);
  const [showEditSourceForm, setShowEditSourceForm] = React.useState(false);
  
  // 直播源表单数据
  const [newSource, setNewSource] = React.useState({
    name: '',
    key: '',
    url: '',
    ua: '',
    epg: '',
  });
  
  // 编辑直播源数据
  const [editingSource, setEditingSource] = React.useState<{
    name: string;
    key: string;
    url: string;
    ua?: string;
    epg?: string;
    disabled?: boolean;
  } | null>(null);
  
  if (!config) {
    return (
      <div className='text-center text-gray-500 dark:text-gray-400'>
        加载中...
      </div>
    );
  }
  
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
  
  // 处理直播源相关操作
  const handleSourceAction = async (
    action: 'add' | 'edit' | 'delete' | 'toggle',
    source: {
      name: string;
      key: string;
      url: string;
      ua?: string;
      epg?: string;
      disabled?: boolean;
    }
  ) => {
    return withLoading(`liveSource_${action}_${source.key}`, async () => {
      try {
        const res = await fetch('/api/admin/live/source', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            source: {
              key: source.key,
              name: source.name,
              url: source.url,
              ua: source.ua,
              epg: source.epg,
              disabled: source.disabled,
            },
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `操作失败: ${res.status}`);
        }

        await refreshConfig();

        if (action === 'add') {
          setNewSource({ name: '', key: '', url: '', ua: '', epg: '' });
          setShowAddSourceForm(false);
        } else if (action === 'edit') {
          setEditingSource(null);
          setShowEditSourceForm(false);
        }

        showSuccess(
          action === 'add'
            ? '直播源添加成功'
            : action === 'edit'
            ? '直播源更新成功'
            : action === 'delete'
            ? '直播源删除成功'
            : source.disabled
            ? '直播源已禁用'
            : '直播源已启用',
          showAlert
        );
      } catch (err) {
        showError(err instanceof Error ? err.message : '操作失败', showAlert);
        throw err;
      }
    });
  };
  
  // 添加直播源
  const handleAddSource = () => {
    if (!newSource.name.trim() || !newSource.key.trim() || !newSource.url.trim()) return;
    handleSourceAction('add', newSource);
  };
  
  // 编辑直播源
  const handleEditSource = () => {
    if (!editingSource) return;
    if (!editingSource.name.trim() || !editingSource.key.trim() || !editingSource.url.trim()) return;
    handleSourceAction('edit', editingSource);
  };
  
  // 开始编辑直播源
  const handleStartEditSource = (source: {
    name: string;
    key: string;
    url: string;
    ua?: string;
    epg?: string;
    disabled?: boolean;
  }) => {
    setEditingSource({ ...source });
    setShowEditSourceForm(true);
    setShowAddSourceForm(false);
  };
  
  // 批量禁用/启用直播源
  const handleBatchToggleSources = async (disabled: boolean) => {
    const liveSources = config.LiveConfig || [];
    const selectedSources = liveSources.filter(source => source.disabled !== disabled);
    if (selectedSources.length === 0) return;
    
    await withLoading(`batchToggleLiveSources_${disabled ? 'disable' : 'enable'}`, async () => {
      try {
        const res = await fetch('/api/admin/live/source', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'batchToggle',
            sources: selectedSources.map(source => source.key),
            disabled,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `操作失败: ${res.status}`);
        }

        await refreshConfig();
        showSuccess(
          disabled ? '直播源已批量禁用' : '直播源已批量启用',
          showAlert
        );
      } catch (err) {
        showError(err instanceof Error ? err.message : '操作失败', showAlert);
        throw err;
      }
    });
  };
  
  return (
    <CollapsibleTab
      title="直播源管理"
      icon={<Tv className="w-6 h-6 text-blue-500" />}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <div className='space-y-6'>
        {/* 直播源列表 */}
        <div>
          <div className='flex items-center justify-between mb-3'>
            <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
              直播源列表
            </h4>
            <div className='flex items-center space-x-2'>
              {/* 批量操作按钮 */}
              <button
                onClick={() => handleBatchToggleSources(true)}
                className={buttonStyles.warning}
              >
                批量禁用
              </button>
              <button
                onClick={() => handleBatchToggleSources(false)}
                className={buttonStyles.success}
              >
                批量启用
              </button>
              <button
                onClick={() => {
                  setShowAddSourceForm(!showAddSourceForm);
                  if (showEditSourceForm) {
                    setShowEditSourceForm(false);
                    setEditingSource(null);
                  }
                }}
                className={
                  showAddSourceForm
                    ? buttonStyles.secondary
                    : buttonStyles.primary
                }
              >
                {showAddSourceForm ? '取消' : '添加直播源'}
              </button>
            </div>
          </div>

          {/* 添加直播源表单 */}
          {showAddSourceForm && (
            <div className='mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700'>
              <div className='space-y-4'>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <input
                    type='text'
                    placeholder='名称'
                    value={newSource.name}
                    onChange={(e) =>
                      setNewSource((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    className='px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  />
                  <input
                    type='text'
                    placeholder='唯一标识'
                    value={newSource.key}
                    onChange={(e) =>
                      setNewSource((prev) => ({
                        ...prev,
                        key: e.target.value,
                      }))
                    }
                    className='px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  />
                </div>
                <input
                  type='text'
                  placeholder='M3U URL'
                  value={newSource.url}
                  onChange={(e) =>
                    setNewSource((prev) => ({
                      ...prev,
                      url: e.target.value,
                    }))
                  }
                  className='px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
                <input
                  type='text'
                  placeholder='User-Agent (可选)'
                  value={newSource.ua}
                  onChange={(e) =>
                    setNewSource((prev) => ({
                      ...prev,
                      ua: e.target.value,
                    }))
                  }
                  className='px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
                <input
                  type='text'
                  placeholder='EPG URL (可选)'
                  value={newSource.epg}
                  onChange={(e) =>
                    setNewSource((prev) => ({
                      ...prev,
                      epg: e.target.value,
                    }))
                  }
                  className='px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
                <div className='flex justify-end'>
                  <button
                    onClick={handleAddSource}
                    disabled={isLoading('liveSource_add_' + newSource.key)}
                    className={`${buttonStyles.success} ${isLoading('liveSource_add_' + newSource.key) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    确定
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 直播源列表表格 */}
          <div className='border border-gray-200 dark:border-gray-700 rounded-lg max-h-[40rem] overflow-y-auto overflow-x-auto relative'>
            <table className='min-w-full divide-y divide-gray-200 dark:divide-gray-700'>
              <thead className='bg-gray-50 dark:bg-gray-900 sticky top-0 z-10'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                    名称
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                    M3U地址
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                    来源
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                    频道数量
                  </th>
                  <th className='px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                    状态
                  </th>
                  <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className='bg-white dark:bg-black divide-y divide-gray-200 dark:divide-gray-700'>
                {(config.LiveConfig || []).map((source) => (
                  <tr
                    key={source.key}
                    className='hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
                  >
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='flex items-center'>
                        <div className='flex flex-col'>
                          <div className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                            {source.name}
                          </div>
                          {source.epg && (
                            <div className='text-xs text-gray-500 dark:text-gray-400'>
                              包含节目单
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300 break-all'>
                      <a
                        href={source.url}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1'
                      >
                        {extractDomain(source.url)}
                        <span className='text-xs'>🔗</span>
                      </a>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400'>
                      {source.from === 'config' ? (
                        <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'>
                          内置
                        </span>
                      ) : (
                        <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'>
                          自定义
                        </span>
                      )}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400'>
                      {source.channelNumber || '未知'}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='flex justify-center'>
                        <button
                          type='button'
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${source.disabled ? buttonStyles.toggleOff : buttonStyles.toggleOn}`}
                          role='switch'
                          aria-checked={!source.disabled}
                          onClick={() => handleSourceAction('toggle', source)}
                          disabled={isLoading(`liveSource_toggle_${source.key}`)}
                        >
                          <span
                            aria-hidden='true'
                            className={`pointer-events-none inline-block h-5 w-5 rounded-full ${buttonStyles.toggleThumb} shadow transform ring-0 transition duration-200 ease-in-out ${source.disabled ? buttonStyles.toggleThumbOff : buttonStyles.toggleThumbOn}`}
                          />
                        </button>
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2'>
                      <button
                        onClick={() => handleStartEditSource(source)}
                        disabled={isLoading(`liveSource_edit_${source.key}`) || source.from === 'config'}
                        className={`${buttonStyles.roundedPrimary} ${(isLoading(`liveSource_edit_${source.key}`) || source.from === 'config') ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleSourceAction('delete', source)}
                        disabled={isLoading(`liveSource_delete_${source.key}`) || source.from === 'config'}
                        className={`${buttonStyles.roundedDanger} ${(isLoading(`liveSource_delete_${source.key}`) || source.from === 'config') ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
                {(config.LiveConfig || []).length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className='px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400'
                    >
                      暂无直播源，请添加直播源来管理直播内容
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </CollapsibleTab>
  );
};

export default LiveSourceConfig;