/* eslint-disable @typescript-eslint/no-explicit-any */

// 搜索结果缓存配置
const SEARCH_CACHE_EXPIRE = {
  results: 1 * 60 * 60 * 1000, // 搜索结果1小时
};

// 缓存工具函数
function getCacheKey(prefix: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return `search-${prefix}-${sortedParams}`;
}

function getCache(key: string): any | null {
  if (typeof localStorage === 'undefined') return null;

  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const { data, expire } = JSON.parse(cached);
    if (Date.now() > expire) {
      localStorage.removeItem(key);
      return null;
    }

    return data;
  } catch (e) {
    localStorage.removeItem(key);
    return null;
  }
}

function setCache(key: string, data: any, expireTime: number): void {
  if (typeof localStorage === 'undefined') return;

  try {
    const cacheData = {
      data,
      expire: Date.now() + expireTime,
      created: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(cacheData));
  } catch (e) {

  }
}

// 清理过期缓存
function cleanExpiredCache(): void {
  if (typeof localStorage === 'undefined') return;

  const keys = Object.keys(localStorage).filter((key) =>
    key.startsWith('search-')
  );
  let cleanedCount = 0;

  keys.forEach((key) => {
    try {
      const cached = localStorage.getItem(key);
      if (cached) {
        const { expire } = JSON.parse(cached);
        if (Date.now() > expire) {
          localStorage.removeItem(key);
          cleanedCount++;
        }
      }
    } catch (e) {
      // 清理损坏的缓存数据
      localStorage.removeItem(key);
      cleanedCount++;
    }
  });

  if (cleanedCount > 0) {
    // 清理了过期缓存，不输出日志
  }
}

// 初始化缓存系统（应该在应用启动时调用）
export function initSearchCache(): void {
  if (typeof window === 'undefined') return;

  // 立即清理一次过期缓存
  cleanExpiredCache();

  // 每10分钟清理一次过期缓存
  setInterval(cleanExpiredCache, 10 * 60 * 1000);

  // 搜索缓存系统已初始化
}

// 带缓存的搜索API封装
export async function cachedSearch(query: string): Promise<{ results: any[] }> {
  // 检查缓存
  const cacheKey = getCacheKey('results', { q: query });
  const cached = getCache(cacheKey);
  if (cached) {
    // 搜索结果缓存命中
    return cached;
  }

  // 发起请求
  const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  const result = response.ok ? await response.json() : { results: [] };

  // 保存到缓存
  setCache(cacheKey, result, SEARCH_CACHE_EXPIRE.results);
  // 搜索结果已缓存

  return result;
}

// 清理所有搜索缓存
export function clearSearchCache(): void {
  if (typeof localStorage === 'undefined') return;

  const keys = Object.keys(localStorage).filter((key) =>
    key.startsWith('search-')
  );
  keys.forEach((key) => localStorage.removeItem(key));
  // 清理了搜索缓存项
}

// 获取缓存状态信息
export function getSearchCacheStats(): {
  totalItems: number;
  totalSize: number;
} {
  if (typeof localStorage === 'undefined') {
    return { totalItems: 0, totalSize: 0 };
  }

  const keys = Object.keys(localStorage).filter((key) =>
    key.startsWith('search-')
  );
  let totalSize = 0;

  keys.forEach((key) => {
    const data = localStorage.getItem(key);
    if (data) {
      totalSize += data.length;
    }
  });

  return {
    totalItems: keys.length,
    totalSize,
  };
}
