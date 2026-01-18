import React, { useCallback } from 'react';
import { Tv, Film } from 'lucide-react';
import { AdminConfig } from '@/lib/admin.types';
import { useAlertModal, showSuccess, showError } from './useAlertModal';
import { useLoadingState } from './useLoadingState';
import { buttonStyles } from './ButtonStyles';
import CollapsibleTab from './CollapsibleTab';

// 分类管理组件的属性定义
export interface CategoryConfigProps {
  config: AdminConfig | null;
  role: 'owner' | 'admin' | null;
  refreshConfig: () => Promise<void>;
  setConfig: React.Dispatch<React.SetStateAction<AdminConfig | null>>;
}

// 分类管理组件
const CategoryConfig = ({
  config,
  role,
  refreshConfig,
  setConfig,
}: CategoryConfigProps) => {
  const { alertModal, showAlert, hideAlert } = useAlertModal();
  const { isLoading, withLoading } = useLoadingState();
  
  // 表单状态管理
  const [showAddCategoryForm, setShowAddCategoryForm] = React.useState(false);
  const [showEditCategoryForm, setShowEditCategoryForm] = React.useState(false);
  
  // 分类表单数据
  const [newCategory, setNewCategory] = React.useState({
    name: '',
    type: 'movie' as 'movie' | 'tv',
    query: '',
  });
  
  // 编辑分类数据
  const [editingCategory, setEditingCategory] = React.useState<{
    name?: string;
    type: 'movie' | 'tv';
    query: string;
    disabled?: boolean;
  } | null>(null);
  
  if (!config) {
    return (
      <div className='text-center text-gray-500 dark:text-gray-400'>
        加载中...
      </div>
    );
  }
  
  // 处理分类相关操作
  const handleCategoryAction = async (
    action: 'add' | 'edit' | 'delete' | 'toggle',
    category: {
      name?: string;
      type: 'movie' | 'tv';
      query: string;
      disabled?: boolean;
    }
  ) => {
    return withLoading(`category_${action}_${category.name || category.query.substring(0, 10)}`, async () => {
      try {
        const res = await fetch('/api/admin/category', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            category: {
              name: category.name,
              type: category.type,
              query: category.query,
              disabled: category.disabled,
            },
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `操作失败: ${res.status}`);
        }

        await refreshConfig();

        if (action === 'add') {
          setNewCategory({ name: '', type: 'movie', query: '' });
          setShowAddCategoryForm(false);
        } else if (action === 'edit') {
          setEditingCategory(null);
          setShowEditCategoryForm(false);
        }

        showSuccess(
          action === 'add'
            ? '分类添加成功'
            : action === 'edit'
            ? '分类更新成功'
            : action === 'delete'
            ? '分类删除成功'
            : category.disabled
            ? '分类已禁用'
            : '分类已启用',
          showAlert
        );
      } catch (err) {
        showError(err instanceof Error ? err.message : '操作失败', showAlert);
        throw err;
      }
    });
  };
  
  // 添加分类
  const handleAddCategory = () => {
    if (!newCategory.name.trim() || !newCategory.query.trim()) return;
    handleCategoryAction('add', newCategory);
  };
  
  // 编辑分类
  const handleEditCategory = () => {
    if (!editingCategory) return;
    if (!editingCategory.name?.trim() || !editingCategory.query.trim()) return;
    handleCategoryAction('edit', editingCategory);
  };
  
  // 开始编辑分类
  const handleStartEditCategory = (category: {
    name?: string;
    type: 'movie' | 'tv';
    query: string;
    disabled?: boolean;
  }) => {
    setEditingCategory({ ...category });
    setShowEditCategoryForm(true);
    setShowAddCategoryForm(false);
  };
  
  // 批量禁用/启用分类
  const handleBatchToggleCategories = async (disabled: boolean) => {
    const customCategories = config.CustomCategories || [];
    const selectedCategories = customCategories.filter(category => category.disabled !== disabled);
    if (selectedCategories.length === 0) return;
    
    await withLoading(`batchToggleCategories_${disabled ? 'disable' : 'enable'}`, async () => {
      try {
        const res = await fetch('/api/admin/category', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'batchToggle',
            categories: selectedCategories.map(category => ({
              name: category.name,
              type: category.type,
              query: category.query,
            })),
            disabled,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `操作失败: ${res.status}`);
        }

        await refreshConfig();
        showSuccess(
          disabled ? '分类已批量禁用' : '分类已批量启用',
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
      title="分类管理"
      icon={<Tv className="w-6 h-6 text-blue-500" />}
      isExpanded={true}
      onToggle={() => {}}
    >
      <div className='space-y-6'>
        {/* 分类列表 */}
        <div>
          <div className='flex items-center justify-between mb-3'>
            <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
              自定义分类列表
            </h4>
            <div className='flex items-center space-x-2'>
              {/* 批量操作按钮 */}
              <button
                onClick={() => handleBatchToggleCategories(true)}
                className={buttonStyles.warning}
              >
                批量禁用
              </button>
              <button
                onClick={() => handleBatchToggleCategories(false)}
                className={buttonStyles.success}
              >
                批量启用
              </button>
              <button
                onClick={() => {
                  setShowAddCategoryForm(!showAddCategoryForm);
                  if (showEditCategoryForm) {
                    setShowEditCategoryForm(false);
                    setEditingCategory(null);
                  }
                }}
                className={
                  showAddCategoryForm
                    ? buttonStyles.secondary
                    : buttonStyles.primary
                }
              >
                {showAddCategoryForm ? '取消' : '添加分类'}
              </button>
            </div>
          </div>

          {/* 添加分类表单 */}
          {showAddCategoryForm && (
            <div className='mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700'>
              <div className='space-y-4'>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <input
                    type='text'
                    placeholder='分类名称'
                    value={newCategory.name}
                    onChange={(e) =>
                      setNewCategory((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    className='px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  />
                  <select
                    value={newCategory.type}
                    onChange={(e) =>
                      setNewCategory((prev) => ({
                        ...prev,
                        type: e.target.value as 'movie' | 'tv',
                      }))
                    }
                    className='px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  >
                    <option value='movie'>电影</option>
                    <option value='tv'>电视剧</option>
                  </select>
                </div>
                <input
                  type='text'
                  placeholder='查询条件'
                  value={newCategory.query}
                  onChange={(e) =>
                    setNewCategory((prev) => ({
                      ...prev,
                      query: e.target.value,
                    }))
                  }
                  className='px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  placeholder='例如: category=热门&sort=time'
                />
                <div className='flex justify-end'>
                  <button
                    onClick={handleAddCategory}
                    disabled={isLoading('category_add_' + newCategory.name)}
                    className={`${buttonStyles.success} ${isLoading('category_add_' + newCategory.name) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    确定
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 分类列表表格 */}
          <div className='border border-gray-200 dark:border-gray-700 rounded-lg max-h-[40rem] overflow-y-auto overflow-x-auto relative'>
            <table className='min-w-full divide-y divide-gray-200 dark:divide-gray-700'>
              <thead className='bg-gray-50 dark:bg-gray-900 sticky top-0 z-10'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                    分类名称
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                    类型
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                    查询条件
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
                {(config.CustomCategories || []).map((category, index) => (
                  <tr
                    key={index + category.name + category.type}
                    className='hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
                  >
                    <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100'>
                      {category.name || `未命名分类 ${index + 1}`}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300'>
                      <div className='flex items-center gap-1'>
                        {category.type === 'movie' ? <Film size={14} /> : <Tv size={14} />}
                        {category.type === 'movie' ? '电影' : '电视剧'}
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300 break-all max-w-md'>
                      {category.query}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400'>
                      {category.from === 'config' ? (
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
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${category.disabled ? buttonStyles.toggleOff : buttonStyles.toggleOn}`}
                          role='switch'
                          aria-checked={!category.disabled}
                          onClick={() => handleCategoryAction('toggle', category)}
                          disabled={isLoading(`category_toggle_${category.name || category.query.substring(0, 10)}`) || category.from === 'config'}
                        >
                          <span
                            aria-hidden='true'
                            className={`pointer-events-none inline-block h-5 w-5 rounded-full ${buttonStyles.toggleThumb} shadow transform ring-0 transition duration-200 ease-in-out ${category.disabled ? buttonStyles.toggleThumbOff : buttonStyles.toggleThumbOn}`}
                          />
                        </button>
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2'>
                      <button
                        onClick={() => handleStartEditCategory(category)}
                        disabled={isLoading(`category_edit_${category.name || category.query.substring(0, 10)}`) || category.from === 'config'}
                        className={`${buttonStyles.roundedPrimary} ${(isLoading(`category_edit_${category.name || category.query.substring(0, 10)}`) || category.from === 'config') ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleCategoryAction('delete', category)}
                        disabled={isLoading(`category_delete_${category.name || category.query.substring(0, 10)}`) || category.from === 'config'}
                        className={`${buttonStyles.roundedDanger} ${(isLoading(`category_delete_${category.name || category.query.substring(0, 10)}`) || category.from === 'config') ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
                {(config.CustomCategories || []).length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className='px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400'
                    >
                      暂无自定义分类，请添加分类来管理内容
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

export default CategoryConfig;