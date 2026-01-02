/* eslint-disable @typescript-eslint/no-explicit-any,no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getCacheTime } from '@/lib/config';
import { fetchDoubanData } from '@/lib/douban';
import { DoubanResult } from '@/lib/types';

interface DoubanRecommendApiResponse {
  total: number;
  items: Array<{
    id: string;
    title: string;
    year: string;
    type: string;
    pic: {
      large: string;
      normal: string;
    };
    rating: {
      value: number;
    };
  }>;
}

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // 获取参数
  const kind = searchParams.get('kind');
  const pageLimit = parseInt(searchParams.get('limit') || '20');
  const pageStart = parseInt(searchParams.get('start') || '0');
  const category =
    searchParams.get('category') === 'all' ||
    searchParams.get('category') === null
      ? ''
      : searchParams.get('category');
  const format =
    searchParams.get('format') === 'all' ? '' : searchParams.get('format');
  const region =
    searchParams.get('region') === 'all' ? '' : searchParams.get('region');
  const year =
    searchParams.get('year') === 'all' ? '' : searchParams.get('year');
  const platform =
    searchParams.get('platform') === 'all' ? '' : searchParams.get('platform');
  const sort = searchParams.get('sort') === 'T' ? '' : searchParams.get('sort');
  const label =
    searchParams.get('label') === 'all' ? '' : searchParams.get('label');

  if (!kind) {
    return NextResponse.json({ error: '缺少必要参数: kind' }, { status: 400 });
  }

  const selectedCategories = { 类型: category } as any;
  if (format) {
    selectedCategories['形式'] = format;
  }
  if (region) {
    selectedCategories['地区'] = region;
  }

  const tags = [] as Array<string>;
  if (category) {
    tags.push(category);
  }
  if (!category && format) {
    tags.push(format);
  }
  if (label) {
    tags.push(label);
  }
  if (region) {
    tags.push(region);
  }
  if (year) {
    tags.push(year);
  }
  if (platform) {
    tags.push(platform);
  }

  // 使用正确的API URL获取数据
  let target = '';
  if (category === '动画') {
    // 热门动漫使用search_subjects API，支持多种类型
    const animeSort = sort === 'U' ? 'recommend' : sort; // 转换sort参数
    target = `https://movie.douban.com/j/search_subjects?type=tv&tag=动画&sort=${animeSort}&page_limit=${pageLimit}&page_start=${pageStart}`;
  } else {
    // 其他类型继续使用原来的API
    const baseUrl = `https://m.douban.com/rexxar/api/v2/${kind}/recommend`;
    const params = new URLSearchParams();
    params.append('refresh', '0');
    params.append('start', pageStart.toString());
    params.append('count', pageLimit.toString());
    params.append('selected_categories', JSON.stringify(selectedCategories));
    params.append('uncollect', 'false');
    params.append('score_range', '0,10');
    params.append('tags', tags.join(','));
    if (sort) {
      params.append('sort', sort);
    }
    target = `${baseUrl}?${params.toString()}`;
  }

  console.log(`Fetching anime data from: ${target}`);
  try {
    let list = [];

    if (category === '动画') {
      // 处理search_subjects API响应
      const doubanData = await fetchDoubanData<{ subjects: any[] }>(target);
      console.log(`Anime data received: ${doubanData.subjects.length} items`);
      list = doubanData.subjects.map((item) => ({
        id: item.id,
        title: item.title,
        poster: item.cover,
        rate: item.rate,
        year: item.year || item.title.match(/(\d{4})/)?.[1] || '', // 优先使用item.year，fallback到标题提取
      }));
    } else {
      // 处理原来的recommend API响应
      const doubanData = await fetchDoubanData<DoubanRecommendApiResponse>(
        target
      );
      list = doubanData.items
        .filter(
          (item) =>
            item.type == 'movie' || item.type == 'tv' || item.type == 'anime'
        )
        .map((item) => ({
          id: item.id,
          title: item.title,
          poster: item.pic?.normal || item.pic?.large || '',
          rate: item.rating?.value ? item.rating.value.toFixed(1) : '',
          year: item.year,
        }));
    }

    const response: DoubanResult = {
      code: 200,
      message: '获取成功',
      list: list,
    };

    const cacheTime = await getCacheTime();
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
        'CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
        'Vercel-CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
        'Netlify-Vary': 'query',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: '获取豆瓣数据失败', details: (error as Error).message },
      { status: 500 }
    );
  }
}
