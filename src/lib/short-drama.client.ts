/**
 * 短剧数据获取相关的客户端函数
 */

export interface ShortDramaSearchParams {
  type?: string;
  region?: string;
  year?: string;
  page?: number;
  limit?: number;
}

export interface ShortDramaResponse {
  results: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ShortDramaItem {
  id: number;
  name: string;
  pic: string;
  remark: string;
  type: string;
  area: string;
  year: string;
  state: string;
  actor: string;
  director: string;
  des: string;
  total_episodes: number;
  source_name: string;
  search_title?: string;
}

/**
 * 获取短剧数据
 */
export async function getShortDramaData(
  params: ShortDramaSearchParams = {}
): Promise<ShortDramaResponse> {
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

  const url = `/api/short-drama${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  
  const response = await fetch(url, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`获取短剧数据失败: ${response.status}`);
  }

  return response.json();
}

/**
 * 获取推荐短剧列表
 */
export async function getRecommendedShortDramas(
  category?: number,
  size = 10
): Promise<ShortDramaItem[]> {
  try {
    // 使用现有的短剧 API 端点
    const params = new URLSearchParams();
    params.append('limit', size.toString());
    const apiUrl = `/api/short-drama?${params.toString()}`;

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    // 转换数据格式以匹配预期的 ShortDramaItem 结构
    return result.results.map((item: { id: string; title: string; pic?: string; cover?: string; remark?: string; type_name?: string; area?: string; year?: string; state?: string; actor?: string; director?: string; desc?: string; episodes?: number; source_name?: string }) => ({
      id: parseInt(item.id) || 0,
      name: item.title || '',
      pic: item.pic || item.cover || '',
      remark: item.remark || '',
      type: item.type_name || '',
      area: item.area || '',
      year: item.year || '',
      state: item.state || '',
      actor: item.actor || '',
      director: item.director || '',
      des: item.desc || '',
      total_episodes: item.episodes || 0,
      source_name: item.source_name || '短剧',
    }));
  } catch (error) {
    return [];
  }
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

/**
 * 清理过期缓存
 */
export function cleanExpiredCache(): void {
  if (typeof localStorage === 'undefined') return;
  
  const keys = Object.keys(localStorage).filter(key => 
    key.startsWith('shortdrama-')
  );
  let cleanedCount = 0;
  
  keys.forEach(key => {
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
}

/**
 * 清理所有缓存
 */
export function clearAllCache(): void {
  if (typeof localStorage === 'undefined') return;
  
  const keys = Object.keys(localStorage).filter(key => 
    key.startsWith('shortdrama-')
  );
  keys.forEach(key => localStorage.removeItem(key));
}