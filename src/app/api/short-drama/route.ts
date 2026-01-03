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

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'all'; // 短剧类型筛选
  const region = searchParams.get('region') || 'all'; // 地区筛选
  const year = searchParams.get('year') || 'all'; // 年份筛选
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '25');

  const config = await getConfig();
  // 直接获取所有可用的API站点，不考虑用户权限
  const apiSites = await getAvailableApiSites();

  // 检查是否有可用的API站点
  const hasAvailableSites = apiSites && apiSites.length > 0;
  
  console.log(`短剧API请求参数: type=${type}, region=${region}, year=${year}, page=${page}, limit=${limit}`);
  console.log(`可用API站点数量: ${apiSites.length}, 站点列表: ${JSON.stringify(apiSites.map(s => s.name))}`);
  console.log(`是否有可用站点: ${hasAvailableSites}`);

  try {
    let allResults: SearchResult[] = [];

    // 增加更多短剧相关的搜索关键词，提高搜索结果数量
    const shortDramaKeywords = [
      '短剧',
      '微剧',
      '竖屏短剧',
      '网络短剧',
      '小剧场',
      '微电影',
      'mini drama',
      'micro drama',
      'short drama',
      'short film',
      '竖屏',
      '短视频剧',
      '网络剧',
      '迷你剧',
      '短剧集',
      '短剧精选',
      '热门短剧',
      '短剧推荐',
      '短剧剧场',
      '短剧专区',
      '微短剧',
      '短剧热播',
      '短剧合集',
      '短剧在线',
      '短剧免费',
      '短剧大全',
    ];

    // 添加调试日志
    console.log(`可用API站点数量: ${apiSites.length}`);
    console.log(`API站点详情: ${JSON.stringify(apiSites)}`);

    // 不管是否有可用站点，都尝试返回一些示例短剧数据
    if (hasAvailableSites) {
      // 使用更多关键词和站点进行搜索，提高结果数量
      // 使用前10个最相关的关键词
      const topKeywords = shortDramaKeywords.slice(0, 10);
      // 使用所有可用的站点
      const topSites = apiSites;

      console.log(`优化后使用的关键词数量: ${topKeywords.length}`);
      console.log(`优化后使用的站点数量: ${topSites.length}`);

      // 并行搜索多个关键词
      const searchPromises = topKeywords.map(async (keyword) => {
        // 优化：使用更高效的方式处理站点请求，限制并发数量
        const siteResults: SearchResult[][] = [];

        // 串行处理站点请求，避免太多并行请求
        for (const site of topSites) {
          try {
            console.log(`正在搜索站点 ${site.name}，关键词: ${keyword}`);
            const results = (await Promise.race([
              searchFromApi(site, keyword),
              new Promise((_, reject) =>
                setTimeout(
                  () => reject(new Error(`${site.name} timeout`)),
                  15000
                )
              ),
            ])) as SearchResult[];

            console.log(`站点 ${site.name} 返回结果数量: ${results.length}`);

            // 过滤出真正的短剧内容，增加容错处理
            const filteredResults = results.filter((result) => {
              try {
                // 1. 检查是否为短剧 - 放宽条件，允许更多内容通过
                const isShortDramaResult = isShortDrama(
                  result.type_name,
                  result.title
                );
                if (!isShortDramaResult) {
                  // 放宽条件：如果标题包含短剧相关关键词，也允许通过
                  const titleLower = result.title.toLowerCase();
                  const hasShortDramaKeyword = shortDramaKeywords.some(
                    (keyword) => titleLower.includes(keyword)
                  );
                  if (!hasShortDramaKeyword) {
                    return false;
                  }
                }

                // 2. 过滤黄色内容
                if (!config.SiteConfig.DisableYellowFilter) {
                  const typeName = result.type_name || '';
                  if (
                    yellowWords.some((word: string) => typeName.includes(word))
                  ) {
                    return false;
                  }
                }

                // 3. 类型筛选 - 增加容错处理，允许更多类型通过
                if (type !== 'all') {
                  const resultType = getShortDramaType(
                    result.type_name,
                    result.title
                  );
                  if (resultType !== type && resultType !== 'all') {
                    return false;
                  }
                }

                // 4. 地区筛选 - 简化地区筛选逻辑，允许更多地区通过
                if (region !== 'all') {
                  const resultRegion = getContentRegion(
                    result.title,
                    result.desc
                  );
                  // 允许"全部"、匹配的地区或华语内容通过
                  if (
                    resultRegion !== region &&
                    resultRegion !== 'all' &&
                    !(
                      region === 'chinese' &&
                      (resultRegion === 'mainland_china' ||
                        resultRegion === 'chinese')
                    )
                  ) {
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

            siteResults.push(filteredResults);
          } catch (error) {
            console.warn(`搜索短剧失败 ${site.name} - ${keyword}:`, error);
            siteResults.push([]);
          }
        }

        const flatResults = siteResults.flat();
        console.log(`关键词 ${keyword} 搜索结果数量: ${flatResults.length}`);
        return flatResults;
      });

      const keywordResults = await Promise.allSettled(searchPromises);
      allResults = keywordResults
        .filter((result) => result.status === 'fulfilled')
        .map(
          (result) => (result as PromiseFulfilledResult<SearchResult[]>).value
        )
        .flat();

      console.log(`所有关键词搜索结果总数: ${allResults.length}`);
    }

    // 如果没有搜索到结果，返回空结果
    if (allResults.length === 0) {
      console.log('没有搜索到短剧数据，返回空结果');
      return NextResponse.json(
        {
          results: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
        },
        {
          headers: {
            'Cache-Control': 'public, max-age=300, s-maxage=300',
            'CDN-Cache-Control': 'public, s-maxage=300',
            'Vercel-CDN-Cache-Control': 'public, s-maxage=300',
            'Netlify-Vary': 'query',
          },
        }
      );
    }
    
    console.log(`搜索后结果数量: ${allResults.length}`);

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
    return NextResponse.json({ error: '获取短剧数据失败' }, { status: 500 });
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
  if (content.includes('穿越') || content.includes('time'))
    return 'time_travel';
  if (content.includes('商战') || content.includes('business'))
    return 'business';
  if (content.includes('悬疑') || content.includes('suspense'))
    return 'suspense';
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
  if (content.includes('日本') || content.includes('japanese'))
    return 'japanese';
  if (content.includes('美国') || content.includes('american')) return 'usa';
  if (content.includes('英国') || content.includes('british')) return 'uk';
  if (content.includes('泰国') || content.includes('thai')) return 'thailand';
  if (
    content.includes('中国') ||
    content.includes('chinese') ||
    content.includes('国产')
  )
    return 'mainland_china';

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
