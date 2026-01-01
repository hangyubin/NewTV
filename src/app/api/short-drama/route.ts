/* eslint-disable @typescript-eslint/no-explicit-any,no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getAvailableApiSites, getCacheTime, getConfig } from '@/lib/config';
import { searchFromApi } from '@/lib/downstream';
import { SearchResult } from '@/lib/types';
import { isShortDrama } from '@/lib/utils';
import { yellowWords } from '@/lib/yellow';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * 短剧专用API接口
 * 通过采集站API获取短剧内容，并进行内容分类和筛选
 */
export async function GET(request: NextRequest) {
  // 短剧API暂时不需要认证，移除认证检查
  // const authInfo = getAuthInfoFromCookie(request);
  // if (!authInfo || !authInfo.username) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // }
  
  // 使用默认用户名获取API站点
  const authInfo = { username: 'default' };

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'all'; // 短剧类型筛选
  const region = searchParams.get('region') || 'all'; // 地区筛选
  const year = searchParams.get('year') || 'all'; // 年份筛选
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '25');

  const config = await getConfig();
  let apiSites = await getAvailableApiSites(authInfo.username);
  
  // 检查是否有可用的API站点
  const hasAvailableSites = apiSites && apiSites.length > 0;

  try {
    let allResults: SearchResult[] = [];
    
    // 只有在有可用API站点时才进行搜索
    if (hasAvailableSites) {
      // 增加更多短剧相关的搜索关键词，提高搜索结果数量
      const shortDramaKeywords = ['短剧', '微剧', '竖屏短剧', '网络短剧', '小剧场', '微电影'];

      // 并行搜索多个关键词
      const searchPromises = shortDramaKeywords.map(async (keyword) => {
        const sitePromises = apiSites.map(async (site) => {
          try {
            const results = await Promise.race([
              searchFromApi(site, keyword),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error(`${site.name} timeout`)), 15000)
              ),
            ]) as SearchResult[];

            // 过滤出真正的短剧内容，增加容错处理
            return results.filter((result) => {
              try {
                // 1. 检查是否为短剧
                if (!isShortDrama(result.type_name, result.title)) {
                  return false;
                }

                // 2. 过滤黄色内容
                if (!config.SiteConfig.DisableYellowFilter) {
                  const typeName = result.type_name || '';
                  if (yellowWords.some((word: string) => typeName.includes(word))) {
                    return false;
                  }
                }

                // 3. 类型筛选 - 增加容错处理，允许更多类型通过
                if (type !== 'all') {
                  const resultType = getShortDramaType(result.type_name, result.title);
                  if (resultType !== type && resultType !== 'all') {
                    return false;
                  }
                }

                // 4. 地区筛选 - 简化地区筛选逻辑，允许更多地区通过
                if (region !== 'all') {
                  const resultRegion = getContentRegion(result.title, result.desc);
                  // 允许"全部"、匹配的地区或华语内容通过
                  if (resultRegion !== region && resultRegion !== 'all' && !(region === 'chinese' && (resultRegion === 'mainland_china' || resultRegion === 'chinese'))) {
                    return false;
                  }
                }

                // 5. 年份筛选 - 增加容错处理，允许没有年份的内容通过
                if (year !== 'all' && result.year) {
                  if (!matchYear(result.year, year)) {
                    return false;
                  }
                }

                return true;
              } catch (error) {
                // 容错处理，允许解析错误的内容通过
                console.warn('短剧过滤出错，允许内容通过:', error);
                return true;
              }
            });
          } catch (error) {
            console.warn(`搜索短剧失败 ${site.name} - ${keyword}:`, error);
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
    } else {
      console.warn('没有可用的API站点，返回空结果');
      // 没有可用API站点，返回空结果
      allResults = [];
    }

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

    const cacheTime = await getCacheTime();

    return NextResponse.json(
      {
        results: paginatedResults,
        total: sortedResults.length,
        page,
        limit,
        totalPages: Math.ceil(sortedResults.length / limit),
      },
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
    console.error('获取短剧数据失败:', error);
    return NextResponse.json(
      { error: '获取短剧数据失败' },
      { status: 500 }
    );
  }
}

/**
 * 获取短剧的具体类型
 */
function getShortDramaType(typeName?: string, title?: string): string {
  if (!typeName && !title) return 'all';

  const content = `${typeName || ''} ${title || ''}`.toLowerCase();

  if (content.includes('爱情') || content.includes('romance')) return 'romance';
  if (content.includes('家庭') || content.includes('family')) return 'family';
  if (content.includes('现代') || content.includes('modern')) return 'modern';
  if (content.includes('都市') || content.includes('urban')) return 'urban';
  if (content.includes('古装') || content.includes('costume')) return 'costume';
  if (content.includes('穿越') || content.includes('time')) return 'time_travel';
  if (content.includes('商战') || content.includes('business')) return 'business';
  if (content.includes('悬疑') || content.includes('suspense')) return 'suspense';
  if (content.includes('喜剧') || content.includes('comedy')) return 'comedy';
  if (content.includes('青春') || content.includes('youth')) return 'youth';

  return 'all';
}

/**
 * 获取内容的地区信息
 */
function getContentRegion(title?: string, desc?: string): string {
  if (!title && !desc) return 'all';

  const content = `${title || ''} ${desc || ''}`.toLowerCase();

  if (content.includes('韩国') || content.includes('korean')) return 'korean';
  if (content.includes('日本') || content.includes('japanese')) return 'japanese';
  if (content.includes('美国') || content.includes('american')) return 'usa';
  if (content.includes('英国') || content.includes('british')) return 'uk';
  if (content.includes('泰国') || content.includes('thai')) return 'thailand';
  if (content.includes('中国') || content.includes('chinese') || content.includes('国产')) return 'mainland_china';

  return 'all';
}

/**
 * 匹配年份筛选
 */
function matchYear(resultYear: string, filterYear: string): boolean {
  const year = parseInt(resultYear);
  if (!year) return false;

  switch (filterYear) {
    case '2025':
      return year === 2025;
    case '2024':
      return year === 2024;
    case '2023':
      return year === 2023;
    case '2022':
      return year === 2022;
    case '2021':
      return year === 2021;
    case '2020':
      return year === 2020;
    case '2019':
      return year === 2019;
    case '2020s':
      return year >= 2020 && year <= 2029;
    case '2010s':
      return year >= 2010 && year <= 2019;
    case '2000s':
      return year >= 2000 && year <= 2009;
    case '1990s':
      return year >= 1990 && year <= 1999;
    case '1980s':
      return year >= 1980 && year <= 1989;
    case '1970s':
      return year >= 1970 && year <= 1979;
    case '1960s':
      return year >= 1960 && year <= 1969;
    case 'earlier':
      return year < 1960;
    default:
      return true;
  }
}
