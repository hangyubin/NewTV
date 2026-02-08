// 观影室服务器通信模块
import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents, Room, Member, PlayState, LiveState } from '@/types/watch-room';

class WatchRoomServer {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  private serverUrl = '';
  private authToken = '';

  // 初始化连接
  connect(serverUrl: string, authToken = ''): Socket<ServerToClientEvents, ClientToServerEvents> {
    this.serverUrl = serverUrl;
    this.authToken = authToken;

    // 创建 socket 连接
    this.socket = io(serverUrl, {
      auth: authToken ? { token: authToken } : undefined,
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    // 连接事件
    this.socket.on('connect', () => {
      console.log('[WatchRoom] Connected to server');
    });

    // 断开连接事件
    this.socket.on('disconnect', (reason) => {
      console.log('[WatchRoom] Disconnected from server:', reason);
    });

    // 错误事件
    this.socket.on('error', (error) => {
      console.error('[WatchRoom] Server error:', error);
    });

    return this.socket;
  }

  // 断开连接
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // 获取 socket 实例
  getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> | null {
    return this.socket;
  }

  // 检查连接状态
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // 创建房间
  createRoom(data: {
    name: string;
    description: string;
    password?: string;
    isPublic: boolean;
    userName: string;
  }): Promise<{ success: boolean; room?: Room; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve({ success: false, error: 'Not connected to server' });
        return;
      }

      this.socket.emit('room:create', data, (response) => {
        resolve(response);
      });
    });
  }

  // 加入房间
  joinRoom(data: {
    roomId: string;
    password?: string;
    userName: string;
    ownerToken?: string;
  }): Promise<{ success: boolean; room?: Room; members?: Member[]; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve({ success: false, error: 'Not connected to server' });
        return;
      }

      this.socket.emit('room:join', data, (response) => {
        resolve(response);
      });
    });
  }

  // 离开房间
  leaveRoom(): void {
    if (this.socket) {
      this.socket.emit('room:leave');
    }
  }

  // 获取房间列表
  getRoomList(): Promise<Room[]> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve([]);
        return;
      }

      this.socket.emit('room:list', (rooms) => {
        resolve(rooms);
      });
    });
  }

  // 更新播放状态
  updatePlayState(state: PlayState): void {
    if (this.socket) {
      this.socket.emit('play:update', state);
    }
  }

  // 播放控制
  play(): void {
    if (this.socket) {
      this.socket.emit('play:play');
    }
  }

  pause(): void {
    if (this.socket) {
      this.socket.emit('play:pause');
    }
  }

  seek(currentTime: number): void {
    if (this.socket) {
      this.socket.emit('play:seek', currentTime);
    }
  }

  // 切换视频
  changeVideo(state: PlayState): void {
    if (this.socket) {
      this.socket.emit('play:change', state);
    }
  }

  // 切换直播频道
  changeLive(state: LiveState): void {
    if (this.socket) {
      this.socket.emit('live:change', state);
    }
  }

  // 发送聊天消息
  sendChatMessage(content: string, type: 'text' | 'emoji' = 'text'): void {
    if (this.socket) {
      this.socket.emit('chat:message', { content, type });
    }
  }

  // 清除状态
  clearState(): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve({ success: false, error: 'Not connected to server' });
        return;
      }

      this.socket.emit('state:clear', (response) => {
        resolve(response);
      });
    });
  }

  // 发送心跳
  sendHeartbeat(): void {
    if (this.socket) {
      this.socket.emit('heartbeat');
    }
  }
}

// 导出单例实例
export const watchRoomServer = new WatchRoomServer();
