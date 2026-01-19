import React, { useCallback, useState } from 'react';
import { Users } from 'lucide-react';
import { AdminConfig } from '@/lib/admin.types';
import { getAuthInfoFromBrowserCookie } from '@/lib/auth';
import { useAlertModal, showSuccess, showError } from './useAlertModal';
import { useLoadingState } from './useLoadingState';
import { buttonStyles } from './ButtonStyles';
import CollapsibleTab from './CollapsibleTab';

// 用户配置组件的属性定义
export interface UserConfigProps {
  config: AdminConfig | null;
  role: 'owner' | 'admin' | null;
  refreshConfig: () => Promise<void>;
  setConfig: React.Dispatch<React.SetStateAction<AdminConfig | null>>;
  isExpanded?: boolean;
  onToggle?: () => void;
}

// 用户配置组件
const UserConfig = ({
  config,
  role,
  refreshConfig,
  setConfig,
  isExpanded = true,
  onToggle = () => {},
}: UserConfigProps) => {
  const { alertModal, showAlert, hideAlert } = useAlertModal();
  const { isLoading, withLoading } = useLoadingState();
  
  // 表单状态管理
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [showChangePasswordForm, setShowChangePasswordForm] = useState(false);
  const [showAddUserGroupForm, setShowAddUserGroupForm] = useState(false);
  const [showEditUserGroupForm, setShowEditUserGroupForm] = useState(false);
  
  // 用户表单数据
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    userGroup: '', // 新增用户组字段
  });
  
  // 修改密码表单数据
  const [changePasswordUser, setChangePasswordUser] = useState({
    username: '',
    password: '',
  });
  
  // 用户组表单数据
  const [newUserGroup, setNewUserGroup] = useState({
    name: '',
    enabledApis: [] as string[],
  });
  
  // 编辑用户组数据
  const [editingUserGroup, setEditingUserGroup] = useState<{
    name: string;
    enabledApis: string[];
  } | null>(null);
  
  // API配置弹窗状态
  const [showConfigureApisModal, setShowConfigureApisModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    username: string;
    role: 'user' | 'admin' | 'owner';
    enabledApis?: string[];
    tags?: string[];
  } | null>(null);
  const [selectedApis, setSelectedApis] = useState<string[]>([]);
  
  // 用户组配置弹窗状态
  const [showConfigureUserGroupModal, setShowConfigureUserGroupModal] = useState(false);
  const [selectedUserForGroup, setSelectedUserForGroup] = useState<{
    username: string;
    role: 'user' | 'admin' | 'owner';
    tags?: string[];
  } | null>(null);
  const [selectedUserGroups, setSelectedUserGroups] = useState<string[]>([]);
  
  // 批量操作状态
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showBatchUserGroupModal, setShowBatchUserGroupModal] = useState(false);
  const [selectedUserGroup, setSelectedUserGroup] = useState<string>('');
  
  // 删除确认弹窗状态
  const [showDeleteUserGroupModal, setShowDeleteUserGroupModal] = useState(false);
  const [deletingUserGroup, setDeletingUserGroup] = useState<{
    name: string;
    affectedUsers: Array<{
      username: string;
      role: 'user' | 'admin' | 'owner';
    }>;
  } | null>(null);
  
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  
  // 当前登录用户名
  const currentUsername = getAuthInfoFromBrowserCookie()?.username || null;
  
  // 使用 useMemo 计算全选状态，避免每次渲染都重新计算
  const selectAllUsers = React.useMemo(() => {
    const selectableUserCount = 
      config?.UserConfig?.Users?.filter(
        (user) =>
          role === 'owner' ||
          (role === 'admin' &&
            (user.role === 'user' || user.username === currentUsername))
      ).length || 0;
    return selectedUsers.size === selectableUserCount && selectedUsers.size > 0;
  }, [selectedUsers.size, config?.UserConfig?.Users, role, currentUsername]);
  
  // 获取用户组列表
  const userGroups = config?.UserConfig?.Tags || [];
  
  // 处理用户组相关操作
  const handleUserGroupAction = async (
    action: 'add' | 'edit' | 'delete',
    groupName: string,
    enabledApis?: string[]
  ) => {
    return withLoading(`userGroup_${action}_${groupName}`, async () => {
      try {
        const res = await fetch('/api/admin/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'userGroup',
            groupAction: action,
            groupName,
            enabledApis,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `操作失败: ${res.status}`);
        }

        await refreshConfig();

        if (action === 'add') {
          setNewUserGroup({ name: '', enabledApis: [] });
          setShowAddUserGroupForm(false);
        } else if (action === 'edit') {
          setEditingUserGroup(null);
          setShowEditUserGroupForm(false);
        }

        showSuccess(
          action === 'add'
            ? '用户组添加成功'
            : action === 'edit'
            ? '用户组更新成功'
            : '用户组删除成功',
          showAlert
        );
      } catch (err) {
        showError(err instanceof Error ? err.message : '操作失败', showAlert);
        throw err;
      }
    });
  };
  
  // 添加用户组
  const handleAddUserGroup = () => {
    if (!newUserGroup.name.trim()) return;
    handleUserGroupAction('add', newUserGroup.name, newUserGroup.enabledApis);
  };
  
  // 编辑用户组
  const handleEditUserGroup = () => {
    if (!editingUserGroup?.name.trim()) return;
    handleUserGroupAction(
      'edit',
      editingUserGroup.name,
      editingUserGroup.enabledApis
    );
  };
  
  // 删除用户组确认
  const handleDeleteUserGroup = (groupName: string) => {
    // 计算会受影响的用户数量
    const affectedUsers = 
      config?.UserConfig?.Users?.filter(
        (user) => user.tags && user.tags.includes(groupName)
      ) || [];

    setDeletingUserGroup({
      name: groupName,
      affectedUsers: affectedUsers.map((u) => ({
        username: u.username,
        role: u.role,
      })),
    });
    setShowDeleteUserGroupModal(true);
  };
  
  // 确认删除用户组
  const handleConfirmDeleteUserGroup = async () => {
    if (!deletingUserGroup) return;

    try {
      await handleUserGroupAction('delete', deletingUserGroup.name);
      setShowDeleteUserGroupModal(false);
      setDeletingUserGroup(null);
    } catch (err) {
      // 错误处理已在 handleUserGroupAction 中处理
    }
  };
  
  // 开始编辑用户组
  const handleStartEditUserGroup = (group: {
    name: string;
    enabledApis: string[];
  }) => {
    setEditingUserGroup({ ...group });
    setShowEditUserGroupForm(true);
    setShowAddUserGroupForm(false);
  };
  
  // 为用户分配用户组
  const handleAssignUserGroup = async (
    username: string,
    userGroups: string[]
  ) => {
    return withLoading(`assignUserGroup_${username}`, async () => {
      try {
        const res = await fetch('/api/admin/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetUsername: username,
            action: 'updateUserGroups',
            userGroups,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `操作失败: ${res.status}`);
        }

        await refreshConfig();
        showSuccess('用户组分配成功', showAlert);
      } catch (err) {
        showError(err instanceof Error ? err.message : '操作失败', showAlert);
        throw err;
      }
    });
  };
  
  // 通用用户操作函数
  const handleUserAction = async (
    action:
      | 'add'
      | 'ban'
      | 'unban'
      | 'setAdmin'
      | 'cancelAdmin'
      | 'changePassword'
      | 'deleteUser',
    targetUsername: string,
    targetPassword?: string,
    userGroup?: string
  ) => {
    try {
      const res = await fetch('/api/admin/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUsername,
          ...(targetPassword ? { targetPassword } : {}),
          ...(userGroup ? { userGroup } : {}),
          action,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `操作失败: ${res.status}`);
      }

      // 成功后刷新配置（无需整页刷新）
      await refreshConfig();
    } catch (err) {
      showError(err instanceof Error ? err.message : '操作失败', showAlert);
    }
  };
  
  // 禁止用户
  const handleBanUser = async (uname: string) => {
    await withLoading(`banUser_${uname}`, () => handleUserAction('ban', uname));
  };
  
  // 解除禁止用户
  const handleUnbanUser = async (uname: string) => {
    await withLoading(`unbanUser_${uname}`, () =>
      handleUserAction('unban', uname)
    );
  };
  
  // 设置为管理员
  const handleSetAdmin = async (uname: string) => {
    await withLoading(`setAdmin_${uname}`, () =>
      handleUserAction('setAdmin', uname)
    );
  };
  
  // 取消管理员
  const handleRemoveAdmin = async (uname: string) => {
    await withLoading(`removeAdmin_${uname}`, () =>
      handleUserAction('cancelAdmin', uname)
    );
  };
  
  // 添加用户
  const handleAddUser = async () => {
    if (!newUser.username || !newUser.password) return;
    await withLoading('addUser', async () => {
      await handleUserAction(
        'add',
        newUser.username,
        newUser.password,
        newUser.userGroup
      );
      setNewUser({ username: '', password: '', userGroup: '' });
      setShowAddUserForm(false);
    });
  };
  
  // 修改密码
  const handleChangePassword = async () => {
    if (!changePasswordUser.username || !changePasswordUser.password) return;
    await withLoading(
      `changePassword_${changePasswordUser.username}`,
      async () => {
        await handleUserAction(
          'changePassword',
          changePasswordUser.username,
          changePasswordUser.password
        );
        setChangePasswordUser({ username: '', password: '' });
        setShowChangePasswordForm(false);
      }
    );
  };
  
  // 显示修改密码表单
  const handleShowChangePasswordForm = (username: string) => {
    setChangePasswordUser({ username, password: '' });
    setShowChangePasswordForm(true);
    setShowAddUserForm(false); // 关闭添加用户表单
  };
  
  // 删除用户确认
  const handleDeleteUser = (username: string) => {
    setDeletingUser(username);
    setShowDeleteUserModal(true);
  };
  
  // 确认删除用户
  const handleConfirmDeleteUser = async () => {
    if (!deletingUser) return;

    await withLoading(`deleteUser_${deletingUser}`, async () => {
      try {
        await handleUserAction('deleteUser', deletingUser);
        setShowDeleteUserModal(false);
        setDeletingUser(null);
      } catch (err) {
        // 错误处理已在 handleUserAction 中处理
      }
    });
  };
  
  // 配置用户API权限
  const handleConfigureUserApis = (user: {
    username: string;
    role: 'user' | 'admin' | 'owner';
    enabledApis?: string[];
  }) => {
    setSelectedUser(user);
    setSelectedApis(user.enabledApis || []);
    setShowConfigureApisModal(true);
  };
  
  // 配置用户组
  const handleConfigureUserGroup = (user: {
    username: string;
    role: 'user' | 'admin' | 'owner';
    tags?: string[];
  }) => {
    setSelectedUserForGroup(user);
    setSelectedUserGroups(user.tags || []);
    setShowConfigureUserGroupModal(true);
  };
  
  // 保存用户组配置
  const handleSaveUserGroups = async () => {
    if (!selectedUserForGroup) return;

    await withLoading(
      `saveUserGroups_${selectedUserForGroup.username}`,
      async () => {
        try {
          await handleAssignUserGroup(
            selectedUserForGroup.username,
            selectedUserGroups
          );
          setShowConfigureUserGroupModal(false);
          setSelectedUserForGroup(null);
          setSelectedUserGroups([]);
        } catch (err) {
          // 错误处理已在 handleAssignUserGroup 中处理
        }
      }
    );
  };
  
  // 处理用户选择
  const handleSelectUser = useCallback((username: string, checked: boolean) => {
    setSelectedUsers((prev) => {
      const newSelectedUsers = new Set(prev);
      if (checked) {
        newSelectedUsers.add(username);
      } else {
        newSelectedUsers.delete(username);
      }
      return newSelectedUsers;
    });
  }, []);
  
  // 处理全选用户
  const handleSelectAllUsers = useCallback(
    (checked: boolean) => {
      if (checked) {
        // 只选择自己有权限操作的用户
        const selectableUsernames = 
          config?.UserConfig?.Users?.filter(
            (user) =>
              role === 'owner' ||
              (role === 'admin' &&
                (user.role === 'user' || user.username === currentUsername))
          ).map((u) => u.username) || [];
        setSelectedUsers(new Set(selectableUsernames));
      } else {
        setSelectedUsers(new Set());
      }
    },
    [config?.UserConfig?.Users, role, currentUsername]
  );
  
  // 批量设置用户组
  const handleBatchSetUserGroup = async (userGroup: string) => {
    if (selectedUsers.size === 0) return;

    await withLoading('batchSetUserGroup', async () => {
      try {
        const res = await fetch('/api/admin/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'batchUpdateUserGroups',
            usernames: Array.from(selectedUsers),
            userGroups: userGroup === '' ? [] : [userGroup],
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `操作失败: ${res.status}`);
        }

        const userCount = selectedUsers.size;
        setSelectedUsers(new Set());
        setShowBatchUserGroupModal(false);
        setSelectedUserGroup('');
        showSuccess(
          `已为 ${userCount} 个用户设置用户组: ${userGroup}`,
          showAlert
        );

        // 刷新配置
        await refreshConfig();
      } catch (err) {
        showError('批量设置用户组失败', showAlert);
        throw err;
      }
    });
  };
  
  // 保存用户API配置
  const handleSaveUserApis = async () => {
    if (!selectedUser) return;

    await withLoading(`saveUserApis_${selectedUser.username}`, async () => {
      try {
        const res = await fetch('/api/admin/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetUsername: selectedUser.username,
            action: 'updateUserApis',
            enabledApis: selectedApis,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `操作失败: ${res.status}`);
        }

        // 成功后刷新配置
        await refreshConfig();
        setShowConfigureApisModal(false);
        setSelectedUser(null);
        setSelectedApis([]);
      } catch (err) {
        showError(err instanceof Error ? err.message : '操作失败', showAlert);
        throw err;
      }
    });
  };
  
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
  
  if (!config) {
    return (
      <div className='text-center text-gray-500 dark:text-gray-400'>
        加载中...
      </div>
    );
  }
  
  return (
    <CollapsibleTab
      title="用户管理"
      icon={<Users className="w-6 h-6 text-blue-500" />}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
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
                    type='button'
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${config.UserConfig.AllowRegister ? buttonStyles.toggleOn : buttonStyles.toggleOff}`}
                    role='switch'
                    aria-checked={config.UserConfig.AllowRegister}
                    onClick={async () => {
                      // 乐观更新：立即更新UI状态
                      const previousValue = config.UserConfig.AllowRegister;
                      const newValue = !previousValue;

                      // 立即更新本地状态
                      setConfig((prev) => ({
                        ...prev!,
                        UserConfig: {
                          ...prev!.UserConfig,
                          AllowRegister: newValue,
                        },
                      }));

                      await withLoading('toggleAllowRegister', async () => {
                        try {
                          const response = await fetch('/api/admin/config', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              ...config,
                              UserConfig: {
                                ...config.UserConfig,
                                AllowRegister: newValue,
                              },
                            }),
                          });

                          if (response.ok) {
                            showAlert({
                              type: 'success',
                              title: '设置已更新',
                              message: newValue
                                ? '已允许用户注册'
                                : '已禁止用户注册',
                              timer: 2000,
                            });
                          } else {
                            throw new Error('更新配置失败');
                          }
                        } catch (err) {
                          // 发生错误时回滚状态
                          setConfig((prev) => ({
                            ...prev!,
                            UserConfig: {
                              ...prev!.UserConfig,
                              AllowRegister: previousValue,
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
                      className={`pointer-events-none inline-block h-5 w-5 rounded-full ${buttonStyles.toggleThumb} shadow transform ring-0 transition duration-200 ease-in-out ${config.UserConfig.AllowRegister ? buttonStyles.toggleThumbOn : buttonStyles.toggleThumbOff}`}
                    />
                  </button>
                  <span className='ml-3 text-sm font-medium text-gray-900 dark:text-gray-100'>
                    {config.UserConfig.AllowRegister ? '开启' : '关闭'}
                  </span>
                </div>
              </div>
            </div>
            <div className='mt-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800'>
              <div className='flex items-center justify-between'>
                <div>
                  <div className='font-medium text-gray-900 dark:text-gray-100'>
                    注册审核
                  </div>
                  <div className='text-sm text-gray-600 dark:text-gray-400'>
                    开启后，新用户提交注册申请需管理员审核通过才可使用
                  </div>
                </div>
                <div className='flex items-center'>
                  <button
                    type='button'
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${(config as any).UserConfig.RequireApproval ? buttonStyles.toggleOn : buttonStyles.toggleOff}`}
                    role='switch'
                    aria-checked={(config as any).UserConfig.RequireApproval}
                    onClick={async () => {
                      // 乐观更新：立即更新UI状态
                      const previousValue = (config as any).UserConfig.RequireApproval;
                      const newValue = !previousValue;

                      // 立即更新本地状态
                      setConfig((prev) => ({
                        ...prev!,
                        UserConfig: {
                          ...prev!.UserConfig,
                          RequireApproval: newValue,
                          PendingUsers: (prev!.UserConfig as any).PendingUsers || [],
                        },
                      }));

                      await withLoading('toggleRequireApproval', async () => {
                        try {
                          const response = await fetch('/api/admin/config', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              ...config,
                              UserConfig: {
                                ...config.UserConfig,
                                RequireApproval: newValue,
                                PendingUsers: (config as any).UserConfig.PendingUsers || [],
                              },
                            }),
                          });
                          if (response.ok) {
                            showAlert({
                              type: 'success',
                              title: '设置已更新',
                              message: newValue
                                ? '已开启注册审核'
                                : '已关闭注册审核',
                              timer: 2000,
                            });
                          } else {
                            throw new Error('更新配置失败');
                          }
                        } catch (err) {
                          // 发生错误时回滚状态
                          setConfig((prev) => ({
                            ...prev!,
                            UserConfig: {
                              ...prev!.UserConfig,
                              RequireApproval: previousValue,
                              PendingUsers: (prev!.UserConfig as any).PendingUsers || [],
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
                      className={`pointer-events-none inline-block h-5 w-5 rounded-full ${buttonStyles.toggleThumb} shadow transform ring-0 transition duration-200 ease-in-out ${(config as any).UserConfig.RequireApproval ? buttonStyles.toggleThumbOn : buttonStyles.toggleThumbOff}`}
                    />
                  </button>
                  <span className='ml-3 text-sm font-medium text-gray-900 dark:text-gray-100'>
                    {(config as any).UserConfig.RequireApproval ? '开启' : '关闭'}
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
                {(config as any).UserConfig.PendingUsers?.length || 0}
              </div>
              <div className='text-sm text-blue-600 dark:text-blue-400'>
                待审核用户
              </div>
            </div>
            <div className='p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800'>
              <div className='text-2xl font-bold text-purple-800 dark:text-purple-300'>
                {
                  config.UserConfig.Users.filter(
                    (u) =>
                      (u as any).createdAt?.slice(0, 10) ===
                      new Date().toISOString().slice(0, 10)
                  ).length
                }
              </div>
              <div className='text-sm text-purple-600 dark:text-purple-400'>
                今日新增
              </div>
            </div>
          </div>
        </div>

        {/* 注册审核队列（管理员与站长可见） */}
        {(role === 'owner' || role === 'admin') && (
          <div>
            <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>
              注册审核
            </h4>
            <div className='rounded-lg border border-gray-200 dark:border-gray-800 overflow-x-auto md:overflow-visible max-h-[60vh] overflow-y-auto scrollbar-hide'>
              <table className='min-w-[720px] md:min-w-full divide-y divide-gray-200 dark:divide-gray-700'>
                <thead className='bg-gray-50 dark:bg-gray-900/40'>
                  <tr>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                      用户名
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                      说明
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                      申请时间
                    </th>
                    <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className='bg-white dark:bg-black divide-y divide-gray-200 dark:divide-gray-700'>
                  {((config as any).UserConfig.PendingUsers || []).length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className='px-6 py-6 text-center text-sm text-gray-500 dark:text-gray-400'
                      >
                        暂无待审核用户
                      </td>
                    </tr>
                  ) : (
                    ((config as any).UserConfig.PendingUsers || []).map(
                      (p: any) => (
                        <tr key={p.username}>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100'>
                            {p.username}
                          </td>
                          <td className='px-6 py-4 text-sm text-gray-600 dark:text-gray-300 break-words max-w-[28rem]'>
                            {p.reason || '-'}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400'>
                            {new Date(p.appliedAt).toLocaleString()}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-right text-sm'>
                            <button
                              className={buttonStyles.success}
                              onClick={async () => {
                                await withLoading(
                                  `approve_${p.username}`,
                                  async () => {
                                    const resp = await fetch('/api/admin/user', {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json',
                                      },
                                      body: JSON.stringify({
                                        action: 'approveRegister',
                                        targetUsername: p.username,
                                      }),
                                    });
                                    if (resp.ok) {
                                      await refreshConfig();
                                    }
                                  }
                                );
                              }}
                            >
                              通过
                            </button>
                            <button
                              className={`ml-2 ${buttonStyles.danger}`}
                              onClick={async () => {
                                await withLoading(
                                  `reject_${p.username}`,
                                  async () => {
                                    const resp = await fetch('/api/admin/user', {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json',
                                      },
                                      body: JSON.stringify({
                                        action: 'rejectRegister',
                                        targetUsername: p.username,
                                      }),
                                    });
                                    if (resp.ok) {
                                      await refreshConfig();
                                    }
                                  }
                                );
                              }}
                            >
                              拒绝
                            </button>
                          </td>
                        </tr>
                      )
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 用户组管理 */}
        <div>
          <div className='flex items-center justify-between mb-3'>
            <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
              用户组管理
            </h4>
            <button
              onClick={() => {
                setShowAddUserGroupForm(!showAddUserGroupForm);
                if (showEditUserGroupForm) {
                  setShowEditUserGroupForm(false);
                  setEditingUserGroup(null);
                }
              }}
              className={
                showAddUserGroupForm
                  ? buttonStyles.secondary
                  : buttonStyles.primary
              }
            >
              {showAddUserGroupForm ? '取消' : '添加用户组'}
            </button>
          </div>

          {/* 用户组列表 */}
          <div className='border border-gray-200 dark:border-gray-700 rounded-lg max-h-[20rem] overflow-y-auto overflow-x-auto relative'>
            <table className='min-w-full divide-y divide-gray-200 dark:divide-gray-700'>
              <thead className='bg-gray-50 dark:bg-gray-900 sticky top-0 z-10'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                    用户组名称
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                    可用视频源
                  </th>
                  <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-200 dark:divide-gray-700'>
                {userGroups.map((group) => (
                  <tr
                    key={group.name}
                    className='hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
                  >
                    <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100'>
                      {group.name}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='flex items-center space-x-2'>
                        <span className='text-sm text-gray-900 dark:text-gray-100'>
                          {group.enabledApis && group.enabledApis.length > 0
                            ? `${group.enabledApis.length} 个源`
                            : '无限制'}
                        </span>
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2'>
                      <button
                        onClick={() => handleStartEditUserGroup(group)}
                        disabled={isLoading(`userGroup_edit_${group.name}`)}
                        className={`${buttonStyles.roundedPrimary} ${isLoading(`userGroup_edit_${group.name}`) ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDeleteUserGroup(group.name)}
                        className={buttonStyles.roundedDanger}
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
                {userGroups.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className='px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400'
                    >
                      暂无用户组，请添加用户组来管理用户权限
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 用户列表 */}
        <div>
          <div className='flex items-center justify-between mb-3'>
            <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
              用户列表
            </h4>
            <div className='flex items-center space-x-2'>
              {/* 批量操作按钮 */}
              {selectedUsers.size > 0 && (
                <>
                  <div className='flex items-center space-x-3'>
                    <span className='text-sm text-gray-600 dark:text-gray-400'>
                      已选择 {selectedUsers.size} 个用户
                    </span>
                    <button
                      onClick={() => setShowBatchUserGroupModal(true)}
                      className={buttonStyles.primary}
                    >
                      批量设置用户组
                    </button>
                  </div>
                  <div className='w-px h-6 bg-gray-300 dark:bg-gray-600'></div>
                </>
              )}
              <button
                onClick={() => {
                  setShowAddUserForm(!showAddUserForm);
                  if (showChangePasswordForm) {
                    setShowChangePasswordForm(false);
                    setChangePasswordUser({ username: '', password: '' });
                  }
                }}
                className={
                  showAddUserForm ? buttonStyles.secondary : buttonStyles.success
                }
              >
                {showAddUserForm ? '取消' : '添加用户'}
              </button>
            </div>
          </div>

          {/* 添加用户表单 */}
          {showAddUserForm && (
            <div className='mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700'>
              <div className='space-y-4'>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <input
                    type='text'
                    placeholder='用户名'
                    value={newUser.username}
                    onChange={(e) =>
                      setNewUser((prev) => ({
                        ...prev,
                        username: e.target.value,
                      }))
                    }
                    className='px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  />
                  <input
                    type='password'
                    placeholder='密码'
                    value={newUser.password}
                    onChange={(e) =>
                      setNewUser((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                    className='px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                    用户组（可选）
                  </label>
                  <select
                    value={newUser.userGroup}
                    onChange={(e) =>
                      setNewUser((prev) => ({
                        ...prev,
                        userGroup: e.target.value,
                      }))
                    }
                    className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  >
                    <option value=''>无用户组（无限制）</option>
                    {userGroups.map((group) => (
                      <option key={group.name} value={group.name}>
                        {group.name} (
                        {group.enabledApis && group.enabledApis.length > 0
                          ? `${group.enabledApis.length} 个源`
                          : '无限制'}
                        )
                      </option>
                    ))}
                  </select>
                </div>
                <div className='flex justify-end'>
                  <button
                    onClick={handleAddUser}
                    disabled={isLoading('addUser')}
                    className={`${buttonStyles.success} ${isLoading('addUser') ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    确定
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </CollapsibleTab>
  );
};

export default UserConfig;
