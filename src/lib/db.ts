/* eslint-disable no-console, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import { AdminConfig } from './admin.types';
import { logger } from './logger';
import {
  DanmakuConfig,
  Favorite,
  IStorage,
  PlayRecord,
  SkipConfig,
  UserStats,
} from './types';

const STORAGE_TYPE = 
  (process.env.NEXT_PUBLIC_STORAGE_TYPE as 
    | 'localstorage' 
    | 'redis' 
    | 'upstash' 
    | 'kvrocks' 
    | undefined) || 'localstorage';

// 本地存储模拟实现
class LocalStorageMock implements IStorage {
  private adminConfig: AdminConfig | null = null;
  private users: Map<string, string> = new Map(); // username -> password
  private playRecords: Map<string, Map<string, PlayRecord>> = new Map(); // username -> Map<key, record>
  private favorites: Map<string, Map<string, Favorite>> = new Map(); // username -> Map<key, favorite>
  private searchHistory: Map<string, string[]> = new Map(); // username -> keywords[]

  // 管理员配置方法
  async getAdminConfig(): Promise<AdminConfig | null> {
    if (!this.adminConfig) {
      // 加载默认API站点配置
      const defaultApiSites = {
        tyyszy: {
          name: 'TYYSZY API',
          api: 'https://tyyszy.com/api.php/provide/vod',
          detail: 'TYYSZY API',
        },
        iqiyizyapi: {
          name: 'IQIYI ZY API',
          api: 'https://iqiyizyapi.com/api.php/provide/vod',
          detail: 'IQIYI ZY API',
        },
        caiji_dbzy5: {
          name: 'Caiji DBZY5',
          api: 'https://caiji.dbzy5.com/api.php/provide/vod',
          detail: 'Caiji DBZY5 API',
        },
      };

      // 返回完整默认配置
      this.adminConfig = {
        SourceConfig: Object.entries(defaultApiSites).map(([key, site]) => ({
          key,
          name: site.name,
          api: site.api,
          detail: site.detail,
          from: 'config',
          disabled: false,
        })),
        UserConfig: {
          Users: [],
          Tags: [],
        },
        ConfigSubscribtion: {
          URL: '',
          AutoUpdate: false,
          LastCheck: '',
        },
        ConfigFile: '',
        SiteConfig: {
          SiteName: 'NewTV',
          Announcement: '二次开发的跨平台影视聚合播放站',
          SearchDownstreamMaxPage: 2,
          SiteInterfaceCacheTime: 3600,
          DoubanProxyType: 'custom',
          DoubanProxy: '',
          DoubanImageProxyType: 'custom',
          DoubanImageProxy: '',
          DisableYellowFilter: false,
          FluidSearch: true,
        },
        CustomCategories: [],
      };
      logger.info(
        '本地存储：创建默认管理员配置，SourceConfig数量:',
        this.adminConfig.SourceConfig.length
      );
    }
    return this.adminConfig;
  }

  async setAdminConfig(config: AdminConfig): Promise<void> {
    // 确保配置有效
    if (!config) {
      throw new Error('配置不能为空');
    }

    // 确保必要字段存在
    if (!config.SourceConfig) {
      config.SourceConfig = [];
    }
    if (!config.UserConfig) {
      config.UserConfig = { Users: [], Tags: [] };
    }
    if (!config.ConfigSubscribtion) {
      config.ConfigSubscribtion = {
        URL: '',
        AutoUpdate: false,
        LastCheck: '',
      };
    }
    if (!config.ConfigFile) {
      config.ConfigFile = '';
    }
    if (!config.SiteConfig) {
      config.SiteConfig = {
        SiteName: 'NewTV',
        Announcement: '二次开发的跨平台影视聚合播放站',
        SearchDownstreamMaxPage: 2,
        SiteInterfaceCacheTime: 3600,
        DoubanProxyType: 'custom',
        DoubanProxy: '',
        DoubanImageProxyType: 'custom',
        DoubanImageProxy: '',
        DisableYellowFilter: false,
        FluidSearch: true,
      };
    }
    if (!config.CustomCategories) {
      config.CustomCategories = [];
    }

    this.adminConfig = config;
    logger.info(
      '本地存储：管理员配置已保存，SourceConfig数量:',
      config.SourceConfig.length
    );
  }

  // 用户相关方法
  async registerUser(userName: string, password: string): Promise<void> {
    if (this.users.has(userName)) {
      throw new Error('用户已存在');
    }
    this.users.set(userName, password);
  }

  async verifyUser(userName: string, password: string): Promise<boolean> {
    const storedPassword = this.users.get(userName);
    return storedPassword === password;
  }

  async checkUserExist(userName: string): Promise<boolean> {
    return this.users.has(userName);
  }

  async changePassword(userName: string, newPassword: string): Promise<void> {
    if (!this.users.has(userName)) {
      throw new Error('用户不存在');
    }
    this.users.set(userName, newPassword);
  }

  async deleteUser(userName: string): Promise<void> {
    this.users.delete(userName);
    this.playRecords.delete(userName);
    this.favorites.delete(userName);
    this.searchHistory.delete(userName);
  }

  async getAllUsers(): Promise<string[]> {
    return Array.from(this.users.keys());
  }

  // 播放记录方法
  async getPlayRecord(
    userName: string,
    key: string
  ): Promise<PlayRecord | null> {
    const userRecords = this.playRecords.get(userName);
    return userRecords?.get(key) || null;
  }

  async setPlayRecord(
    userName: string,
    key: string,
    record: PlayRecord
  ): Promise<void> {
    if (!this.playRecords.has(userName)) {
      this.playRecords.set(userName, new Map());
    }
    this.playRecords.get(userName)!.set(key, record);
  }

  async getAllPlayRecords(
    userName: string
  ): Promise<{ [key: string]: PlayRecord }> {
    const userRecords = this.playRecords.get(userName);
    if (!userRecords) return {};

    const result: { [key: string]: PlayRecord } = {};
    userRecords.forEach((record, key) => {
      result[key] = record;
    });
    return result;
  }

  async deletePlayRecord(userName: string, key: string): Promise<void> {
    const userRecords = this.playRecords.get(userName);
    if (userRecords) {
      userRecords.delete(key);
    }
  }

  // 收藏方法
  async getFavorite(userName: string, key: string): Promise<Favorite | null> {
    const userFavorites = this.favorites.get(userName);
    return userFavorites?.get(key) || null;
  }

  async setFavorite(
    userName: string,
    key: string,
    favorite: Favorite
  ): Promise<void> {
    if (!this.favorites.has(userName)) {
      this.favorites.set(userName, new Map());
    }
    this.favorites.get(userName)!.set(key, favorite);
  }

  async getAllFavorites(
    userName: string
  ): Promise<{ [key: string]: Favorite }> {
    const userFavorites = this.favorites.get(userName);
    if (!userFavorites) return {};

    const result: { [key: string]: Favorite } = {};
    userFavorites.forEach((favorite, key) => {
      result[key] = favorite;
    });
    return result;
  }

  async deleteFavorite(userName: string, key: string): Promise<void> {
    const userFavorites = this.favorites.get(userName);
    if (userFavorites) {
      userFavorites.delete(key);
    }
  }

  // 搜索历史方法
  async getSearchHistory(userName: string): Promise<string[]> {
    return this.searchHistory.get(userName) || [];
  }

  async addSearchHistory(userName: string, keyword: string): Promise<void> {
    if (!this.searchHistory.has(userName)) {
      this.searchHistory.set(userName, []);
    }
    const history = this.searchHistory.get(userName)!;

    // 去重并限制数量
    const index = history.indexOf(keyword);
    if (index !== -1) {
      history.splice(index, 1);
    }
    history.unshift(keyword);

    // 限制最多50条
    if (history.length > 50) {
      history.pop();
    }
  }

  async deleteSearchHistory(userName: string, keyword?: string): Promise<void> {
    if (!keyword) {
      // 删除所有搜索历史
      this.searchHistory.delete(userName);
    } else {
      const history = this.searchHistory.get(userName);
      if (history) {
        const index = history.indexOf(keyword);
        if (index !== -1) {
          history.splice(index, 1);
        }
      }
    }
  }

  // 其他方法 - 返回空实现
  async getDanmakuConfig(_userName: string): Promise<DanmakuConfig | null> {
    return null;
  }

  async setDanmakuConfig(
    _userName: string,
    _config: DanmakuConfig
  ): Promise<void> {
    // 空实现
  }

  async deleteDanmakuConfig(_userName: string): Promise<void> {
    // 空实现
  }

  // 跳过配置方法
  async getSkipConfig(
    _userName: string,
    _source: string,
    _id: string
  ): Promise<SkipConfig | null> {
    return null;
  }

  async setSkipConfig(
    _userName: string,
    _source: string,
    _id: string,
    _config: SkipConfig
  ): Promise<void> {
    // 空实现
  }

  async deleteSkipConfig(
    _userName: string,
    _source: string,
    _id: string
  ): Promise<void> {
    // 空实现
  }

  async getAllSkipConfigs(
    _userName: string
  ): Promise<{ [key: string]: SkipConfig }> {
    return {};
  }

  // 用户统计数据方法
  async getUserStats(_userName: string): Promise<UserStats | null> {
    return null;
  }

  async updateUserStats(_userName: string, _updateData: any): Promise<void> {
    // 空实现
  }

  async clearUserStats(_userName: string): Promise<void> {
    // 空实现
  }

  async clearAllData(): Promise<void> {
    this.adminConfig = null;
    this.users.clear();
    this.playRecords.clear();
    this.favorites.clear();
    this.searchHistory.clear();
    logger.info('本地存储：所有数据已清空');
  }
}

// 创建存储实例的异步函数
async function createStorage(): Promise<IStorage> {
  logger.info('创建存储实例，类型:', STORAGE_TYPE);

  // 检查是否在浏览器环境中
  const isBrowser = typeof window !== 'undefined';
  
  // 在浏览器环境中，始终使用本地存储，避免加载 Redis 相关模块
  if (isBrowser) {
    logger.info('浏览器环境：使用本地存储');
    return new LocalStorageMock();
  }

  // 服务器环境下，根据配置选择存储类型
  try {
    switch (STORAGE_TYPE) {
      case 'redis':
        try {
          const { RedisStorage } = await import('./redis.db');
          return new RedisStorage();
        } catch (error) {
          logger.error('动态导入 RedisStorage 失败:', error as Error);
          logger.info('回退到本地存储');
          return new LocalStorageMock();
        }
      case 'upstash':
        try {
          const { UpstashRedisStorage } = await import('./upstash.db');
          return new UpstashRedisStorage();
        } catch (error) {
          logger.error('动态导入 UpstashRedisStorage 失败:', error as Error);
          logger.info('回退到本地存储');
          return new LocalStorageMock();
        }
      case 'kvrocks':
        try {
          const { KvrocksStorage } = await import('./kvrocks.db');
          return new KvrocksStorage();
        } catch (error) {
          logger.error('动态导入 KvrocksStorage 失败:', error as Error);
          logger.info('回退到本地存储');
          return new LocalStorageMock();
        }
      case 'localstorage':
      default:
        logger.info('使用本地存储模拟实现');
        return new LocalStorageMock();
    }
  } catch (error) {
    logger.error('创建存储实例失败:', error as Error);
    logger.info('回退到本地存储');
    return new LocalStorageMock();
  }
}

export function generateStorageKey(source: string, id: string): string {
  return `${source}+${id}`;
}

export class DbManager {
  private storage: IStorage | null = null;
  private storageInitPromise: Promise<void>;

  constructor() {
    logger.info('DbManager 初始化，存储类型:', STORAGE_TYPE);
    this.storageInitPromise = this.initStorage();
  }

  // 异步初始化存储
  private async initStorage(): Promise<void> {
    try {
      this.storage = await createStorage();
      logger.info('DbManager 存储初始化完成，类型:', this.storage.constructor.name);
    } catch (error) {
      logger.error('DbManager 存储初始化失败:', error as Error);
      // 初始化失败时使用本地存储作为回退
      this.storage = new LocalStorageMock();
      logger.info('DbManager 使用本地存储作为回退');
    }
  }

  // 确保存储已初始化
  private async ensureStorage(): Promise<IStorage> {
    if (!this.storage) {
      await this.storageInitPromise;
    }
    return this.storage!;
  }

  // 管理员配置方法
  async getAdminConfig(): Promise<AdminConfig | null> {
    try {
      const storage = await this.ensureStorage();
      const config = await storage.getAdminConfig();
      logger.info(
        '获取管理员配置成功，SourceConfig数量:',
        config?.SourceConfig?.length || 0
      );
      return config;
    } catch (error) {
      logger.error('获取管理员配置失败:', error as Error);
      return null;
    }
  }

  async saveAdminConfig(config: AdminConfig): Promise<void> {
    logger.info('保存管理员配置开始...');

    try {
      const storage = await this.ensureStorage();

      // 验证配置
      if (!config) {
        const errorMsg = '配置不能为空';
        logger.error(errorMsg, new Error(errorMsg));
        throw new Error(errorMsg);
      }

      // 确保必要字段存在
      if (!config.SourceConfig) {
        config.SourceConfig = [];
        logger.info('SourceConfig 不存在，初始化为空数组');
      }

      if (!config.UserConfig) {
        config.UserConfig = { Users: [], Tags: [] };
        logger.info('UserConfig 不存在，初始化为空对象');
      }

      // 确保其他字段也存在
      if (!config.ConfigSubscribtion) {
        config.ConfigSubscribtion = {
          URL: '',
          AutoUpdate: false,
          LastCheck: '',
        };
      }
      if (!config.ConfigFile) {
        config.ConfigFile = '';
      }
      if (!config.SiteConfig) {
        config.SiteConfig = {
          SiteName: 'NewTV',
          Announcement: '二次开发的跨平台影视聚合播放站',
          SearchDownstreamMaxPage: 2,
          SiteInterfaceCacheTime: 3600,
          DoubanProxyType: 'custom',
          DoubanProxy: '',
          DoubanImageProxyType: 'custom',
          DoubanImageProxy: '',
          DisableYellowFilter: false,
          FluidSearch: true,
        };
      }
      if (!config.CustomCategories) {
        config.CustomCategories = [];
      }

      logger.info('准备保存配置:');
      logger.info('- SourceConfig 数量:', config.SourceConfig.length);
      logger.info(
        '- 第一个源:',
        config.SourceConfig[0]
          ? {
              key: config.SourceConfig[0].key,
              name: config.SourceConfig[0].name,
              from: config.SourceConfig[0].from,
            }
          : '空'
      );

      try {
        // 检查方法是否存在
        if (typeof storage.setAdminConfig !== 'function') {
          const errorMsg = '当前存储类型不支持管理员配置保存';
          logger.error(errorMsg, new Error(errorMsg));
          throw new Error(errorMsg);
        }

        // 执行保存
        await storage.setAdminConfig(config);
        logger.info('✅ 管理员配置保存成功');
      } catch (error) {
        logger.error('❌ 保存管理员配置失败:', error as Error);

        const errorMessage = error instanceof Error ? error.message : '未知错误';

        throw new Error(`保存配置失败: ${errorMessage}`);
      }
    } catch (error) {
      logger.error('保存管理员配置过程中发生错误:', error as Error);
      throw error;
    }
  }

  // 播放记录方法
  async getPlayRecord(
    userName: string,
    source: string,
    id: string
  ): Promise<PlayRecord | null> {
    const storage = await this.ensureStorage();
    const key = generateStorageKey(source, id);
    return storage.getPlayRecord(userName, key);
  }

  async savePlayRecord(
    userName: string,
    source: string,
    id: string,
    record: PlayRecord
  ): Promise<void> {
    const storage = await this.ensureStorage();
    const key = generateStorageKey(source, id);
    await storage.setPlayRecord(userName, key, record);
  }

  async getAllPlayRecords(userName: string): Promise<{
    [key: string]: PlayRecord;
  }> {
    const storage = await this.ensureStorage();
    return storage.getAllPlayRecords(userName);
  }

  async deletePlayRecord(
    userName: string,
    source: string,
    id: string
  ): Promise<void> {
    const storage = await this.ensureStorage();
    const key = generateStorageKey(source, id);
    await storage.deletePlayRecord(userName, key);
  }

  // 收藏方法
  async getFavorite(
    userName: string,
    source: string,
    id: string
  ): Promise<Favorite | null> {
    const storage = await this.ensureStorage();
    const key = generateStorageKey(source, id);
    return storage.getFavorite(userName, key);
  }

  async saveFavorite(
    userName: string,
    source: string,
    id: string,
    favorite: Favorite
  ): Promise<void> {
    const storage = await this.ensureStorage();
    const key = generateStorageKey(source, id);
    await storage.setFavorite(userName, key, favorite);
  }

  async getAllFavorites(
    userName: string
  ): Promise<{ [key: string]: Favorite }> {
    const storage = await this.ensureStorage();
    return storage.getAllFavorites(userName);
  }

  async deleteFavorite(
    userName: string,
    source: string,
    id: string
  ): Promise<void> {
    const storage = await this.ensureStorage();
    const key = generateStorageKey(source, id);
    await storage.deleteFavorite(userName, key);
  }

  async isFavorited(
    userName: string,
    source: string,
    id: string
  ): Promise<boolean> {
    const favorite = await this.getFavorite(userName, source, id);
    return favorite !== null;
  }

  // 用户相关方法
  async registerUser(userName: string, password: string): Promise<void> {
    const storage = await this.ensureStorage();
    await storage.registerUser(userName, password);
  }

  async verifyUser(userName: string, password: string): Promise<boolean> {
    const storage = await this.ensureStorage();
    return storage.verifyUser(userName, password);
  }

  async checkUserExist(userName: string): Promise<boolean> {
    const storage = await this.ensureStorage();
    return storage.checkUserExist(userName);
  }

  async changePassword(userName: string, newPassword: string): Promise<void> {
    const storage = await this.ensureStorage();
    await storage.changePassword(userName, newPassword);
  }

  async deleteUser(userName: string): Promise<void> {
    const storage = await this.ensureStorage();
    await storage.deleteUser(userName);
  }

  // 搜索历史方法
  async getSearchHistory(userName: string): Promise<string[]> {
    const storage = await this.ensureStorage();
    return storage.getSearchHistory(userName);
  }

  async addSearchHistory(userName: string, keyword: string): Promise<void> {
    const storage = await this.ensureStorage();
    await storage.addSearchHistory(userName, keyword);
  }

  async deleteSearchHistory(userName: string, keyword?: string): Promise<void> {
    const storage = await this.ensureStorage();
    await storage.deleteSearchHistory(userName, keyword);
  }

  async getAllUsers(): Promise<string[]> {
    const storage = await this.ensureStorage();
    return storage.getAllUsers();
  }

  // 跳过片头片尾配置方法
  async getSkipConfig(
    userName: string,
    source: string,
    id: string
  ): Promise<SkipConfig | null> {
    const storage = await this.ensureStorage();
    return storage.getSkipConfig(userName, source, id);
  }

  async setSkipConfig(
    userName: string,
    source: string,
    id: string,
    config: SkipConfig
  ): Promise<void> {
    const storage = await this.ensureStorage();
    await storage.setSkipConfig(userName, source, id, config);
  }

  async deleteSkipConfig(
    userName: string,
    source: string,
    id: string
  ): Promise<void> {
    const storage = await this.ensureStorage();
    await storage.deleteSkipConfig(userName, source, id);
  }

  async getAllSkipConfigs(
    userName: string
  ): Promise<{ [key: string]: SkipConfig }> {
    const storage = await this.ensureStorage();
    return storage.getAllSkipConfigs(userName);
  }

  // 弹幕配置方法
  async getDanmakuConfig(userName: string): Promise<DanmakuConfig | null> {
    const storage = await this.ensureStorage();
    return storage.getDanmakuConfig(userName);
  }

  async saveDanmakuConfig(
    userName: string,
    config: DanmakuConfig
  ): Promise<void> {
    const storage = await this.ensureStorage();
    await storage.setDanmakuConfig(userName, config);
  }

  async deleteDanmakuConfig(userName: string): Promise<void> {
    const storage = await this.ensureStorage();
    await storage.deleteDanmakuConfig(userName);
  }

  // 用户统计数据方法
  async getUserStats(userName: string): Promise<UserStats | null> {
    const storage = await this.ensureStorage();
    return storage.getUserStats(userName);
  }

  async updateUserStats(
    userName: string,
    updateData: {
      watchTime: number;
      movieKey: string;
      timestamp: number;
      isFullReset?: boolean;
    }
  ): Promise<void> {
    const storage = await this.ensureStorage();
    await storage.updateUserStats(userName, updateData);
  }

  async clearUserStats(userName: string): Promise<void> {
    const storage = await this.ensureStorage();
    await storage.clearUserStats(userName);
  }

  // 数据清理方法
  async clearAllData(): Promise<void> {
    const storage = await this.ensureStorage();
    await storage.clearAllData();
  }
}

// 导出默认实例
export const db = new DbManager();
