'use client';

export interface BangumiCalendarData {
  weekday: {
    en: string;
  };
  items: {
    id: number;
    name: string;
    name_cn: string;
    rating: {
      score: number;
    };
    air_date: string;
    images: {
      large: string;
      common: string;
      medium: string;
      small: string;
      grid: string;
    };
  }[];
}

// 缓存配置
const BANGUMI_CACHE_EXPIRE = 60 * 60 * 1000; // 1小时缓存

// 缓存工具函数
function getCacheKey(prefix: string, params: Record<string, any> = {}): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  return `bangumi-${prefix}${sortedParams ? `-${sortedParams}` : ''}`;
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
      created: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(cacheData));
  } catch (e) {
    console.warn('Failed to set bangumi cache:', e);
  }
}

// 带超时的 fetch 请求
async function fetchWithTimeout(url: string, timeout = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
      }
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// 重试机制
async function fetchWithRetry(url: string, retries = 3, delay = 1000): Promise<Response> {
  let lastError: Error | undefined;
  
  for (let i = 0; i < retries; i++) {
    try {
      return await fetchWithTimeout(url);
    } catch (error) {
      lastError = error as Error;
      if (i < retries - 1) {
        console.warn(`Bangumi API request failed, retrying (${i + 1}/${retries})...`);
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }
  
  if (lastError) {
    throw lastError;
  } else {
    throw new Error('Failed to fetch after multiple attempts');
  }
}

export async function GetBangumiCalendarData(): Promise<BangumiCalendarData[]> {
  // 检查缓存
  const cacheKey = getCacheKey('calendar');
  const cached = getCache(cacheKey);
  if (cached) {
    console.log('Bangumi calendar cache hit');
    return cached;
  }
  
  try {
    const response = await fetchWithRetry('https://api.bgm.tv/calendar');
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    const filteredData = data.map((item: BangumiCalendarData) => ({
      ...item,
      items: item.items.filter(bangumiItem => bangumiItem.images)
    }));
    
    // 保存到缓存
    setCache(cacheKey, filteredData, BANGUMI_CACHE_EXPIRE);
    console.log('Bangumi calendar cached');
    
    return filteredData;
  } catch (error) {
    console.error('Failed to get bangumi calendar data:', error);
    // 触发全局错误提示
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('globalError', {
          detail: { message: '获取动漫日历数据失败' },
        })
      );
    }
    // 返回空数据作为降级方案
    return [];
  }
}

// 获取单个 Bangumi 详情
export async function GetBangumiDetails(id: number): Promise<any> {
  // 检查缓存
  const cacheKey = getCacheKey('details', { id });
  const cached = getCache(cacheKey);
  if (cached) {
    console.log(`Bangumi details cache hit: ${id}`);
    return cached;
  }
  
  try {
    const response = await fetchWithRetry(`https://api.bgm.tv/subject/${id}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // 保存到缓存
    setCache(cacheKey, data, BANGUMI_CACHE_EXPIRE);
    console.log(`Bangumi details cached: ${id}`);
    
    return data;
  } catch (error) {
    console.error(`Failed to get bangumi details for ${id}:`, error);
    throw error;
  }
}
