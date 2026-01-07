/* eslint-disable @typescript-eslint/no-explicit-any,no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getAvailableApiSites, getCacheTime, getConfig } from '@/lib/config';
import { searchFromApi } from '@/lib/downstream';
import { yellowWords } from '@/lib/yellow';

export const runtime = 'nodejs';

// 搜索结果缓存
const searchCache = new Map<string, {
  results: any[];
  timestamp: number;
  totalSources: number;
}>();

// 缓存有效期：10分钟
const SEARCH_CACHE_TTL = 10 * 60 * 1000;

// 并发控制：最多同时处理3个API请求
const CONCURRENCY_LIMIT = 3;

/**
 * 带并发控制的Promise.all实现
 */
async function promiseAllWithConcurrency<T>(
  promises: Array<() => Promise<T>>,
  concurrency: number
): Promise<T[]> {
  const results: T[] = [];
  let index = 0;
  
  async function executeNext() {
    if (index >= promises.length) {
      return;
    }
    
    const currentIndex = index;
    index++;
    
    const promise = promises[currentIndex];
    try {
      const result = await promise();
      results[currentIndex] = result;
    } catch (error) {
      results[currentIndex] = error as T;
    }
    
    await executeNext();
  }
  
  // 启动初始并发任务
  const initialPromises = Array.from({ length: Math.min(concurrency, promises.length) }, executeNext);
  await Promise.all(initialPromises);
  
  return results;
}

export async function GET(request: NextRequest) {
  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    const cacheTime = await getCacheTime();
    return NextResponse.json(
      { results: [] },
      {
        headers: {
          'Cache-Control': `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
          'CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
          'Vercel-CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
          'Netlify-Vary': 'query',
        },
      }
    );
  }

  // 检查缓存
  const cacheKey = `${authInfo.username}-${query.toLowerCase()}`;
  const cached = searchCache.get(cacheKey);
  const now = Date.now();
  
  if (cached && (now - cached.timestamp) < SEARCH_CACHE_TTL) {
    // 使用缓存结果
    const cacheTime = await getCacheTime();
    return NextResponse.json(
      { results: cached.results },
      {
        headers: {
          'Cache-Control': `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
          'CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
          'Vercel-CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
          'Netlify-Vary': 'query',
        },
      }
    );
  }

  const config = await getConfig();
  const apiSites = await getAvailableApiSites(authInfo.username);

  // 如果没有可用的API源，直接返回空结果
  if (apiSites.length === 0) {
    return NextResponse.json({ results: [] });
  }

  // 构建带并发控制的搜索任务
  const searchTasks = apiSites.map((site) => () => 
    Promise.race([
      searchFromApi(site, query),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`${site.name} timeout`)), 15000) // 缩短超时时间
      ),
    ]).catch((err) => {
      console.warn(`搜索失败 ${site.name}:`, err.message);
      return []; // 返回空数组而不是抛出错误
    })
  );

  try {
    // 使用带并发控制的Promise.all
    const results = await promiseAllWithConcurrency(searchTasks, CONCURRENCY_LIMIT);
    
    // 过滤成功的结果
    const successResults = results.filter((result) => 
      Array.isArray(result)
    ) as any[][];
    
    let flattenedResults = successResults.flat();
    
    // 黄色内容过滤
    if (!config.SiteConfig.DisableYellowFilter) {
      flattenedResults = flattenedResults.filter((result) => {
        const typeName = result.type_name || '';
        return !yellowWords.some((word: string) => typeName.includes(word));
      });
    }
    
    // 去重：根据标题和年份进行去重，但合并所有片源信息
    const uniqueResults = new Map<string, any>();
    for (const result of flattenedResults) {
      const key = `${result.title || ''}-${result.year || 'unknown'}`;
      if (uniqueResults.has(key)) {
        // 合并片源信息
        const existingResult = uniqueResults.get(key);
        
        // 合并episodes和episodes_titles，避免重复
        const seenEpisodes = new Set(existingResult.episodes || []);
        const seenTitles = new Map<string, string>();
        
        // 初始化现有剧集标题映射
        if (existingResult.episodes && existingResult.episodes_titles) {
          existingResult.episodes.forEach((episode: string, index: number) => {
            if (existingResult.episodes_titles[index]) {
              seenTitles.set(episode, existingResult.episodes_titles[index]);
            }
          });
        }
        
        // 添加新的episodes，避免重复
        (result.episodes || []).forEach((episode: string, index: number) => {
          if (!seenEpisodes.has(episode)) {
            seenEpisodes.add(episode);
            // 尝试添加对应的标题
            if (result.episodes_titles && result.episodes_titles[index]) {
              seenTitles.set(episode, result.episodes_titles[index]);
            }
          }
        });
        
        // 更新现有结果的片源信息
        existingResult.episodes = Array.from(seenEpisodes);
        
        // 生成新的episodes_titles数组
        existingResult.episodes_titles = existingResult.episodes.map((episode: string, index: number) => {
          return seenTitles.get(episode) || `剧集 ${index + 1}`;
        });
        
        // 更新源信息，记录所有提供片源的站点
        if (!existingResult.source_sites) {
          existingResult.source_sites = [result.source_name];
        } else if (!existingResult.source_sites.includes(result.source_name)) {
          existingResult.source_sites.push(result.source_name);
        }
        
        // 更新片源数量
        existingResult.source_count = existingResult.episodes.length;
      } else {
        // 首次添加，设置初始值
        result.source_count = (result.episodes || []).length;
        result.source_sites = [result.source_name];
        uniqueResults.set(key, result);
      }
    }
    
    const finalResults = Array.from(uniqueResults.values());
    const cacheTime = await getCacheTime();

    // 更新缓存
    searchCache.set(cacheKey, {
      results: finalResults,
      timestamp: now,
      totalSources: apiSites.length
    });
    
    // 限制缓存大小，最多保存30个搜索结果
    if (searchCache.size > 30) {
      const oldestKey = searchCache.keys().next().value;
      searchCache.delete(oldestKey);
    }

    return NextResponse.json(
      { results: finalResults },
      {
        headers: {
          'Cache-Control': `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
          'CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
          'Vercel-CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
          'Netlify-Vary': 'query',
        },
      }
    );
  } catch (error) {
    console.error('搜索失败:', error);
    return NextResponse.json({ error: '搜索失败' }, { status: 500 });
  }
}
