/* eslint-disable no-console, @typescript-eslint/no-explicit-any */

import { KvrocksStorage } from './kvrocks.db';
import { RedisStorage } from './redis.db';
import { UpstashRedisStorage } from './upstash.db';

// 缓存项接口
interface CacheItem {
  value: any;
  expiration: number; // 过期时间戳（毫秒）
  lastAccess: number; // 最后访问时间戳（毫秒）
}

// 缓存统计接口
interface CacheStats {
  hits: number;
  misses: number;
  memoryHits: number;
  memoryMisses: number;
  storageHits: number;
  storageMisses: number;
}

// 缓存接口
interface CacheStorage {
  connect(): Promise<void>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { EX?: number }): Promise<void>;
}

// 缓存管理器类
export class CacheManager {
  private storages: CacheStorage[] = [];
  private primaryStorage: CacheStorage | null = null;
  private memoryCache: Map<string, CacheItem> = new Map();
  private memoryCacheMaxSize = 1000; // 内存缓存最大容量
  private memoryCacheDefaultTtl = 60 * 60 * 1000; // 内存缓存默认TTL（毫秒）
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    memoryHits: 0,
    memoryMisses: 0,
    storageHits: 0,
    storageMisses: 0,
  };

  constructor() {
    this.initializeStorages();
    // 定期清理过期的内存缓存项
    this.startCleanupInterval();
  }

  private initializeStorages() {
    const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE;

    if (!storageType) {
      console.warn('NEXT_PUBLIC_STORAGE_TYPE 未配置，缓存功能将被禁用');
      return;
    }

    try {
      switch (storageType.toLowerCase()) {
        case 'redis':
          if (process.env.REDIS_URL) {
            const storage = new RedisStorage();
            this.storages.push(storage);
            this.primaryStorage = storage;
            console.log('使用 Redis 作为主缓存存储');
          } else {
            console.warn('REDIS_URL 未配置，无法使用 Redis 存储');
          }
          break;

        case 'kvrocks':
          if (process.env.KVROCKS_URL) {
            const storage = new KvrocksStorage();
            this.storages.push(storage);
            this.primaryStorage = storage;
            console.log('使用 KVRocks 作为主缓存存储');
          } else {
            console.warn('KVROCKS_URL 未配置，无法使用 KVRocks 存储');
          }
          break;

        case 'upstash':
          if (process.env.UPSTASH_URL && process.env.UPSTASH_TOKEN) {
            const storage = new UpstashRedisStorage();
            this.storages.push(storage);
            this.primaryStorage = storage;
            console.log('使用 Upstash 作为主缓存存储');
          } else {
            console.warn(
              'UPSTASH_URL 或 UPSTASH_TOKEN 未配置，无法使用 Upstash 存储'
            );
          }
          break;

        default:
          console.warn(
            `不支持的存储类型: ${storageType}，支持的类型: redis, kvrocks, upstash`
          );
      }
    } catch (error) {
      console.error(`初始化 ${storageType} 存储失败:`, error);
    }

    if (this.storages.length === 0) {
      console.warn('没有可用的缓存存储，缓存功能将被禁用');
    }
  }

  // 启动定期清理过期缓存项的定时器
  private startCleanupInterval() {
    // 每5分钟清理一次过期的内存缓存项
    setInterval(() => {
      this.cleanupExpiredItems();
    }, 5 * 60 * 1000);
  }

  // 清理过期的内存缓存项
  private cleanupExpiredItems() {
    const now = Date.now();
    let removedCount = 0;

    // 将 entries() 转换为数组以避免 downlevelIteration 错误
    for (const [key, item] of Array.from(this.memoryCache.entries())) {
      if (item.expiration < now) {
        this.memoryCache.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      console.log(`清理了 ${removedCount} 个过期的内存缓存项`);
    }

    // 如果内存缓存大小超过限制，删除最近最少访问的项
    this.evictOldestItems();
  }

  // 移除最近最少访问的缓存项，直到内存缓存大小在限制内
  private evictOldestItems() {
    if (this.memoryCache.size <= this.memoryCacheMaxSize) {
      return;
    }

    // 按最后访问时间排序，删除最旧的项
    const sortedKeys = Array.from(this.memoryCache.entries())
      .sort((a, b) => a[1].lastAccess - b[1].lastAccess)
      .map(([key]) => key);

    const itemsToRemove = this.memoryCache.size - this.memoryCacheMaxSize;
    for (let i = 0; i < itemsToRemove; i++) {
      this.memoryCache.delete(sortedKeys[i]);
    }

    console.log(`移除了 ${itemsToRemove} 个最近最少访问的内存缓存项`);
  }

  // 检查内存缓存项是否过期
  private isExpired(item: CacheItem): boolean {
    return item.expiration < Date.now();
  }

  async connect(): Promise<void> {
    if (this.primaryStorage) {
      try {
        await this.primaryStorage.connect();
      } catch (error) {
        console.error('连接主缓存存储失败:', error);
      }
    }
  }

  async get(key: string): Promise<any> {
    const now = Date.now();

    // 1. 首先检查内存缓存
    const memoryItem = this.memoryCache.get(key);
    if (memoryItem) {
      if (!this.isExpired(memoryItem)) {
        // 更新最后访问时间
        memoryItem.lastAccess = now;
        this.memoryCache.set(key, memoryItem);
        // 更新统计信息
        this.stats.hits++;
        this.stats.memoryHits++;
        return memoryItem.value;
      } else {
        // 内存缓存项已过期，删除它
        this.memoryCache.delete(key);
        this.stats.memoryMisses++;
      }
    } else {
      this.stats.memoryMisses++;
    }

    // 2. 如果内存缓存没有，检查主存储
    if (!this.primaryStorage) {
      this.stats.misses++;
      return null;
    }

    try {
      const value = await this.primaryStorage.get(key);
      if (value === null) {
        this.stats.misses++;
        this.stats.storageMisses++;
        return null;
      }

      // 更新统计信息
      this.stats.hits++;
      this.stats.storageHits++;

      // 尝试解析JSON，如果失败则返回原始字符串
      let parsedValue;
      try {
        parsedValue = JSON.parse(value);
      } catch {
        parsedValue = value;
      }

      // 将结果存入内存缓存，默认TTL为1小时
      this.memoryCache.set(key, {
        value: parsedValue,
        expiration: now + this.memoryCacheDefaultTtl,
        lastAccess: now,
      });

      // 确保内存缓存大小在限制内
      this.evictOldestItems();

      return parsedValue;
    } catch (error) {
      console.error('从缓存读取数据失败:', error);
      this.stats.misses++;
      this.stats.storageMisses++;
      return null;
    }
  }

  async set(
    key: string,
    value: any,
    expirationSeconds?: number
  ): Promise<void> {
    const now = Date.now();
    const expirationMs = expirationSeconds
      ? expirationSeconds * 1000
      : this.memoryCacheDefaultTtl;

    // 1. 更新内存缓存
    this.memoryCache.set(key, {
      value,
      expiration: now + expirationMs,
      lastAccess: now,
    });

    // 确保内存缓存大小在限制内
    this.evictOldestItems();

    // 2. 更新主存储
    if (!this.primaryStorage) {
      return;
    }

    try {
      const serializedValue =
        typeof value === 'string' ? value : JSON.stringify(value);
      const options = expirationSeconds ? { EX: expirationSeconds } : undefined;

      await this.primaryStorage.set(key, serializedValue, options);

      // 如果有多个存储，尝试同步到其他存储（可选）
      if (this.storages.length > 1) {
        const otherStorages = this.storages.filter(
          (s) => s !== this.primaryStorage
        );
        await Promise.allSettled(
          otherStorages.map((storage) =>
            storage
              .set(key, serializedValue, options)
              .catch((err) => console.warn('同步到备用缓存失败:', err))
          )
        );
      }
    } catch (error) {
      console.error('写入缓存失败:', error);
    }
  }

  // 清除指定缓存项
  async delete(key: string): Promise<void> {
    // 清除内存缓存
    this.memoryCache.delete(key);

    // 清除主存储中的缓存项
    if (this.primaryStorage) {
      try {
        // 如果存储支持删除操作，执行删除
        if ('delete' in this.primaryStorage) {
          await (this.primaryStorage as any).delete(key);
        }
      } catch (error) {
        console.error('删除缓存项失败:', error);
      }
    }
  }

  // 清除所有缓存项
  async clear(): Promise<void> {
    // 清除内存缓存
    this.memoryCache.clear();

    // 清除主存储中的所有缓存项
    if (this.primaryStorage) {
      try {
        // 如果存储支持清空操作，执行清空
        if ('clear' in this.primaryStorage) {
          await (this.primaryStorage as any).clear();
        }
      } catch (error) {
        console.error('清空缓存失败:', error);
      }
    }
  }

  // 获取缓存统计信息
  getStats(): CacheStats {
    return { ...this.stats };
  }

  // 重置缓存统计信息
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      memoryHits: 0,
      memoryMisses: 0,
      storageHits: 0,
      storageMisses: 0,
    };
  }

  isAvailable(): boolean {
    return this.primaryStorage !== null;
  }

  // 获取内存缓存大小
  getMemoryCacheSize(): number {
    return this.memoryCache.size;
  }
}

// 单例实例
let cacheManagerInstance: CacheManager | null = null;

export function getCacheManager(): CacheManager {
  if (!cacheManagerInstance) {
    cacheManagerInstance = new CacheManager();
  }
  return cacheManagerInstance;
}
