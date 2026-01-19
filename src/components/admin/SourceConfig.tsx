import React, { useCallback } from 'react';
import { Video } from 'lucide-react';
import { AdminConfig } from '@/lib/admin.types';
import { useAlertModal, showSuccess, showError } from './useAlertModal';
import { useLoadingState } from './useLoadingState';
import { buttonStyles } from './ButtonStyles';
import CollapsibleTab from './CollapsibleTab';

// 视频源管理组件的属性定义
export interface SourceConfigProps {
  config: AdminConfig | null;
  role: 'owner' | 'admin' | null;
  refreshConfig: () => Promise<void>;
  setConfig: React.Dispatch<React.SetStateAction<AdminConfig | null>>;
  isExpanded?: boolean;
  onToggle?: () => void;
}

// 视频源管理组件
const SourceConfig = ({
  config,
  role,
  refreshConfig,
  setConfig,
  isExpanded = true,
  onToggle = () => {},
}: SourceConfigProps) => {
  const { alertModal, showAlert, hideAlert } = useAlertModal();
  const { isLoading, withLoading } = useLoadingState();
  
  // 表单状态管理
  const [showAddSourceForm, setShowAddSourceForm] = React.useState(false);
  const [showEditSourceForm, setShowEditSourceForm] = React.useState(false);
  
  // 视频源表单数据
  const [newSource, setNewSource] = React.useState({
    name: '',
    key: '',
    api: '',
    detail: '',
  });
  
  // 编辑视频源数据
  const [editingSource, setEditingSource] = React.useState<{
    name: string;
    key: string;
    api: string;
    detail?: string;
  } | null>(null);
  
  // 选择框状态管理
  const [selectedSources, setSelectedSources] = React.useState<string[]>([]);
  const [selectAll, setSelectAll] = React.useState(false);
  
  // 切换单个源的选择状态
  const toggleSourceSelection = (sourceKey: string) => {
    setSelectedSources(prev => {
      if (prev.includes(sourceKey)) {
        return prev.filter(key => key !== sourceKey);
      } else {
        return [...prev, sourceKey];
      }
    });
  };
  
  // 切换全选状态
  const toggleSelectAll = () => {
    setSelectAll(!selectAll);
    if (!selectAll) {
      // 全选
      setSelectedSources(config!.SourceConfig.map(source => source.key));
    } else {
      // 取消全选
      setSelectedSources([]);
    }
  };
  
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
  
  // 处理视频源相关操作
  const handleSourceAction = async (
    action: 'add' | 'edit' | 'delete' | 'toggle',
    source: {
      name: string;
      key: string;
      api: string;
      detail?: string;
      disabled?: boolean;
    }
  ) => {
    return withLoading(`source_${action}_${source.key}`, async () => {
      try {
        const res = await fetch('/api/admin/source', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            source: {
              key: source.key,
              name: source.name,
              api: source.api,
              detail: source.detail,
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
          setNewSource({ name: '', key: '', api: '', detail: '' });
          setShowAddSourceForm(false);
        } else if (action === 'edit') {
          setEditingSource(null);
          setShowEditSourceForm(false);
        }

        showSuccess(
          action === 'add'
            ? '视频源添加成功'
            : action === 'edit'
            ? '视频源更新成功'
            : action === 'delete'
            ? '视频源删除成功'
            : source.disabled
            ? '视频源已禁用'
            : '视频源已启用',
          showAlert
        );
      } catch (err) {
        showError(err instanceof Error ? err.message : '操作失败', showAlert);
        throw err;
      }
    });
  };
  
  // 添加视频源
  const handleAddSource = () => {
    if (!newSource.name.trim() || !newSource.key.trim() || !newSource.api.trim()) return;
    handleSourceAction('add', newSource);
  };
  
  // 编辑视频源
  const handleEditSource = () => {
    if (!editingSource) return;
    if (!editingSource.name.trim() || !editingSource.key.trim() || !editingSource.api.trim()) return;
    handleSourceAction('edit', editingSource);
  };
  
  // 开始编辑视频源
  const handleStartEditSource = (source: {
    name: string;
    key: string;
    api: string;
    detail?: string;
  }) => {
    setEditingSource({ ...source });
    setShowEditSourceForm(true);
    setShowAddSourceForm(false);
  };
  
  // 批量禁用/启用视频源
  const handleBatchToggleSources = async (disabled: boolean) => {
    if (selectedSources.length === 0) {
      showAlert({
        type: 'warning',
        title: '提示',
        message: '请先选择要操作的视频源',
        timer: 2000,
      });
      return;
    }
    
    await withLoading(`batchToggleSources_${disabled ? 'disable' : 'enable'}`, async () => {
      try {
        const res = await fetch('/api/admin/source', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'batchToggle',
            sources: selectedSources,
            disabled,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `操作失败: ${res.status}`);
        }

        await refreshConfig();
        showSuccess(
          disabled ? '视频源已批量禁用' : '视频源已批量启用',
          showAlert
        );
        // 清空选择
        setSelectedSources([]);
        setSelectAll(false);
      } catch (err) {
        showError(err instanceof Error ? err.message : '操作失败', showAlert);
        throw err;
      }
    });
  };
  
  return (
    <CollapsibleTab
      title="视频源管理"
      icon={<Video className="w-6 h-6 text-blue-500" />}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <div className='space-y-6'>
        {/* 视频源列表 */}
        <div>
          <div className='flex items-center justify-between mb-3'>
            <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
              视频源列表
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
                {showAddSourceForm ? '取消' : '添加视频源'}
              </button>
            </div>
          </div>

          {/* 添加视频源表单 */}
          {showAddSourceForm && (
            <div className='mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700'>
              <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>添加视频源</h4>
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
                  placeholder='API地址'
                  value={newSource.api}
                  onChange={(e) =>
                    setNewSource((prev) => ({
                      ...prev,
                      api: e.target.value,
                    }))
                  }
                  className='px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
                <input
                  type='text'
                  placeholder='描述（可选）'
                  value={newSource.detail}
                  onChange={(e) =>
                    setNewSource((prev) => ({
                      ...prev,
                      detail: e.target.value,
                    }))
                  }
                  className='px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
                <div className='flex justify-end'>
                  <button
                    onClick={handleAddSource}
                    disabled={isLoading('source_add_' + newSource.key)}
                    className={`${buttonStyles.success} ${isLoading('source_add_' + newSource.key) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    确定
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* 编辑视频源表单 */}
          {showEditSourceForm && editingSource && (
            <div className='mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700'>
              <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>编辑视频源</h4>
              <div className='space-y-4'>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <input
                    type='text'
                    placeholder='名称'
                    value={editingSource.name}
                    onChange={(e) =>
                      setEditingSource((prev) => ({
                        ...prev!,
                        name: e.target.value,
                      }))
                    }
                    className='px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  />
                  <input
                    type='text'
                    placeholder='唯一标识'
                    value={editingSource.key}
                    disabled
                    className='px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  />
                </div>
                <input
                  type='text'
                  placeholder='API地址'
                  value={editingSource.api}
                  onChange={(e) =>
                    setEditingSource((prev) => ({
                      ...prev!,
                      api: e.target.value,
                    }))
                  }
                  className='px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
                <input
                  type='text'
                  placeholder='描述（可选）'
                  value={editingSource.detail || ''}
                  onChange={(e) =>
                    setEditingSource((prev) => ({
                      ...prev!,
                      detail: e.target.value,
                    }))
                  }
                  className='px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
                <div className='flex justify-end space-x-2'>
                  <button
                    onClick={() => {
                      setShowEditSourceForm(false);
                      setEditingSource(null);
                    }}
                    className={buttonStyles.secondary}
                  >
                    取消
                  </button>
                  <button
                    onClick={handleEditSource}
                    disabled={isLoading('source_edit_' + editingSource.key)}
                    className={`${buttonStyles.success} ${isLoading('source_edit_' + editingSource.key) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    保存
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 视频源列表表格 */}
          <div className='border border-gray-200 dark:border-gray-700 rounded-lg max-h-[40rem] overflow-y-auto overflow-x-auto relative'>
            <table className='min-w-full divide-y divide-gray-200 dark:divide-gray-700'>
              <thead className='bg-gray-50 dark:bg-gray-900 sticky top-0 z-10'>
                <tr>
                  <th className='px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                    <input
                      type='checkbox'
                      checked={selectAll}
                      onChange={toggleSelectAll}
                      className='rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800'
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
                  <th className='px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                    状态
                  </th>
                  <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className='bg-white dark:bg-black divide-y divide-gray-200 dark:divide-gray-700'>
                {config.SourceConfig.map((source) => (
                  <tr
                    key={source.key}
                    className='hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
                  >
                    <td className='px-6 py-4 whitespace-nowrap text-center'>
                      <input
                        type='checkbox'
                        checked={selectedSources.includes(source.key)}
                        onChange={() => toggleSourceSelection(source.key)}
                        className='rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800'
                      />
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='flex items-center'>
                        <div className='flex flex-col'>
                          <div className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                            {source.name}
                          </div>
                          {source.detail && (
                            <div className='text-xs text-gray-500 dark:text-gray-400'>
                              {source.detail}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300 break-all'>
                      <a
                        href={source.api}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1'
                      >
                        {extractDomain(source.api)}
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
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='flex justify-center'>
                        <button
                          type='button'
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${source.disabled ? buttonStyles.toggleOff : buttonStyles.toggleOn}`}
                          role='switch'
                          aria-checked={!source.disabled}
                          onClick={() => handleSourceAction('toggle', { ...source, disabled: !source.disabled })}
                          disabled={isLoading(`source_toggle_${source.key}`)}
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
                        disabled={isLoading(`source_edit_${source.key}`)}
                        className={`${buttonStyles.roundedPrimary} ${isLoading(`source_edit_${source.key}`) ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        编辑
                      </button>
                      {/* 只有非config源或重写后的旧源才显示删除按钮 */}
                      {source.from !== 'config' && (
                        <button
                          onClick={() => handleSourceAction('delete', source)}
                          disabled={isLoading(`source_delete_${source.key}`)}
                          className={`${buttonStyles.roundedDanger} ${isLoading(`source_delete_${source.key}`) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          删除
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {config.SourceConfig.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className='px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400'
                    >
                      暂无视频源，请添加视频源来获取影视内容
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

export default SourceConfig;
