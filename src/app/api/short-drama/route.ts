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
  const type = searchParams.get('type');
  const region = searchParams.get('region');
  const year = searchParams.get('year');
  
  // 记录请求开始时间
  const requestStartTime = Date.now();
  
  // 提前声明变量，确保在catch块中可见
  let shortDramaKeywords: string[] = [];
  let apiSites: ApiSite[] = [];

  try {

    // 优化搜索策略：只使用一个关键词，进一步减少API请求数量
    shortDramaKeywords = keyword
      ? [keyword] // 只使用用户提供的关键词，避免重复请求
      : ['短剧']; // 只使用最相关的1个关键词，减少API请求数量
    

    let allResults: SearchResult[] = [];
    
    // 记录每个API源的返回结果数量
    const apiSiteResultsCount: Record<string, number> = {};

    // 从视频源管理中获取可用的API源
    // 这样当视频源列表中被写入或导入了API，短剧API就会自动使用这些API
    apiSites = await getAvailableApiSites();

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
            processingTime: Date.now() - requestStartTime,
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

    // 优化搜索策略：实现智能随机选择API源，带容错机制
    // 1. 从可用API源中随机选择，避免同时请求所有API源
    // 2. 添加重试机制，当一个API失效时尝试另一个
    // 3. 只使用1个最相关的关键词，减少搜索次数
    // 4. 缩短超时时间，避免长时间等待
    // 5. 限制最大尝试次数，避免无限循环
    
    // 随机选择一个API源，避免重复选择同一个API源
    const getRandomApiSite = (usedSites: string[] = []) => {
      if (apiSites.length === 0) return null;
      
      // 过滤掉已经使用过的API源
      const availableSites = apiSites.filter(site => !usedSites.includes(site.name));
      if (availableSites.length === 0) return null;
      
      const randomIndex = Math.floor(Math.random() * availableSites.length);
      return availableSites[randomIndex];
    };
    
    // 直接使用关键词进行搜索，减少搜索次数
    const keywordsToSearch = keyword 
      ? [keyword] 
      : ['短剧']; // 直接使用"短剧"关键词进行搜索

    console.log(`📺 [短剧API] 搜索关键词: ${keywordsToSearch.join(', ')}`);
    console.log(`📺 [短剧API] 可用API源数量: ${apiSites.length}`);

    // 优化API请求策略：
    // 1. 智能随机选择API源，带重试机制
    // 2. 缩短超时时间，避免长时间等待
    // 3. 限制最大尝试次数，避免无限循环
    const TIMEOUT_MS = 5000; // 超时时间，5秒
    const MAX_ATTEMPTS = 3; // 最大尝试次数，避免无限循环
    
    // 串行搜索关键词，智能选择API源
    for (const searchKeyword of keywordsToSearch) {
      const usedSites: string[] = [];
      let success = false;
      
      // 最多尝试MAX_ATTEMPTS次，直到找到可用的API源
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const randomSite = getRandomApiSite(usedSites);
        if (!randomSite) {
          console.log(`📺 [短剧API] 没有更多可用的API源，跳过搜索`);
          break;
        }
        
        usedSites.push(randomSite.name);
        console.log(`📺 [短剧API] 第${attempt + 1}次尝试 - 随机选择的API源: ${randomSite.name}`);
        
        try {
          // 只获取前100条结果，避免数据量过大
          const apiResults = (await Promise.race([
            searchFromApi(randomSite, searchKeyword),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error(`${randomSite.name} timeout`)),
                TIMEOUT_MS
              )
            ),
          ])) as SearchResult[];
          
          // 过滤出真正的短剧内容
          const filteredResults = apiResults.filter((result: SearchResult) => {
            const isShort = isShortDrama(result.type_name, result.title, result.class);
            return isShort;
          });

          // 限制每个API源返回的结果数量，避免数据量过大
          const limitedResults = filteredResults.slice(0, 50);
          
          // 记录每个API源的返回结果数量
          if (!apiSiteResultsCount[randomSite.name]) {
            apiSiteResultsCount[randomSite.name] = 0;
          }
          apiSiteResultsCount[randomSite.name] += limitedResults.length;

          console.log(`📺 [短剧API] ${randomSite.name} 搜索 ${searchKeyword} 返回 ${limitedResults.length} 条短剧结果`);
          
          // 添加到结果列表
          allResults = [...allResults, ...limitedResults];
          success = true;

          // 如果已经获取到足够的结果，不再继续搜索
          if (allResults.length >= 100) {
            console.log(`📺 [短剧API] 已获取到 ${allResults.length} 条结果，停止搜索`);
            break;
          }
          
          // 继续尝试下一个API源，获取更多数据
          console.log(`📺 [短剧API] 继续尝试下一个API源，当前已获取 ${allResults.length} 条结果`);
        } catch (error) {
          // 记录错误信息，继续尝试下一个API源
          console.error(`📺 [短剧API] ${randomSite.name} 搜索 ${searchKeyword} 失败:`, error instanceof Error ? error.message : String(error));
          console.log(`📺 [短剧API] 将尝试下一个API源`);
        }
      }
      
      // 如果当前关键词搜索成功，继续搜索下一个关键词
      if (success && allResults.length < 100) {
        continue;
      }
      
      // 如果没有更多关键词或已经获取足够结果，停止搜索
      break;
    }
    
    // 如果最终没有获取到任何结果，返回空数组
    if (allResults.length === 0) {
      console.log(`📺 [短剧API] 所有API源都不可用，返回空结果`);
    }

    // 优化去重机制，提高去重准确性
    // 基于标题、年份和主要分类特征进行去重，同时智能合并片源信息
    const uniqueResultsMap = new Map<string, SearchResult>();

    // 生成更准确的去重键
    const generateUniqueKey = (result: SearchResult): string => {
      // 清理标题，移除常见的后缀和前缀
      const cleanedTitle = result.title?.toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[(（)）]/g, '')
        .replace(/[\u4e00-\u9fa5]版$/g, '')
        .replace(/[\u4e00-\u9fa5]全集$/g, '')
        .replace(/[\u4e00-\u9fa5]完结$/g, '')
        .replace(/[\u4e00-\u9fa5]高清$/g, '')
        .replace(/[\u4e00-\u9fa5]无删减$/g, '') || '';
      
      // 使用清理后的标题和年份作为主要去重依据，添加分类信息提高准确性
      return `${cleanedTitle}-${result.year || 'unknown'}-${result.class?.toLowerCase().substring(0, 10) || 'unknown'}`;
    };

    for (const result of allResults) {
      const key = generateUniqueKey(result);
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
        
        // 选择更完整的描述信息
        if (!existingResult.desc && result.desc) {
          existingResult.desc = result.desc;
        }
        
        // 选择更清晰的海报图片
        if (existingResult.poster?.includes('default') && result.poster?.includes('http')) {
          existingResult.poster = result.poster;
        }
        
        // 选择更准确的评分信息
        if (!existingResult.score && result.score) {
          existingResult.score = result.score;
        }
      } else {
        // 首次添加，设置初始值
        result.source_count = (result.episodes || []).length;
        result.source_sites = [result.source_name];
        uniqueResultsMap.set(key, result);
      }
    }

    const uniqueResults = Array.from(uniqueResultsMap.values());

    console.log(`📺 [短剧API] 去重后保留 ${uniqueResults.length} 条结果`);

    // 添加类型、地区和年份筛选，增强筛选精确性
    let filteredResults = [...uniqueResults];
    
    // 类型映射表，将用户输入的类型映射到实际可能出现的类型值
    const typeMapping: Record<string, string[]> = {
      'romance': ['爱情', '言情', '都市爱情', '校园爱情', '甜宠', '虐恋', '女频恋爱'],
      'family': ['家庭', '亲情', '伦理', '生活'],
      'modern': ['现代', '都市', '当代', '现实'],
      'urban': ['都市', '城市', '职场', '商战'],
      'costume': ['古装', '古代', '武侠', '仙侠', '历史'],
      'time_travel': ['穿越', '时空', '回到', '重生'],
      'business': ['商战', '职场', '创业', '商业'],
      'suspense': ['悬疑', '推理', '侦探', '破案'],
      'comedy': ['喜剧', '搞笑', '幽默', '欢乐'],
      'youth': ['青春', '校园', '成长', '初恋']
    };
    
    // 地区映射表，将用户输入的地区映射到实际可能出现的地区值
    const regionMapping: Record<string, string[]> = {
      'chinese': ['华语', '中文', '中国', '大陆', '港台', '香港', '台湾'],
      'mainland_china': ['大陆', '中国大陆', '内地', '中国内地'],
      'korean': ['韩国', '韩剧', '韩流', '韩语'],
      'japanese': ['日本', '日剧', '动漫', '日语'],
      'usa': ['美国', '美剧', '英语', '好莱坞'],
      'uk': ['英国', '英剧', '英国剧'],
      'thailand': ['泰国', '泰剧', '泰语']
    };
    
    // 按类型筛选
    if (type && type !== 'all') {
      const targetType = type.toLowerCase();
      const typeKeywords = typeMapping[targetType] || [targetType];
      
      filteredResults = filteredResults.filter(result => {
        const resultType = result.type_name?.toLowerCase() || '';
        const resultClass = result.class?.toLowerCase() || '';
        const resultTitle = result.title?.toLowerCase() || '';
        
        // 检查是否匹配任何类型关键词
        return typeKeywords.some(keyword => {
          return resultType.includes(keyword) || 
                 resultClass.includes(keyword) ||
                 resultTitle.includes(keyword);
        });
      });
    }
    
    // 按地区筛选
    if (region && region !== 'all') {
      const targetRegion = region.toLowerCase();
      const regionKeywords = regionMapping[targetRegion] || [targetRegion];
      
      filteredResults = filteredResults.filter(result => {
        const resultClass = result.class?.toLowerCase() || '';
        const resultTitle = result.title?.toLowerCase() || '';
        const resultType = result.type_name?.toLowerCase() || '';
        
        // 检查是否匹配任何地区关键词
        return regionKeywords.some(keyword => {
          return resultClass.includes(keyword) || 
                 resultTitle.includes(keyword) ||
                 resultType.includes(keyword);
        });
      });
    }
    
    // 按年份筛选，支持精确匹配和范围匹配
    if (year && year !== 'all') {
      filteredResults = filteredResults.filter(result => {
        const resultYear = result.year || '';
        const resultTitle = result.title?.toLowerCase() || '';
        const resultClass = result.class?.toLowerCase() || '';
        
        // 支持年份范围匹配，如 "2020-2023"
        if (year.includes('-')) {
          const [startYear, endYear] = year.split('-').map(y => parseInt(y));
          if (!isNaN(startYear) && !isNaN(endYear)) {
            const resultYearNum = parseInt(resultYear);
            return !isNaN(resultYearNum) && resultYearNum >= startYear && resultYearNum <= endYear;
          }
        }
        
        // 精确匹配
        return resultYear.includes(year) || 
               resultTitle.includes(year) ||
               resultClass.includes(year);
      });
    }
    
    // 按年份、评分、片源数量和标题长度排序，综合考虑短剧热度和质量
    const sortedResults = filteredResults.sort((a, b) => {
      // 1. 优先按年份排序（新的在前）
      const yearA = parseInt(a.year) || 0;
      const yearB = parseInt(b.year) || 0;
      if (yearA !== yearB) {
        return yearB - yearA;
      }
      
      // 2. 然后按评分排序（高评分在前）
      const scoreA = a.score || 0;
      const scoreB = b.score || 0;
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      
      // 3. 然后按片源数量排序（多片源在前）
      const sourceCountA = a.source_count || (a.episodes?.length || 0);
      const sourceCountB = b.source_count || (b.episodes?.length || 0);
      if (sourceCountA !== sourceCountB) {
        return sourceCountB - sourceCountA;
      }
      
      // 4. 最后按标题长度排序（短剧通常标题较短）
      const titleLengthA = a.title?.length || 0;
      const titleLengthB = b.title?.length || 0;
      return titleLengthA - titleLengthB;
    });
    
    console.log(`📺 [短剧API] 排序后结果数量: ${sortedResults.length}`);

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
        apiSites: apiSites.map((site: ApiSite) => site.name),
        apiSiteResultsCount: apiSiteResultsCount,
        requestTime: new Date().toISOString(),
        processingTime: Date.now() - requestStartTime,
        keyword: keyword,
        searchKeywords: shortDramaKeywords,
        type: type,
        region: region,
        year: year,
        totalResults: sortedResults.length,
        filteredResults: filteredResults.length,
        uniqueResults: uniqueResults.length,
        allResultsCount: allResults.length,
      },
    };

    // 根据请求参数和响应结果动态调整缓存时间
    // 1. 如果有用户提供的关键词，缓存时间较短（5分钟），因为用户搜索可能需要最新数据
    // 2. 如果是热门短剧（评分高或片源多），缓存时间较长（1小时）
    // 3. 其他情况使用默认缓存时间
    let cacheTime = await getCacheTime();
    
    // 根据请求参数调整缓存时间
    if (keyword) {
      cacheTime = 300; // 5分钟
    } 
    // 根据响应结果调整缓存时间
    else if (sortedResults.length > 0) {
      const hasHighScore = sortedResults.some(result => result.score && result.score > 8.0);
      const hasManySources = sortedResults.some(result => result.source_count && result.source_count > 5);
      
      if (hasHighScore || hasManySources) {
        cacheTime = 3600; // 1小时
      }
    }
    
    console.log(`📺 [短剧API] 缓存时间: ${cacheTime}秒`);

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
          errorStack: error instanceof Error ? error.stack : undefined,
          requestTime: new Date().toISOString(),
          keyword: keyword,
          type: type,
          region: region,
          year: year,
          searchKeywords: shortDramaKeywords,
          apiSitesCount: apiSites?.length || 0,
          apiSites: apiSites?.map((site: ApiSite) => site.name) || [],
          processingTime: Date.now() - requestStartTime,
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
