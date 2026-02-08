// 观影室页面
'use client';

import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';

import { useWatchRoomContext } from '@/components/WatchRoomProvider';

import type { Room } from '@/types/watch-room';

const WatchRoomPage: React.FC = () => {
  const router = useRouter();
  const watchRoom = useWatchRoomContext();

  const [roomList, setRoomList] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    password: '',
    isPublic: true,
    userName: '',
  });
  const [joinForm, setJoinForm] = useState({
    roomId: '',
    password: '',
    userName: '',
  });
  const [showJoinModal, setShowJoinModal] = useState(false);

  // 获取房间列表
  const fetchRoomList = useCallback(async () => {
    if (!watchRoom.isEnabled || !watchRoom.isConnected) {
      setError('观影室功能未启用或未连接');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const rooms = await watchRoom.getRoomList();
      setRoomList(rooms);
    } catch (err) {
      setError('获取房间列表失败');
      console.error('Failed to fetch room list:', err);
    } finally {
      setIsLoading(false);
    }
  }, [watchRoom.isEnabled, watchRoom.isConnected, watchRoom.getRoomList]);

  // 初始加载房间列表
  useEffect(() => {
    fetchRoomList();
  }, [fetchRoomList]);

  // 创建房间
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!createForm.name || !createForm.userName) {
      setError('房间名称和用户名不能为空');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const room = await watchRoom.createRoom(createForm);
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        description: '',
        password: '',
        isPublic: true,
        userName: '',
      });
      // 创建成功后跳转到播放页面或显示成功信息
      router.push('/play');
    } catch (err) {
      setError('创建房间失败');
      console.error('Failed to create room:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 加入房间
  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!joinForm.roomId || !joinForm.userName) {
      setError('房间ID和用户名不能为空');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await watchRoom.joinRoom(joinForm);
      setShowJoinModal(false);
      setJoinForm({
        roomId: '',
        password: '',
        userName: '',
      });
      // 加入成功后跳转到播放页面
      router.push('/play');
    } catch (err) {
      setError('加入房间失败，请检查房间ID和密码');
      console.error('Failed to join room:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 格式化时间
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  if (!watchRoom.isEnabled) {
    return (
      <div className='container mx-auto px-4 py-8'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold mb-4'>观影室</h1>
          <p className='text-gray-600'>观影室功能未启用</p>
        </div>
      </div>
    );
  }

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='text-center mb-8'>
        <h1 className='text-2xl font-bold mb-2'>观影室</h1>
        <p className='text-gray-600'>与朋友一起观看视频，实时同步播放</p>
      </div>

      {error && (
        <div className='bg-red-100 text-red-700 p-4 rounded-lg mb-6'>
          {error}
        </div>
      )}

      <div className='flex justify-center gap-4 mb-8'>
        <button
          onClick={() => setShowCreateModal(true)}
          className='bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors'
        >
          创建房间
        </button>
        <button
          onClick={() => setShowJoinModal(true)}
          className='bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors'
        >
          加入房间
        </button>
        <button
          onClick={fetchRoomList}
          className='bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors'
        >
          刷新房间列表
        </button>
      </div>

      {/* 公共房间列表 */}
      <div className='mb-8'>
        <h2 className='text-xl font-semibold mb-4'>公共房间</h2>
        {isLoading ? (
          <div className='text-center py-8'>
            <p>加载中...</p>
          </div>
        ) : roomList.length === 0 ? (
          <div className='text-center py-8'>
            <p>暂无公共房间</p>
          </div>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            {roomList
              .filter((room) => room.isPublic)
              .map((room) => (
                <div
                  key={room.id}
                  className='border rounded-lg p-4 hover:shadow-md transition-shadow'
                >
                  <h3 className='font-semibold text-lg mb-2'>{room.name}</h3>
                  <p className='text-gray-600 text-sm mb-2'>
                    {room.description || '无描述'}
                  </p>
                  <p className='text-gray-500 text-xs mb-2'>
                    创建者: {room.ownerName} · {formatTime(room.createdAt)}
                  </p>
                  <p className='text-gray-500 text-xs mb-4'>
                    成员: {room.memberCount}
                  </p>
                  <button
                    onClick={() => {
                      setJoinForm({
                        roomId: room.id,
                        password: '',
                        userName: joinForm.userName,
                      });
                      setShowJoinModal(true);
                    }}
                    className='w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors'
                  >
                    加入房间
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* 创建房间模态框 */}
      {showCreateModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white rounded-lg p-6 max-w-md w-full'>
            <h2 className='text-xl font-semibold mb-4'>创建房间</h2>
            <form onSubmit={handleCreateRoom}>
              <div className='mb-4'>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  房间名称
                </label>
                <input
                  type='text'
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, name: e.target.value })
                  }
                  className='w-full border rounded-lg px-3 py-2'
                  required
                />
              </div>
              <div className='mb-4'>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  房间描述
                </label>
                <textarea
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      description: e.target.value,
                    })
                  }
                  className='w-full border rounded-lg px-3 py-2'
                  rows={3}
                />
              </div>
              <div className='mb-4'>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  密码 (可选)
                </label>
                <input
                  type='password'
                  value={createForm.password}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, password: e.target.value })
                  }
                  className='w-full border rounded-lg px-3 py-2'
                />
              </div>
              <div className='mb-4 flex items-center'>
                <input
                  type='checkbox'
                  id='isPublic'
                  checked={createForm.isPublic}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, isPublic: e.target.checked })
                  }
                  className='mr-2'
                />
                <label
                  htmlFor='isPublic'
                  className='text-sm font-medium text-gray-700'
                >
                  公开房间
                </label>
              </div>
              <div className='mb-4'>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  用户名
                </label>
                <input
                  type='text'
                  value={createForm.userName}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, userName: e.target.value })
                  }
                  className='w-full border rounded-lg px-3 py-2'
                  required
                />
              </div>
              <div className='flex gap-2'>
                <button
                  type='button'
                  onClick={() => setShowCreateModal(false)}
                  className='flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors'
                >
                  取消
                </button>
                <button
                  type='submit'
                  disabled={isLoading}
                  className='flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors'
                >
                  {isLoading ? '创建中...' : '创建房间'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 加入房间模态框 */}
      {showJoinModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white rounded-lg p-6 max-w-md w-full'>
            <h2 className='text-xl font-semibold mb-4'>加入房间</h2>
            <form onSubmit={handleJoinRoom}>
              <div className='mb-4'>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  房间ID
                </label>
                <input
                  type='text'
                  value={joinForm.roomId}
                  onChange={(e) =>
                    setJoinForm({ ...joinForm, roomId: e.target.value })
                  }
                  className='w-full border rounded-lg px-3 py-2'
                  required
                />
              </div>
              <div className='mb-4'>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  密码 (可选)
                </label>
                <input
                  type='password'
                  value={joinForm.password}
                  onChange={(e) =>
                    setJoinForm({ ...joinForm, password: e.target.value })
                  }
                  className='w-full border rounded-lg px-3 py-2'
                />
              </div>
              <div className='mb-4'>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  用户名
                </label>
                <input
                  type='text'
                  value={joinForm.userName}
                  onChange={(e) =>
                    setJoinForm({ ...joinForm, userName: e.target.value })
                  }
                  className='w-full border rounded-lg px-3 py-2'
                  required
                />
              </div>
              <div className='flex gap-2'>
                <button
                  type='button'
                  onClick={() => setShowJoinModal(false)}
                  className='flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors'
                >
                  取消
                </button>
                <button
                  type='submit'
                  disabled={isLoading}
                  className='flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors'
                >
                  {isLoading ? '加入中...' : '加入房间'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WatchRoomPage;
