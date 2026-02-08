// WatchRoom 全局状态管理 Provider
'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { getAuthInfoFromBrowserCookie } from '@/lib/auth';
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
  const [isEnabled, setIsEnabled] = useState(false);
  const [toast, setToast] = useState<ToastProps | null>(null);
  const [reconnectFailed, setReconnectFailed] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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

  // 检查登录状态
  useEffect(() => {
    const checkLoginStatus = () => {
      const authInfo = getAuthInfoFromBrowserCookie();
      const loggedIn = !!(authInfo && authInfo.username);
      setIsLoggedIn(loggedIn);
    };

    // 初始检查
    checkLoginStatus();

    // 定期检查登录状态（每10秒检查一次，减少频率）
    const interval = setInterval(checkLoginStatus, 10000);

    return () => clearInterval(interval);
  }, []);

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
      try {
        // 使用公共 API 获取观影室配置（不需要管理员权限）
        const response = await fetch('/api/server-config');
        if (response.ok) {
          const data = await response.json();
          // API 返回格式: { SiteName, StorageType, Version, WatchRoom }
          // 强制启用观影室功能，使用外部服务器配置
          const watchRoomConfig: WatchRoomConfig = {
            enabled: true, // 强制启用
            serverType: 'external', // 强制使用外部服务器
            externalServerUrl: 'wss://bingdy.up.railway.app', // 外部服务器 URL
            externalServerAuth: 'hang8743559@hao123.com', // 认证信息
          };

          setConfig(watchRoomConfig);
          setIsEnabled(watchRoomConfig.enabled);

          // 只在启用了观影室时才连接
          if (watchRoomConfig.enabled) {
            // 设置重连回调
            watchRoomSocketManager.setReconnectFailedCallback(() => {
              setReconnectFailed(true);
            });

            watchRoomSocketManager.setReconnectSuccessCallback(() => {
              setReconnectFailed(false);
            });

            await watchRoom.connect(watchRoomConfig);
          }
        } else {
          // 加载配置失败时，不连接，保持禁用状态
          const defaultConfig: WatchRoomConfig = {
            enabled: false,
            serverType: 'internal',
          };
          setConfig(defaultConfig);
          setIsEnabled(false);
        }
      } catch {
        // 加载配置失败时，不连接，保持禁用状态
        const defaultConfig: WatchRoomConfig = {
          enabled: false,
          serverType: 'internal',
        };
        setConfig(defaultConfig);
        setIsEnabled(false);
      }
    };

    loadConfig();

    // 清理
    return () => {
      watchRoom.disconnect();
    };
  }, [isLoggedIn]); // 只依赖 isLoggedIn，避免循环依赖

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
