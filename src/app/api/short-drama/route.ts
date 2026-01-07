/* eslint-disable @typescript-eslint/no-explicit-any,no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getCacheTime, getAvailableApiSites, ApiSite } from '@/lib/config';
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
    // 使用更精准的短剧关键词策略，提高搜索效率
    const shortDramaKeywords = keyword 
      ? [keyword] // 只使用用户提供的关键词，避免重复请求
      : ['短剧', '微剧']; // 使用最核心的关键词，提高搜索效率

    let allResults: SearchResult[] = [];
    
    // 从视频源管理中获取可用的API源
    // 这样当视频源列表中被写入或导入了API，短剧API就会自动使用这些API
    let apiSites: ApiSite[] = await getAvailableApiSites();
    
    // 过滤掉AV相关的API源，只保留正规影视资源
    apiSites = apiSites.filter(site => !site.name.includes('AV-'));
    
    console.log('📺 [短剧API] 从视频列表获取API源，过滤后共', apiSites.length, '个可用源');
    console.log('📺 [短剧API] API源列表:', apiSites.map(site => site.name));
    
    // 如果过滤后没有可用的API源，使用默认的可靠数据源作为后备
    if (apiSites.length === 0) {
      console.warn('📺 [短剧API] 视频列表中没有可用的非AV API源，使用默认数据源');
      apiSites = [
        {
          key: 'caiji_dbzy5',
          name: 'Caiji DBZY5',
          api: 'https://caiji.dbzy5.com/api.php/provide/vod',
          detail: 'Caiji DBZY5 API',
          disabled: false
        },
        {
          key: 'iqiyizyapi',
          name: 'IQIYI ZY API',
          api: 'https://iqiyizyapi.com/api.php/provide/vod',
          detail: 'IQIYI ZY API',
          disabled: false
        },
        {
          key: 'tyyszy',
          name: 'TYYSZY API',
          api: 'https://tyyszy.com/api.php/provide/vod',
          detail: 'TYYSZY API',
          disabled: false
        }
      ];
    }
    
    console.log('📺 [短剧API] 使用专用的API站点:', apiSites.map(site => site.name));
    
    console.log('📺 [短剧API] 请求参数: keyword=${keyword}, page=${page}, limit=${limit}');

    // 并行搜索多个关键词
    const searchPromises = shortDramaKeywords.map(async (searchKeyword) => {
      const sitePromises = apiSites.map(async (site) => {
        try {
          console.log(`📺 [短剧API] 从 ${site.name} 搜索: ${searchKeyword}`);
          
          // 添加详细的API请求日志
          console.log(`📺 [短剧API] API URL: ${site.api}`);
          console.log(`📺 [短剧API] 请求时间: ${new Date().toISOString()}`);
          
          // 优化超时时间，平衡响应速度和数据完整性
          const timeoutMs = 25000; // 统一设置25秒超时，避免单个API影响整体性能
          
          const results = await Promise.race([
            searchFromApi(site, searchKeyword),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error(`${site.name} timeout`)), timeoutMs)
            ),
          ]) as SearchResult[];

          console.log(`📺 [短剧API] ${site.name} 返回 ${results.length} 条结果`);
          
          // 过滤出真正的短剧内容
          const filteredResults = results.filter((result) => {
            // 1. 检查是否为短剧
            const isShort = isShortDrama(result.type_name, result.title);
            if (!isShort) {
              return false;
            }

            return true;
          });
          
          console.log(`📺 [短剧API] 过滤后保留 ${filteredResults.length} 条短剧结果`);
          return filteredResults;
        } catch (error) {
          console.error(`📺 [短剧API] 搜索短剧失败 ${site.name} - ${searchKeyword}:`, error);
          // 输出更详细的错误信息，包括错误类型和堆栈
          if (error instanceof Error) {
            console.error(`📺 [短剧API] 错误详情 - 名称: ${error.name}, 消息: ${error.message}`);
            if (error.stack) {
              console.error(`📺 [短剧API] 错误堆栈: ${error.stack}`);
            }
          }
          return [];
        }
      });

      const siteResults = await Promise.allSettled(sitePromises);
      return siteResults
        .filter((result) => result.status === 'fulfilled')
        .map((result) => (result as PromiseFulfilledResult<SearchResult[]>).value)
        .flat();
    });

    const keywordResults = await Promise.allSettled(searchPromises);
    allResults = keywordResults
      .filter((result) => result.status === 'fulfilled')
      .map((result) => (result as PromiseFulfilledResult<SearchResult[]>).value)
      .flat();

    console.log(`📺 [短剧API] 所有站点返回 ${allResults.length} 条结果`);

    // 改进去重机制，使用更宽松的策略，合并所有片源信息
    // 根据标题和年份进行去重，但合并所有片源信息
    const uniqueResultsMap = new Map<string, SearchResult>();
    
    for (const result of allResults) {
      const key = `${result.title || ''}-${result.year || 'unknown'}`;
      if (uniqueResultsMap.has(key)) {
        // 合并片源信息
        const existingResult = uniqueResultsMap.get(key)!;
        
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
        apiSites: apiSites.map(site => site.name),
        requestTime: new Date().toISOString(),
        keyword: keyword,
        searchKeywords: shortDramaKeywords
      }
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
          keyword: keyword
        }
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