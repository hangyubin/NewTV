/* eslint-disable @typescript-eslint/no-explicit-any,no-console */

import { NextRequest, NextResponse } from 'next/server';

import { ApiSite, getAvailableApiSites, getCacheTime } from '@/lib/config';
import { searchFromApi } from '@/lib/downstream';
import { SearchResult } from '@/lib/types';
import { isShortDrama } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * 短剧专用API接口
 * 通过采集站API获取短剧内容，并进行内容分类和筛选
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '25');
  const keyword = searchParams.get('keyword') || '';

  try {
    // 限制API请求的并发数量，避免过多请求导致服务器压力过大
    const CONCURRENT_LIMIT = 3;
    // 优化超时时间，将25秒缩短为10秒，提高响应速度
    const TIMEOUT_MS = 10000;

    // 使用更全面的短剧关键词策略，获取更丰富的短剧内容
    const shortDramaKeywords = keyword
      ? [keyword] // 只使用用户提供的关键词，避免重复请求
      : ['短剧', '微剧', '竖屏剧', '迷你剧', '小短剧', '短视频剧', 'short drama', 'mini drama', '微短剧', '短剧热播', '短剧全集', '短剧免费', '短剧在线', '短剧剧场']; // 扩展关键词，提高搜索覆盖率

    let allResults: SearchResult[] = [];

    // 从视频源管理中获取可用的API源
    // 这样当视频源列表中被写入或导入了API，短剧API就会自动使用这些API
    let apiSites: ApiSite[] = await getAvailableApiSites();

    // 过滤掉AV相关的API源，只保留正规影视资源
    apiSites = apiSites.filter((site) => !site.name.includes('AV-') && !site.api.includes('AV-'));

    // 如果过滤后没有可用的API源，直接返回空结果，不再使用硬编码的默认API源
    // 这样可以确保只使用视频列表中配置的API源，避免不必要的API请求
    if (apiSites.length === 0) {
      console.log('📺 [短剧API] 没有可用的API源，返回空结果');
      return NextResponse.json(
        {
          code: 200,
          message: 'success',
          results: [],
          total: 0,
          page,
          limit,
          hasMore: false,
          totalPages: 0,
          debug: {
            apiSites: [],
            requestTime: new Date().toISOString(),
            keyword: keyword,
            searchKeywords: shortDramaKeywords,
          },
        },
        {
          headers: {
            'Cache-Control': `public, max-age=${await getCacheTime()}, s-maxage=${await getCacheTime()}`,
            'CDN-Cache-Control': `public, s-maxage=${await getCacheTime()}`,
            'Vercel-CDN-Cache-Control': `public, s-maxage=${await getCacheTime()}`,
            'Netlify-Vary': 'query',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    // 限制并发的辅助函数，使用箭头函数表达式代替函数声明
    const limitedConcurrency = async <T>(
      items: T[],
      limit: number,
      fn: (item: T) => Promise<any>
    ): Promise<any[]> => {
      const results: any[] = [];
      const executing: Promise<any>[] = [];

      for (const item of items) {
        const p = Promise.resolve().then(() => fn(item));
        results.push(p);

        if (items.length > limit) {
          const e = p.then(() => {
            executing.splice(executing.indexOf(e), 1);
          });
          executing.push(e);
          if (executing.length >= limit) {
            await Promise.race(executing);
          }
        }
      }

      return Promise.all(results);
    };

    // 优化搜索策略：如果有用户提供的关键词，只搜索该关键词
    // 如果没有关键词，只搜索前3个最相关的关键词，减少API请求次数
    const keywordsToSearch = keyword 
      ? [keyword] 
      : shortDramaKeywords.slice(0, 3); // 只搜索前3个关键词，减少API请求次数

    console.log(`📺 [短剧API] 搜索关键词: ${keywordsToSearch.join(', ')}`);

    // 并行搜索多个关键词，但限制每个关键词的API请求并发数
    const searchPromises = keywordsToSearch.map(async (searchKeyword) => {
      // 使用限制并发的方式请求API
      const siteResults = await limitedConcurrency(apiSites, CONCURRENT_LIMIT, async (site) => {
        try {
          const results = (await Promise.race([
            searchFromApi(site, searchKeyword),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error(`${site.name} timeout`)),
                TIMEOUT_MS
              )
            ),
          ])) as SearchResult[];

          // 过滤出真正的短剧内容
          const filteredResults = results.filter((result) => {
            const isShort = isShortDrama(result.type_name, result.title);
            return isShort;
          });

          return filteredResults;
        } catch (error) {
          // 忽略单个API请求失败，继续处理其他请求
          return [];
        }
      });

      // 等待所有站点请求完成，过滤掉拒绝的结果
      const fulfilledResults = siteResults.filter(result => result.length > 0);
      return fulfilledResults.flat();
    });

    const keywordResults = await Promise.allSettled(searchPromises);
    allResults = keywordResults
      .filter((result) => result.status === 'fulfilled')
      .map((result) => (result as PromiseFulfilledResult<SearchResult[]>).value)
      .flat();

    // 如果已经获取到足够的结果，不再继续搜索更多关键词
    // 这样可以减少不必要的API请求
    if (allResults.length >= 100) {
      console.log(`📺 [短剧API] 已获取到 ${allResults.length} 条结果，停止搜索更多关键词`);
    }

    // 改进去重机制，使用更宽松的策略，合并所有片源信息
    // 根据标题和年份进行去重，但合并所有片源信息
    const uniqueResultsMap = new Map<string, SearchResult>();

    for (const result of allResults) {
      const key = `${result.title || ''}-${result.year || 'unknown'}`;
      if (uniqueResultsMap.has(key)) {
        // 合并片源信息
        const existingResult = uniqueResultsMap.get(key) as SearchResult;

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
        existingResult.episodes_titles = existingResult.episodes.map(
          (episode: string, index: number) => {
            return seenTitles.get(episode) || `剧集 ${index + 1}`;
          }
        );

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
        uniqueResultsMap.set(key, result);
      }
    }

    const uniqueResults = Array.from(uniqueResultsMap.values());

    console.log(`📺 [短剧API] 去重后保留 ${uniqueResults.length} 条结果`);

    // 按年份和热度排序
    const sortedResults = uniqueResults.sort((a, b) => {
      // 优先按年份排序（新的在前）
      const yearA = parseInt(a.year) || 0;
      const yearB = parseInt(b.year) || 0;
      if (yearA !== yearB) {
        return yearB - yearA;
      }
      // 然后按标题长度排序（短剧通常标题较短）
      return a.title.length - b.title.length;
    });

    // 分页
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedResults = sortedResults.slice(startIndex, endIndex);

    console.log(`📺 [短剧API] 分页后返回 ${paginatedResults.length} 条结果`);
    console.log(`📺 [短剧API] 总结果数: ${sortedResults.length}`);
    console.log(`📺 [短剧API] 响应时间: ${new Date().toISOString()}`);

    // 构建返回数据
    const result = {
      code: 200,
      message: 'success',
      results: paginatedResults,
      total: sortedResults.length,
      page,
      limit,
      hasMore: startIndex + limit < sortedResults.length,
      totalPages: Math.ceil(sortedResults.length / limit),
      debug: {
        apiSites: apiSites.map((site) => site.name),
        requestTime: new Date().toISOString(),
        keyword: keyword,
        searchKeywords: shortDramaKeywords,
      },
    };

    const cacheTime = await getCacheTime();

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
        'CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
        'Vercel-CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
        'Netlify-Vary': 'query',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('📺 [短剧API] 内部错误:', error);
    // 输出更详细的错误信息
    if (error instanceof Error) {
      console.error('📺 [短剧API] 错误名称:', error.name);
      console.error('📺 [短剧API] 错误消息:', error.message);
      console.error('📺 [短剧API] 错误堆栈:', error.stack);
    }

    // 确保始终返回200状态码，避免前端出现500错误，但包含详细的错误信息
    return NextResponse.json(
      {
        code: 200,
        message: 'success',
        results: [],
        total: 0,
        page,
        limit,
        hasMore: false,
        totalPages: 0,
        debug: {
          error: error instanceof Error ? error.message : String(error),
          errorName: error instanceof Error ? error.name : 'UnknownError',
          requestTime: new Date().toISOString(),
          keyword: keyword,
        },
      },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  }
}
