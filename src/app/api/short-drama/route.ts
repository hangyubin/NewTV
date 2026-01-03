/* eslint-disable @typescript-eslint/no-explicit-any,no-console */

import { NextRequest, NextResponse } from 'next/server';

/**
 * 短剧专用API接口
 * 直接调用专门的短剧API获取数据
 */
export async function GET(request: NextRequest) {
  // 短剧API暂时不需要认证

  const { searchParams } = new URL(request.url);
  const _type = searchParams.get('type') || 'all'; // 短剧类型筛选
  const _region = searchParams.get('region') || 'all'; // 地区筛选
  const _year = searchParams.get('year') || 'all'; // 年份筛选
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '25');
  const categoryId = searchParams.get('categoryId') || '1'; // 默认分类
  const _keyword = searchParams.get('keyword') || '';

  try {
    let allResults: any[] = [];
    let hasMore = true;

    // 调用专门的短剧API
    const apiUrl = `https://api.r2afosne.dpdns.org/vod/list?categoryId=${categoryId}&page=${page}&size=${limit}`;

    console.log('📺 [短剧API] 调用外部短剧API:', apiUrl);

    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('📺 [短剧API] 外部API返回:', JSON.stringify(data, null, 2));

    const items = data.list || [];

    // 转换数据格式
    const formattedResults = items.map((item: any) => ({
      id: item.id,
      title: item.name,
      poster: item.cover,
      year: new Date(item.update_time || Date.now()).getFullYear().toString(),
      type_name: '短剧',
      desc: item.description || '',
      url: '',
      douban_id: 0,
      score: item.score || 0,
      eps: 1,
    }));

    allResults = formattedResults;
    hasMore = data.currentPage < data.totalPages;

    // 过滤重复项
    const uniqueResults = Array.from(
      new Map(allResults.map((item) => [item.id, item])).values()
    );

    // 构建返回数据
    const result = {
      code: 200,
      message: 'success',
      results: uniqueResults,
      total: uniqueResults.length,
      page,
      limit,
      hasMore,
    };

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, max-age=300',
        Vary: 'Accept-Encoding, User-Agent',
      },
    });
  } catch (error) {
    console.error('📺 [短剧API] 错误:', error);
    return NextResponse.json(
      {
        error: '获取短剧数据失败',
        message: error instanceof Error ? error.message : '未知错误',
        code: 500,
      },
      { status: 500 }
    );
  }
}
