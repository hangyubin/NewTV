// WatchRoom 全局状态管理 Provider
'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';


import type { WatchRoomSocket } from '@/lib/watch-room-socket';
import { watchRoomSocketManager } from '@/lib/watch-room-socket';
import { useWatchRoom } from '@/hooks/useWatchRoom';

import Toast, { ToastProps } from '@/components/Toast';

import type {
  ChatMessage,
  LiveState,
  Member,
  PlayState,
  Room,
  WatchRoomConfig,
} from '@/types/watch-room';

interface WatchRoomContextType {
  socket: WatchRoomSocket | null;
  isConnected: boolean;
  reconnectFailed: boolean;
  currentRoom: Room | null;
  members: Member[];
  chatMessages: ChatMessage[];
  isOwner: boolean;
  isEnabled: boolean;
  config: WatchRoomConfig | null;

  // 房间操作
  createRoom: (data: {
    name: string;
    description: string;
    password?: string;
    isPublic: boolean;
    userName: string;
  }) => Promise<Room>;
  joinRoom: (data: {
    roomId: string;
    password?: string;
    userName: string;
  }) => Promise<{ room: Room; members: Member[] }>;
  leaveRoom: () => void;
  getRoomList: () => Promise<Room[]>;

  // 聊天
  sendChatMessage: (content: string, type?: 'text' | 'emoji') => void;

  // 播放控制（供 play/live 页面使用）
  updatePlayState: (state: PlayState) => void;
  seekPlayback: (currentTime: number) => void;
  play: () => void;
  pause: () => void;
  changeVideo: (state: PlayState) => void;
  changeLiveChannel: (state: LiveState) => void;
  clearRoomState: () => void;

  // 重连
  manualReconnect: () => Promise<void>;
}

const WatchRoomContext = createContext<WatchRoomContextType | null>(null);

export const useWatchRoomContext = () => {
  const context = useContext(WatchRoomContext);
  if (!context) {
    throw new Error(
      'useWatchRoomContext must be used within WatchRoomProvider'
    );
  }
  return context;
};

// 安全版本，可以在非 Provider 内使用
export const useWatchRoomContextSafe = () => {
  return useContext(WatchRoomContext);
};

interface WatchRoomProviderProps {
  children: React.ReactNode;
}

