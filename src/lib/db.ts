/* eslint-disable no-console, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import { AdminConfig } from './admin.types';
import { KvrocksStorage } from './kvrocks.db';
import { RedisStorage } from './redis.db';
import { DanmakuConfig, Favorite, IStorage, PlayRecord, SkipConfig, UserStats } from './types';
import { UpstashRedisStorage } from './upstash.db';

// storage type 常量: 'localstorage' | 'redis' | 'upstash'，默认 'localstorage'
const STORAGE_TYPE =
  (process.env.NEXT_PUBLIC_STORAGE_TYPE as
    | 'localstorage'
    | 'redis'
    | 'upstash'
    | 'kvrocks'
    | undefined) || 'localstorage';

// 创建存储实例
function createStorage(): IStorage {
  switch (STORAGE_TYPE) {
    case 'redis':
      return new RedisStorage();
    case 'upstash':
      return new UpstashRedisStorage();
    case 'kvrocks':
      return new KvrocksStorage();
    case 'localstorage':
    default:
      return null as unknown as IStorage;
  }
}

// 单例存储实例
let storageInstance: IStorage | null = null;

function getStorage(): IStorage {
  if (!storageInstance) {
    storageInstance = createStorage();
  }
  return storageInstance;
}

// 工具函数：生成存储key
export function generateStorageKey(source: string, id: string): string {
  return `${source}+${id}`;
}

// 导出便捷方法
export class DbManager {
  private storage: IStorage;

  constructor() {
    console.log('DbManager 构造函数 - 存储类型:', STORAGE_TYPE);
    this.storage = getStorage();
    console.log('DbManager 构造函数 - 存储实例创建完成:', this.storage?.constructor?.name);
  }

  // 测试数据库连接
  async testConnection(): Promise<boolean> {
    try {
      console.log('测试数据库连接...');
      // 尝试调用一个简单的方法来测试连接
      if (this.storage && typeof this.storage.getAllUsers === 'function') {
        const testResult = await this.storage.getAllUsers();
        console.log('数据库连接测试成功，用户数量:', testResult.length);
        return true;
      }
      console.log('本地存储模式，跳过数据库连接测试');
      return true;
    } catch (error) {
      console.error('数据库连接测试失败:', error);
      return false;
    }
  }

  // 播放记录相关方法
  async getPlayRecord(
    userName: string,
    source: string,
    id: string
  ): Promise<PlayRecord | null> {
    if (!this.storage) return null;
    const key = generateStorageKey(source, id);
    return this.storage.getPlayRecord(userName, key);
  }

  async savePlayRecord(
    userName: string,
    source: string,
    id: string,
    record: PlayRecord
  ): Promise<void> {
    if (!this.storage) return;
    const key = generateStorageKey(source, id);
    await this.storage.setPlayRecord(userName, key, record);
  }

  async getAllPlayRecords(userName: string): Promise<{
    [key: string]: PlayRecord;
  }> {
    if (!this.storage) return {};
    return this.storage.getAllPlayRecords(userName);
  }

  async deletePlayRecord(
    userName: string,
    source: string,
    id: string
  ): Promise<void> {
    if (!this.storage) return;
    const key = generateStorageKey(source, id);
    await this.storage.deletePlayRecord(userName, key);
  }

  // 收藏相关方法
  async getFavorite(
    userName: string,
    source: string,
    id: string
  ): Promise<Favorite | null> {
    if (!this.storage) return null;
    const key = generateStorageKey(source, id);
    return this.storage.getFavorite(userName, key);
  }

  async saveFavorite(
    userName: string,
    source: string,
    id: string,
    favorite: Favorite
  ): Promise<void> {
    if (!this.storage) return;
    const key = generateStorageKey(source, id);
    await this.storage.setFavorite(userName, key, favorite);
  }

  async getAllFavorites(
    userName: string
  ): Promise<{ [key: string]: Favorite }> {
    if (!this.storage) return {};
    return this.storage.getAllFavorites(userName);
  }

  async deleteFavorite(
    userName: string,
    source: string,
    id: string
  ): Promise<void> {
    if (!this.storage) return;
    const key = generateStorageKey(source, id);
    await this.storage.deleteFavorite(userName, key);
  }

  async isFavorited(
    userName: string,
    source: string,
    id: string
  ): Promise<boolean> {
    const favorite = await this.getFavorite(userName, source, id);
    return favorite !== null;
  }

  // ---------- 用户相关 ----------
  async registerUser(userName: string, password: string): Promise<void> {
    if (!this.storage) throw new Error('Storage not available');
    await this.storage.registerUser(userName, password);
  }

  async verifyUser(userName: string, password: string): Promise<boolean> {
    if (!this.storage) throw new Error('Storage not available');
    return this.storage.verifyUser(userName, password);
  }

  // 检查用户是否已存在
  async checkUserExist(userName: string): Promise<boolean> {
    if (!this.storage) throw new Error('Storage not available');
    return this.storage.checkUserExist(userName);
  }

  async changePassword(userName: string, newPassword: string): Promise<void> {
    if (!this.storage) throw new Error('Storage not available');
    await this.storage.changePassword(userName, newPassword);
  }

  async deleteUser(userName: string): Promise<void> {
    if (!this.storage) throw new Error('Storage not available');
    await this.storage.deleteUser(userName);
  }

  // ---------- 搜索历史 ----------
  async getSearchHistory(userName: string): Promise<string[]> {
    if (!this.storage) return [];
    return this.storage.getSearchHistory(userName);
  }

  async addSearchHistory(userName: string, keyword: string): Promise<void> {
    if (!this.storage) return;
    await this.storage.addSearchHistory(userName, keyword);
  }

  async deleteSearchHistory(userName: string, keyword?: string): Promise<void> {
    if (!this.storage) return;
    await this.storage.deleteSearchHistory(userName, keyword);
  }

  // 获取全部用户名
  async getAllUsers(): Promise<string[]> {
    if (!this.storage || typeof (this.storage as any).getAllUsers !== 'function') {
      return [];
    }
    return (this.storage as any).getAllUsers();
  }

  // ---------- 管理员配置 ----------
  async getAdminConfig(): Promise<AdminConfig | null> {
    if (!this.storage || typeof (this.storage as any).getAdminConfig !== 'function') {
      return null;
    }
    return (this.storage as any).getAdminConfig();
  }

  async saveAdminConfig(config: AdminConfig): Promise<void> {
    if (!this.storage || typeof (this.storage as any).setAdminConfig !== 'function') {
      return;
    }
    await (this.storage as any).setAdminConfig(config);
  }

  // ---------- 跳过片头片尾配置 ----------
  async getSkipConfig(
    userName: string,
    source: string,
    id: string
  ): Promise<SkipConfig | null> {
    if (!this.storage || typeof (this.storage as any).getSkipConfig !== 'function') {
      return null;
    }
    return (this.storage as any).getSkipConfig(userName, source, id);
  }

  async setSkipConfig(
    userName: string,
    source: string,
    id: string,
    config: SkipConfig
  ): Promise<void> {
    if (!this.storage || typeof (this.storage as any).setSkipConfig !== 'function') {
      return;
    }
    await (this.storage as any).setSkipConfig(userName, source, id, config);
  }

  async deleteSkipConfig(
    userName: string,
    source: string,
    id: string
  ): Promise<void> {
    if (!this.storage || typeof (this.storage as any).deleteSkipConfig !== 'function') {
      return;
    }
    await (this.storage as any).deleteSkipConfig(userName, source, id);
  }

  async getAllSkipConfigs(
    userName: string
  ): Promise<{ [key: string]: SkipConfig }> {
    if (!this.storage || typeof (this.storage as any).getAllSkipConfigs !== 'function') {
      return {};
    }
    return (this.storage as any).getAllSkipConfigs(userName);
  }

  // ---------- 弹幕配置 ----------
  async getDanmakuConfig(
    userName: string
  ): Promise<DanmakuConfig | null> {
    if (!this.storage) {
      return null;
    }
    return this.storage.getDanmakuConfig(userName);
  }

  async saveDanmakuConfig(
    userName: string,
    config: DanmakuConfig
  ): Promise<void> {
    if (!this.storage) {
      return;
    }
    await this.storage.setDanmakuConfig(userName, config);
  }

  async deleteDanmakuConfig(userName: string): Promise<void> {
    if (!this.storage) {
      return;
    }
    await this.storage.deleteDanmakuConfig(userName);
  }

  // ---------- 用户统计数据 ----------
  async getUserStats(userName: string): Promise<UserStats | null> {
    if (this.storage && typeof (this.storage as any).getUserStats === 'function') {
      try {
        const stats = await (this.storage as any).getUserStats(userName);

        // 确保返回的统计数据不为null，为新用户提供默认值
        if (!stats) {
          const defaultStats: UserStats = {
            totalWatchTime: 0,
            totalMovies: 0,
            firstWatchDate: 0, // 初始化为0，将在第一次观看时设置为实际时间
            lastUpdateTime: Date.now()
          };

          console.log(`数据库层为新用户 ${userName} 提供默认统计数据:`, defaultStats);
          return defaultStats;
        }

        return stats;
      } catch (error) {
        console.error('获取用户统计数据失败:', error);
      }
    }

    // 如果存储层不支持getUserStats或调用失败，返回默认统计数据
    return {
      totalWatchTime: 0,
      totalMovies: 0,
      firstWatchDate: 0, // 初始化为0，将在第一次观看时设置为实际时间
      lastUpdateTime: Date.now()
    };
  }

  async updateUserStats(userName: string, updateData: {
    watchTime: number;
    movieKey: string;
    timestamp: number;
    isFullReset?: boolean;
  }): Promise<void> {
    if (this.storage && typeof (this.storage as any).updateUserStats === 'function') {
      await (this.storage as any).updateUserStats(userName, updateData);
    }
  }

  async clearUserStats(userName: string): Promise<void> {
    if (this.storage && typeof (this.storage as any).clearUserStats === 'function') {
      await (this.storage as any).clearUserStats(userName);
    }
  }

  // ---------- 数据清理 ----------
  async clearAllData(): Promise<void> {
    if (!this.storage || typeof (this.storage as any).clearAllData !== 'function') {
      throw new Error('存储类型不支持清空数据操作');
    }
    await (this.storage as any).clearAllData();
  }
}

// 导出默认实例
export const db = new DbManager();

// 导出getStorage函数
export { getStorage };
