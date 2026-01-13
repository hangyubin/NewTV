/**
 * 短剧数据获取相关的客户端函数
 */

import { SearchResult } from './types';

export interface ShortDramaSearchParams {
  type?: string;
  region?: string;
  year?: string;
  page?: number;
  limit?: number;
}

export interface ShortDramaResponse {
  code: number;
  message: string;
  results: SearchResult[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
  debug?: Record<string, unknown>;
}

// 缓存配置优化
const CACHE_KEY_PREFIX = 'short-drama-cache-';
const CACHE_TTL = 30 * 60 * 1000; // 30分钟缓存时间，平衡数据新鲜度和缓存命中率
const CACHE_KEY_LIMIT = 50; // 限制缓存键数量，避免缓存过大

/**
 * 生成缓存键
 */
function generateCacheKey(params: ShortDramaSearchParams): string {
  const sortedParams = Object.keys(params)
    .sort()
    .filter(
      (key) =>
        params[key as keyof ShortDramaSearchParams] !== undefined &&
        params[key as keyof ShortDramaSearchParams] !== 'all'
    )
    .map((key) => `${key}=${params[key as keyof ShortDramaSearchParams]}`)
    .join('&');
  return `${CACHE_KEY_PREFIX}${btoa(sortedParams)}`;
}

/**
 * 从缓存获取数据
 */
function getFromCache(key: string): ShortDramaResponse | null {
  if (typeof localStorage === 'undefined') return null;

  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_TTL) {
      localStorage.removeItem(key);
      return null;
    }

    return data;
  } catch (error) {
    return null;
  }
}

/**
 * 保存数据到缓存，添加缓存键数量限制
 */
function saveToCache(key: string, data: ShortDramaResponse): void {
  if (typeof localStorage === 'undefined') return;

  try {
    // 保存数据到缓存
    localStorage.setItem(
      key,
      JSON.stringify({
        data,
        timestamp: Date.now(),
      })
    );

    // 清理旧缓存，限制缓存键数量
    const cacheKeys = Object.keys(localStorage)
      .filter((k) => k.startsWith(CACHE_KEY_PREFIX))
      .sort((a, b) => {
        const timeA =
          JSON.parse(localStorage.getItem(a) || '{}').timestamp || 0;
        const timeB =
          JSON.parse(localStorage.getItem(b) || '{}').timestamp || 0;
        return timeA - timeB; // 按时间排序，旧的在前
      });

    // 如果缓存键数量超过限制，删除最旧的
    if (cacheKeys.length > CACHE_KEY_LIMIT) {
      const keysToRemove = cacheKeys.slice(
        0,
        cacheKeys.length - CACHE_KEY_LIMIT
      );
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    }
  } catch (error) {
    // 静默处理缓存错误
  }
}

/**
 * 获取短剧数据
 */
export async function getShortDramaData(
  params: ShortDramaSearchParams = {}
): Promise<ShortDramaResponse> {
  // 生成缓存键
  const cacheKey = generateCacheKey(params);

  // 尝试从缓存获取
  const cachedData = getFromCache(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  const searchParams = new URLSearchParams();

  if (params.type && params.type !== 'all') {
    searchParams.append('type', params.type);
  }
  if (params.region && params.region !== 'all') {
    searchParams.append('region', params.region);
  }
  if (params.year && params.year !== 'all') {
    searchParams.append('year', params.year);
  }
  if (params.page) {
    searchParams.append('page', params.page.toString());
  }
  if (params.limit) {
    searchParams.append('limit', params.limit.toString());
  }

  const url = `/api/short-drama${
    searchParams.toString() ? `?${searchParams.toString()}` : ''
  }`;

  const response = await fetch(url, {
    credentials: 'include',
    cache: 'no-store', // 禁用浏览器缓存，使用我们自己的缓存机制
  });

  if (!response.ok) {
    throw new Error(`获取短剧数据失败: ${response.status}`);
  }

  const data = await response.json();

  // 检查API返回的code字段
  if (data.code !== 200) {
    throw new Error(`获取短剧数据失败: ${data.message || '未知错误'}`);
  }

  // 保存到缓存
  saveToCache(cacheKey, data);

  return data;
}

/**
 * 短剧类型选项
 */
export const shortDramaTypeOptions = [
  { label: '全部', value: 'all' },
  { label: '爱情', value: 'romance' },
  { label: '家庭', value: 'family' },
  { label: '现代', value: 'modern' },
  { label: '都市', value: 'urban' },
  { label: '古装', value: 'costume' },
  { label: '穿越', value: 'time_travel' },
  { label: '商战', value: 'business' },
  { label: '悬疑', value: 'suspense' },
  { label: '喜剧', value: 'comedy' },
  { label: '青春', value: 'youth' },
];

/**
 * 短剧地区选项
 */
export const shortDramaRegionOptions = [
  { label: '全部', value: 'all' },
  { label: '华语', value: 'chinese' },
  { label: '中国大陆', value: 'mainland_china' },
  { label: '韩国', value: 'korean' },
  { label: '日本', value: 'japanese' },
  { label: '美国', value: 'usa' },
  { label: '英国', value: 'uk' },
  { label: '泰国', value: 'thailand' },
];
