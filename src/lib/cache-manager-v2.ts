/* eslint-disable @typescript-eslint/no-explicit-any */

export interface CacheData<T> {
  data: T;
  timestamp: number;
  version: string;
}

export interface CacheOptions {
  expireTime?: number;
  version?: string;
  prefix?: string;
}

const DEFAULT_CACHE_VERSION = '1.0.0';
const DEFAULT_EXPIRE_TIME = 60 * 60 * 1000; // 1小时

export class CacheManager {
  private prefix: string;
  private version: string;

  constructor(options: CacheOptions = {}) {
    this.prefix = options.prefix || 'cache_';
    this.version = options.version || DEFAULT_CACHE_VERSION;
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  private isCacheValid<T>(cache: CacheData<T>, expireTime: number): boolean {
    return (
      cache.version === this.version &&
      Date.now() - cache.timestamp < expireTime
    );
  }

  private createCacheData<T>(data: T): CacheData<T> {
    return {
      data,
      timestamp: Date.now(),
      version: this.version,
    };
  }

  get<T>(key: string, expireTime: number = DEFAULT_EXPIRE_TIME): T | null {
    if (typeof window === 'undefined') return null;

    try {
      const cacheKey = this.getKey(key);
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return null;

      const cache = JSON.parse(cached) as CacheData<T>;
      if (this.isCacheValid(cache, expireTime)) {
        return cache.data;
      }

      localStorage.removeItem(cacheKey);
      return null;
    } catch (error) {
      console.warn('读取缓存失败:', error);
      return null;
    }
  }

  set<T>(key: string, data: T, expireTime: number = DEFAULT_EXPIRE_TIME): boolean {
    if (typeof window === 'undefined') return false;

    try {
      const cacheKey = this.getKey(key);
      const cache = this.createCacheData(data);
      localStorage.setItem(cacheKey, JSON.stringify(cache));
      return true;
    } catch (error) {
      console.warn('写入缓存失败:', error);
      return false;
    }
  }

  remove(key: string): void {
    if (typeof window === 'undefined') return;

    try {
      const cacheKey = this.getKey(key);
      localStorage.removeItem(cacheKey);
    } catch (error) {
      console.warn('删除缓存失败:', error);
    }
  }

  clear(): void {
    if (typeof window === 'undefined') return;

    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('清空缓存失败:', error);
    }
  }

  cleanExpired(maxAge: number = 60 * 24 * 60 * 60 * 1000): number {
    if (typeof window === 'undefined') return 0;

    let cleanedCount = 0;
    try {
      const keys = Object.keys(localStorage);
      const now = Date.now();

      keys.forEach((key) => {
        if (key.startsWith(this.prefix)) {
          try {
            const cached = localStorage.getItem(key);
            if (cached) {
              const cache = JSON.parse(cached) as CacheData<any>;
              if (now - cache.timestamp > maxAge) {
                localStorage.removeItem(key);
                cleanedCount++;
              }
            }
          } catch {
            localStorage.removeItem(key);
            cleanedCount++;
          }
        }
      });
    } catch (error) {
      console.warn('清理过期缓存失败:', error);
    }

    return cleanedCount;
  }

  getStats(): {
    totalItems: number;
    totalSize: number;
    byPrefix: Record<string, number>;
  } {
    if (typeof window === 'undefined') {
      return { totalItems: 0, totalSize: 0, byPrefix: {} };
    }

    const keys = Object.keys(localStorage).filter((key) =>
      key.startsWith(this.prefix)
    );
    const byPrefix: Record<string, number> = {};
    let totalSize = 0;

    keys.forEach((key) => {
      const prefix = key.split('_')[0];
      byPrefix[prefix] = (byPrefix[prefix] || 0) + 1;

      const data = localStorage.getItem(key);
      if (data) {
        totalSize += data.length;
      }
    });

    return {
      totalItems: keys.length,
      totalSize,
      byPrefix,
    };
  }

  has(key: string): boolean {
    if (typeof window === 'undefined') return false;

    try {
      const cacheKey = this.getKey(key);
      return localStorage.getItem(cacheKey) !== null;
    } catch {
      return false;
    }
  }
}

export const createCacheManager = (options?: CacheOptions) =>
  new CacheManager(options);
