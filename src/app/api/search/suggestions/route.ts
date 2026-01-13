/* eslint-disable @typescript-eslint/no-explicit-any,no-console */

import { NextRequest, NextResponse } from 'next/server';

import { AdminConfig } from '@/lib/admin.types';
import { getAuthInfoFromCookie } from '@/lib/auth';
import { getAvailableApiSites, getConfig } from '@/lib/config';
import { searchFromApi } from '@/lib/downstream';
import { yellowWords } from '@/lib/yellow';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // 从 cookie 获取用户信息
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await getConfig();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();

    if (!query) {
      return NextResponse.json({ suggestions: [] });
    }

    // 生成建议
    const suggestions = await generateSuggestions(
      config,
      query,
      authInfo.username
    );

    // 从配置中获取缓存时间，如果没有配置则使用默认值300秒（5分钟）
    const cacheTime = config.SiteConfig.SiteInterfaceCacheTime || 300;

    return NextResponse.json(
      { suggestions },
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
    console.error('获取搜索建议失败', error);
    return NextResponse.json({ error: '获取搜索建议失败' }, { status: 500 });
  }
}

// 搜索建议缓存
const suggestionCache = new Map<
  string,
  {
    suggestions: Array<{
      text: string;
      type: 'exact' | 'related' | 'suggestion';
      score: number;
    }>;
    timestamp: number;
  }
>();

// 缓存有效期：5分钟
const SUGGESTION_CACHE_TTL = 5 * 60 * 1000;

async function generateSuggestions(
  config: AdminConfig,
  query: string,
  username: string
): Promise<
  Array<{
    text: string;
    type: 'exact' | 'related' | 'suggestion';
    score: number;
  }>
> {
  const queryLower = query.toLowerCase();
  const cacheKey = `${username}-${queryLower}`;

  // 检查缓存
  const cached = suggestionCache.get(cacheKey);
  const now = Date.now();
  if (cached && now - cached.timestamp < SUGGESTION_CACHE_TTL) {
    return cached.suggestions;
  }

  const apiSites = await getAvailableApiSites(username);
  const allTitles: string[] = [];

  if (apiSites.length > 0) {
    // 使用多个数据源，但限制并发数
    const CONCURRENCY_LIMIT = 2;
    const siteBatches = [];
    for (let i = 0; i < apiSites.length; i += CONCURRENCY_LIMIT) {
      siteBatches.push(apiSites.slice(i, i + CONCURRENCY_LIMIT));
    }

    // 分批次执行搜索
    for (const batch of siteBatches) {
      const batchPromises = batch.map((site) =>
        Promise.race([
          searchFromApi(site, query),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`${site.name} timeout`)), 5000)
          ),
        ]).catch(() => [])
      );

      const batchResults = await Promise.all(batchPromises);
      for (const results of batchResults) {
        if (results && Array.isArray(results)) {
          const filteredTitles = results
            .filter(
              (r: any) => {
                // 搜索建议根据全局设置决定是否过滤黄色内容
                if (config.SiteConfig.DisableYellowFilter) {
                  return true;
                }
                
                const typeName = r.type_name || '';
                const className = r.class || '';
                const title = r.title || '';
                
                // 检查类型名、分类或标题中是否包含黄色关键词
                const isYellow = yellowWords.some(
                  (word: string) =>
                    typeName.includes(word) ||
                    className.includes(word) ||
                    title.includes(word)
                );
                
                return !isYellow;
              }
            )
            .map((r: any) => r.title)
            .filter(Boolean);

          allTitles.push(...filteredTitles);
        }
      }

      // 如果已经收集到足够的标题，提前结束
      if (allTitles.length >= 50) {
        break;
      }
    }
  }

  // 从所有标题中提取关键词
  const keywordsMap = new Map<string, number>();

  for (const title of allTitles) {
    // 提取标题中的关键词
    const words = title.split(/[\s-:：·、-]/);

    for (const word of words) {
      const wordLower = word.toLowerCase();
      // 过滤条件：长度大于1，包含查询词
      if (word.length > 1 && wordLower.includes(queryLower)) {
        // 计算词频
        const count = keywordsMap.get(word) || 0;
        keywordsMap.set(word, count + 1);
      }
    }
  }

  // 转换为数组并排序
  const realKeywords = Array.from(keywordsMap.entries())
    .sort((a, b) => b[1] - a[1]) // 按词频降序
    .map(([word]) => word)
    .slice(0, 20); // 最多提取20个关键词

  // 根据关键词与查询的匹配程度计算分数，并动态确定类型
  const realSuggestions = realKeywords.map((word) => {
    const wordLower = word.toLowerCase();
    const queryWords = queryLower.split(/[\s-:：·、-]/);

    // 计算匹配分数：完全匹配得分更高，词频也影响分数
    const baseScore = keywordsMap.get(word) || 1;
    let matchScore = 0;

    if (wordLower === queryLower) {
      matchScore = 3.0; // 完全匹配
    } else if (wordLower.startsWith(queryLower)) {
      matchScore = 2.5; // 前缀匹配
    } else if (wordLower.endsWith(queryLower)) {
      matchScore = 2.0; // 后缀匹配
    } else if (queryWords.some((qw) => wordLower.includes(qw))) {
      matchScore = 1.5; // 包含查询词
    } else {
      matchScore = 1.0; // 弱匹配
    }

    // 综合词频和匹配程度计算最终分数
    const score = baseScore * matchScore;

    // 根据匹配程度确定类型
    let type: 'exact' | 'related' | 'suggestion' = 'suggestion';
    if (matchScore >= 3.0) {
      type = 'exact';
    } else if (matchScore >= 2.0) {
      type = 'related';
    }

    return {
      text: word,
      type,
      score,
    };
  });

  // 按分数降序排列，相同分数按类型优先级排列
  const sortedSuggestions = realSuggestions
    .sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score; // 分数高的在前
      }
      // 分数相同时，按类型优先级：exact > related > suggestion
      const typePriority = { exact: 3, related: 2, suggestion: 1 };
      return typePriority[b.type] - typePriority[a.type];
    })
    .slice(0, 8); // 最多返回8个建议

  // 更新缓存
  suggestionCache.set(cacheKey, {
    suggestions: sortedSuggestions,
    timestamp: now,
  });

  // 限制缓存大小，最多保存50个缓存项
  if (suggestionCache.size > 50) {
    const oldestKey = suggestionCache.keys().next().value;
    suggestionCache.delete(oldestKey);
  }

  return sortedSuggestions;
}
