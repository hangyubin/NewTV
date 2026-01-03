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
    const apiUrl = `https://api.r2afosne.dpdns.org/vod/list?categoryId=${categoryId}&page=${page}&size=${limit}`;
    
    console.log('📺 [短剧API] 调用外部短剧API:', apiUrl);
    
    // 实现重试机制，处理IP限制等临时问题
    const maxRetries = 3;
    const retryDelay = 1000; // 1秒
    let retryCount = 0;
    let success = false;
    
    while (retryCount < maxRetries && !success) {
      try {
        retryCount++;
        console.log(`📺 [短剧API] 发起外部API请求 (重试 ${retryCount}/${maxRetries})...`);
        
        // 使用AbortController实现超时功能
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.error('📺 [短剧API] 外部API调用超时');
          controller.abort();
        }, 10000);
        
        const response = await fetch(apiUrl, {
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
          success = true;
        } else {
          console.error('📺 [短剧API] 外部API返回错误状态:', response.status);
          // 尝试获取错误响应的内容
          const errorText = await response.text();
          console.error('📺 [短剧API] 错误响应内容:', errorText);
          
          // 检查是否是IP限制错误（通常是429 Too Many Requests或503 Service Unavailable）
          if (response.status === 429 || response.status === 503) {
            console.warn(`📺 [短剧API] 可能遇到IP限制，正在重试... (${retryCount}/${maxRetries})`);
            if (retryCount < maxRetries) {
              // 指数退避重试
              const delay = retryDelay * Math.pow(2, retryCount - 1);
              console.log(`📺 [短剧API] 等待 ${delay}ms 后重试...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            } else {
              console.error('📺 [短剧API] 达到最大重试次数，返回空数组');
              allResults = [];
              hasMore = false;
            }
          } else {
            // 其他错误，直接返回空数组
            console.error('📺 [短剧API] 外部API返回错误，返回空数组');
            allResults = [];
            hasMore = false;
            success = true; // 不再重试
          }
        }
      } catch (externalError) {
        // 确保externalError是Error类型
        const error = externalError instanceof Error ? externalError : new Error(String(externalError));
        console.error('📺 [短剧API] 调用外部API失败:', {
          retry: retryCount,
          name: error.name,
          message: error.message,
          stack: error.stack,
        });
        
        // 检查是否是网络错误或超时，这些情况可以重试
        if ((error.name === 'AbortError' || error.name === 'FetchError' || error.message.includes('NetworkError') || error.message.includes('fetch failed')) && retryCount < maxRetries) {
          console.warn(`📺 [短剧API] 网络错误，正在重试... (${retryCount}/${maxRetries})`);
          // 指数退避重试
          const delay = retryDelay * Math.pow(2, retryCount - 1);
          console.log(`📺 [短剧API] 等待 ${delay}ms 后重试...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          console.error('📺 [短剧API] 达到最大重试次数或遇到不可重试错误，返回空数组');
          allResults = [];
          hasMore = false;
          success = true; // 不再重试
        }
      }
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
      { status: 200 }
    );
  }
}
