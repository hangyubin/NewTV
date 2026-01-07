/* eslint-disable @typescript-eslint/no-explicit-any,no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getCacheTime } from '@/lib/config';
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
    // 简化短剧相关的搜索关键词，只使用"短剧"这一个词
    const shortDramaKeywords = keyword ? [keyword, '短剧'] : ['短剧'];

    let allResults: SearchResult[] = [];
    
    // 集成新的短剧API数据源，使用HTTPS协议避免混合内容问题
    const defaultApiSites = [
      {
        key: 'iqiyizyapi',
        name: 'IQIYI ZY API',
        api: 'https://iqiyizyapi.com/api.php/provide/vod',
        detail: 'IQIYI ZY API',
        disabled: false
      },
      {
        key: 'caiji_dbzy5',
        name: 'Caiji DBZY5',
        api: 'https://caiji.dbzy5.com/api.php/provide/vod',
        detail: 'Caiji DBZY5 API',
        disabled: false
      },
      {
        key: 'caiji_dyttzyapi',
        name: 'Caiji DYTZY API',
        api: 'https://caiji.dyttzyapi.com/api.php/provide/vod',
        detail: 'Caiji DYTZY API',
        disabled: false
      },
      {
        key: 'dbzy_tv',
        name: 'DBZY TV',
        api: 'https://api.r2afosne.dpdns.org',
        detail: 'DBZY TV API',
        disabled: false
      }
    ];
    
    console.log('📺 [短剧API] 使用的API站点:', defaultApiSites.map(site => site.name));

    // 并行搜索多个关键词
    const searchPromises = shortDramaKeywords.map(async (searchKeyword) => {
      const sitePromises = defaultApiSites.map(async (site) => {
        try {
          console.log(`📺 [短剧API] 从 ${site.name} 搜索: ${searchKeyword}`);
          
          const results = await Promise.race([
            searchFromApi(site, searchKeyword),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error(`${site.name} timeout`)), 30000) // 增加超时时间到30秒
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

    // 改进去重机制，使用更高效的Set方式去重
    const seenTitles = new Set<string>();
    const uniqueResults: SearchResult[] = [];
    
    for (const result of allResults) {
      // 使用标题作为唯一标识进行去重
      if (!seenTitles.has(result.title)) {
        seenTitles.add(result.title);
        uniqueResults.push(result);
      }
    }
    
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
    // 确保始终返回200状态码，避免前端出现500错误
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