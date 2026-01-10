/* eslint-disable @typescript-eslint/no-explicit-any */

// 搜索结果缓存配置
const SEARCH_CACHE_EXPIRE = {
  results: 3 * 60 * 60 * 1000, // 搜索结果3小时，延长缓存时间减少API调用
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
    const value = localStorage.getItem(key);
    if (!value) return null;

    const cacheItem = JSON.parse(value);
    if (Date.now() > cacheItem.expiresAt) {
      localStorage.removeItem(key);
      return null;
    }

    return cacheItem.data;
  } catch (error) {
    // 忽略缓存读取错误
    return null;
  }
}

function setCache(key: string, data: any, ttl: number): void {
  if (typeof localStorage === 'undefined') return;

  try {
    const cacheItem = {
      data,
      expiresAt: Date.now() + ttl,
    };
    localStorage.setItem(key, JSON.stringify(cacheItem));
  } catch (error) {
    // 忽略缓存写入错误
  }
}

// 导出的缓存搜索函数
export async function cachedSearch(query: string): Promise<any> {
  if (!query.trim()) return { results: [] };

  // 尝试从缓存获取
  const cacheKey = getCacheKey('results', { q: query.trim() });
  const cached = getCache(cacheKey);
  if (cached) {
    return cached;
  }

  // 缓存未命中，发起请求
  try {
    const response = await fetch(
      `/api/search?q=${encodeURIComponent(query.trim())}`
    );
    const data = await response.json();

    // 保存到缓存
    setCache(cacheKey, data, SEARCH_CACHE_EXPIRE.results);

    return data;
  } catch (error) {
    // 忽略搜索请求错误
    return { results: [] };
  }
}
