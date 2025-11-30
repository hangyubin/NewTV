import { NextRequest, NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const config = await getConfig();
    
    // 检查网盘功能是否启用
    if (!config.CloudDiskConfig?.enabled || !config.CloudDiskConfig?.apiUrl) {
      return NextResponse.json(
        { error: '网盘功能未启用或未配置API地址' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('kw');
    
    if (!keyword) {
      return NextResponse.json(
        { error: '缺少搜索关键词' },
        { status: 400 }
      );
    }

    // 构建搜索URL
    const searchUrl = `${config.CloudDiskConfig.apiUrl}/api/search?kw=${encodeURIComponent(keyword)}&cloud_types=quark,baidu`;
    
    // 调用外部API
    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`);
    }

    const data = await response.json();
    
    // 验证响应数据结构
    if (!data || typeof data !== 'object') {
      throw new Error('外部API返回了无效的数据格式');
    }

    // 确保返回的数据结构正确
    const validatedData = {
      code: data.code || 0,
      message: data.message || 'success',
      data: {
        total: data.data?.total || 0,
        merged_by_type: {
          baidu: Array.isArray(data.data?.merged_by_type?.baidu) ? data.data.merged_by_type.baidu : [],
          quark: Array.isArray(data.data?.merged_by_type?.quark) ? data.data.merged_by_type.quark : []
        }
      }
    };
    
    return NextResponse.json(validatedData, {
      headers: {
        'Cache-Control': 'public, max-age=300', // 缓存5分钟
      },
    });
  } catch (error) {
    console.error('网盘搜索失败:', error);
    return NextResponse.json(
      {
        error: '搜索失败',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
