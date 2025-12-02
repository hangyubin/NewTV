/* eslint-disable @typescript-eslint/no-explicit-any,no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
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
  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'all'; // 短剧类型筛选
  const region = searchParams.get('region') || 'all'; // 地区筛选
  const year = searchParams.get('year') || 'all'; // 年份筛选
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '25');

  const config = await getConfig();
  const apiSites = await getAvailableApiSites(authInfo.username);

  try {
    // 简化短剧相关的搜索关键词，只使用"短剧"这一个词
    const shortDramaKeywords = ['短剧'];

    let allResults: SearchResult[] = [];

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

          // 过滤出真正的短剧内容
          return results.filter((result) => {
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

            // 3. 年份筛选
            if (year !== 'all' && result.year) {
              const resultYear = parseInt(result.year);
              if (isNaN(resultYear)) {
                return false;
              }
              
              // 直接比较年份
              if (year === '2025' && resultYear !== 2025) return false;
              if (year === '2024' && resultYear !== 2024) return false;
              if (year === '2023' && resultYear !== 2023) return false;
              if (year === '2022' && resultYear !== 2022) return false;
              if (year === '2021' && resultYear !== 2021) return false;
              if (year === '2020' && resultYear !== 2020) return false;
              if (year === '2019' && resultYear !== 2019) return false;
              if (year === '2020s' && (resultYear < 2020 || resultYear > 2029)) return false;
              if (year === '2010s' && (resultYear < 2010 || resultYear > 2019)) return false;
              if (year === '2000s' && (resultYear < 2000 || resultYear > 2009)) return false;
              if (year === '1990s' && (resultYear < 1990 || resultYear > 1999)) return false;
              if (year === '1980s' && (resultYear < 1980 || resultYear > 1989)) return false;
              if (year === '1970s' && (resultYear < 1970 || resultYear > 1979)) return false;
              if (year === '1960s' && (resultYear < 1960 || resultYear > 1969)) return false;
              if (year === 'earlier' && resultYear >= 1960) return false;
            }

            return true;
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


