/* eslint-disable @typescript-eslint/no-explicit-any,no-console */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthInfoFromCookie } from '@/lib/auth';
import { getAvailableApiSites, getCacheTime, getConfig } from '@/lib/config';
import { searchFromApi } from '@/lib/downstream';
import { yellowWords } from '@/lib/yellow';

export const runtime = 'nodejs';

interface SearchCacheEntry {
  results: any[];
  timestamp: number;
  query: string;
}

const searchCache = new Map<string, SearchCacheEntry>();
const MAX_CACHE_SIZE = 100;
const CACHE_TTL = 5 * 60 * 1000;

function getCacheKey(query: string, username: string): string {
  return `${username}:${query.toLowerCase().trim()}`;
}

function cleanExpiredCache(): void {
  const now = Date.now();
  Array.from(searchCache.entries()).forEach(([key, entry]) => {
    if (now - entry.timestamp > CACHE_TTL) {
      searchCache.delete(key);
    }
  });
}

function limitCacheSize(): void {
  if (searchCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(searchCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    const toRemove = entries.slice(0, searchCache.size - MAX_CACHE_SIZE);
    toRemove.forEach(([key]) => searchCache.delete(key));
  }
}

function getCachedResults(query: string, username: string): any[] | null {
  const key = getCacheKey(query, username);
  const entry = searchCache.get(key);

  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    console.log(`搜索缓存命中: ${query}`);
    return entry.results;
  }

  return null;
}

function setCachedResults(query: string, username: string, results: any[]): void {
  const key = getCacheKey(query, username);
  searchCache.set(key, {
    results,
    timestamp: Date.now(),
    query,
  });

  cleanExpiredCache();
  limitCacheSize();
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

  const config = await getConfig();
  const apiSites = await getAvailableApiSites(authInfo.username);

  const cachedResults = getCachedResults(query, authInfo.username);
  if (cachedResults) {
    const cacheTime = await getCacheTime();
    return NextResponse.json(
      { results: cachedResults },
      {
        headers: {
          'Cache-Control': `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
          'CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
          'Vercel-CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
          'Netlify-Vary': 'query',
          'X-Cache': 'HIT',
        },
      }
    );
  }

  const MAX_SEARCH_PAGES = config.SiteConfig.SearchDownstreamMaxPage;
  const searchPromises = apiSites.map((site, index) =>
    Promise.race([
      searchFromApi(site, query),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`${site.name} timeout`)), 15000 + index * 1000)
      ),
    ]).catch((err) => {
      console.warn(`搜索失败 ${site.name}:`, err.message);
      return [];
    })
  );

  try {
    const results = await Promise.allSettled(searchPromises);
    const successResults = results
      .filter((result) => result.status === 'fulfilled')
      .map((result) => (result as PromiseFulfilledResult<any>).value);
    let flattenedResults = successResults.flat();

    if (!config.SiteConfig.DisableYellowFilter) {
      flattenedResults = flattenedResults.filter((result) => {
        const typeName = result.type_name || '';
        return !yellowWords.some((word: string) => typeName.includes(word));
      });
    }

    const cacheTime = await getCacheTime();
    setCachedResults(query, authInfo.username, flattenedResults);

    if (flattenedResults.length === 0) {
      return NextResponse.json({ results: [] }, { status: 200 });
    }

    return NextResponse.json(
      { results: flattenedResults },
      {
        headers: {
          'Cache-Control': `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
          'CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
          'Vercel-CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
          'Netlify-Vary': 'query',
          'X-Cache': 'MISS',
        },
      }
    );
  } catch (error) {
    console.error('搜索错误:', error);
    return NextResponse.json({ error: '搜索失败' }, { status: 500 });
  }
}
