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
    let hasMore = false;

    // 添加Docker环境信息日志
    console.log('📺 [短剧API] 运行环境信息:', {
      DOCKER_ENV: process.env.DOCKER_ENV,
      NODE_ENV: process.env.NODE_ENV,
      HOSTNAME: process.env.HOSTNAME,
      PORT: process.env.PORT,
    });

    // 调用专门的短剧API
    const primaryApiUrl = `https://api.r2afosne.dpdns.org/vod/list?categoryId=${categoryId}&page=${page}&size=${limit}`;
    console.log(`📺 [短剧API] 请求URL: ${primaryApiUrl}`);
    
    // 使用AbortController实现超时功能，增加超时时间到15秒
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.error('📺 [短剧API] 外部API调用超时 (15秒)');
      controller.abort();
    }, 15000);
    
    const response = await fetch(primaryApiUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        Accept: 'application/json, text/plain, */*',
        Referer: 'https://movie.douban.com/',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        Connection: 'keep-alive',
      },
      cache: 'no-store',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    console.log('📺 [短剧API] 收到外部API响应:', response.status);
    
    if (response.ok) {
      console.log('📺 [短剧API] 响应状态正常，解析JSON数据...');
      const data = await response.json();
      console.log('📺 [短剧API] 外部API返回数据:', {
        total: data.total,
        totalPages: data.totalPages,
        currentPage: data.currentPage,
        listLength: data.list?.length || 0
      });
      
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
    } else {
      console.error('📺 [短剧API] 外部API返回错误状态:', response.status);
      // 尝试获取错误响应的内容
      const errorText = await response.text();
      console.error('📺 [短剧API] 错误响应内容:', errorText);
    }

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