export function WatchRoomProvider({ children }: WatchRoomProviderProps) {
  const [config, setConfig] = useState<WatchRoomConfig | null>(null);
  const [isEnabled, setIsEnabled] = useState(true);
  const [toast, setToast] = useState<ToastProps | null>(null);
  const [reconnectFailed, setReconnectFailed] = useState(false);

  // 处理房间删除的回调
  const handleRoomDeleted = useCallback((data?: { reason?: string }) => {
    // 显示Toast提示
    if (data?.reason === 'owner_left') {
      setToast({
        message: '房主已解散房间',
        type: 'error',
        duration: 4000,
        onClose: () => setToast(null),
      });
    } else {
      setToast({
        message: '房间已被删除',
        type: 'info',
        duration: 3000,
        onClose: () => setToast(null),
      });
    }
  }, []);

  // 处理房间状态清除的回调（房主离开超过30秒）
  const handleStateCleared = useCallback(() => {
    setToast({
      message: '房主已离开，播放状态已清除',
      type: 'info',
      duration: 4000,
      onClose: () => setToast(null),
    });
  }, []);

  const watchRoom = useWatchRoom(handleRoomDeleted, handleStateCleared);

  // 手动重连
  const manualReconnect = useCallback(async () => {
    setReconnectFailed(false);

    const success = await watchRoomSocketManager.reconnect();

    if (success) {
      // 尝试重新加入房间
      const storedInfo = localStorage.getItem('watch_room_info');
      if (storedInfo && watchRoom.socket) {
        try {
          const info = JSON.parse(storedInfo);
          await watchRoom.joinRoom({
            roomId: info.roomId,
            password: info.password,
            userName: info.userName,
          });
        } catch {
          // 忽略重连房间失败的错误
        }
      }
    } else {
      setReconnectFailed(true);
    }
  }, [watchRoom]);

  // 加载配置
  useEffect(() => {
    const loadConfig = async () => {
      // 无论如何都启用观影室功能
      const watchRoomConfig: WatchRoomConfig = {
        enabled: true,
        serverType: 'external',
        externalServerUrl: 'wss://bingdy.up.railway.app',
        externalServerAuth: 'hang8743559@hao123.com',
      };
      
      // 打印配置值，确保正确
      console.log('初始配置:', watchRoomConfig);

      // 尝试从 API 获取配置，即使失败也不影响启用状态
      try {
        // 使用公共 API 获取观影室配置（不需要管理员权限）
        const response = await fetch('/api/server-config');
        if (response.ok) {
          const data = await response.json();
          console.log('API 返回的配置:', data);
          // 从 API 获取配置，但保持启用状态
          if (data.WatchRoom) {
            console.log('API 返回的 WatchRoom 配置:', data.WatchRoom);
            // 强制使用外部服务器
            watchRoomConfig.serverType = 'external';
            watchRoomConfig.externalServerUrl = data.WatchRoom.externalServerUrl || 'wss://bingdy.up.railway.app';
            console.log('更新后的配置:', watchRoomConfig);
          }
        }

        // 尝试从 API 获取认证信息，即使失败也不影响启用状态
        if (watchRoomConfig.serverType === 'external') {
          try {
            const authResponse = await fetch('/api/watch-room-auth');
            if (authResponse.ok) {
              const authData = await authResponse.json();
              watchRoomConfig.externalServerAuth = authData.externalServerAuth || 'hang8743559@hao123.com';
            }
          } catch (error) {
            console.warn('获取观影室认证信息失败，使用默认值:', error);
          }
        }
      } catch (error) {
        console.warn('加载观影室配置失败，使用默认值:', error);
      }

      // 强制启用观影室功能
      watchRoomConfig.enabled = true;

      // 更新状态
      setConfig(watchRoomConfig);
      setIsEnabled(true);

      // 尝试连接到观影室服务器
      try {
        console.log('尝试连接到观影室服务器:', watchRoomConfig.externalServerUrl);
        
        // 设置重连回调
        watchRoomSocketManager.setReconnectFailedCallback(() => {
          console.log('观影室服务器重连失败');
          setReconnectFailed(true);
          setToast({
            message: '观影室服务器连接失败，请检查网络连接',
            type: 'error',
            duration: 5000,
            onClose: () => setToast(null),
          });
        });

        watchRoomSocketManager.setReconnectSuccessCallback(() => {
          console.log('观影室服务器重连成功');
          setReconnectFailed(false);
          setToast({
            message: '观影室服务器连接成功',
            type: 'success',
            duration: 3000,
            onClose: () => setToast(null),
          });
        });

        console.log('开始连接到观影室服务器:', watchRoomConfig);
        await watchRoom.connect(watchRoomConfig);
        console.log('成功连接到观影室服务器');
        
        // 连接成功后，尝试获取房间列表
        try {
          console.log('尝试获取房间列表');
          const rooms = await watchRoom.getRoomList();
          console.log('成功获取房间列表，共', rooms.length, '个房间');
        } catch (error) {
          console.error('获取房间列表失败:', error);
          setToast({
            message: '连接成功，但获取房间列表失败，请稍后重试',
            type: 'warning',
            duration: 5000,
            onClose: () => setToast(null),
          });
        }
      } catch (error) {
        console.error('连接观影室服务器失败:', error);
        // 连接失败时仍然保持启用状态，让用户看到错误信息
        setReconnectFailed(true);
        setToast({
          message: '无法连接到观影室服务器，请检查网络连接',
          type: 'error',
          duration: 5000,
          onClose: () => setToast(null),
        });
      }
    };

    loadConfig();

    // 清理
    return () => {
      watchRoom.disconnect();
    };
  }, []); // 无依赖，只在组件挂载时执行一次

  const contextValue: WatchRoomContextType = {
    socket: watchRoom.socket,
    isConnected: watchRoom.isConnected,
    reconnectFailed,
    currentRoom: watchRoom.currentRoom,
    members: watchRoom.members,
    chatMessages: watchRoom.chatMessages,
    isOwner: watchRoom.isOwner,
    isEnabled,
    config,
    createRoom: watchRoom.createRoom,
    joinRoom: watchRoom.joinRoom,
    leaveRoom: watchRoom.leaveRoom,
    getRoomList: watchRoom.getRoomList,
    sendChatMessage: watchRoom.sendChatMessage,
    updatePlayState: watchRoom.updatePlayState,
    seekPlayback: watchRoom.seekPlayback,
    play: watchRoom.play,
    pause: watchRoom.pause,
    changeVideo: watchRoom.changeVideo,
    changeLiveChannel: watchRoom.changeLiveChannel,
    clearRoomState: watchRoom.clearRoomState,
    manualReconnect,
  };

  return (
    <WatchRoomContext.Provider value={contextValue}>
      {children}
      {toast && <Toast {...toast} />}
    </WatchRoomContext.Provider>
  );
}
