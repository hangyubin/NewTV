import { NextRequest, NextResponse } from 'next/server';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const maxResults = searchParams.get('maxResults') || '50';
  const pageToken = searchParams.get('pageToken') || '';

  if (!query) {
    return NextResponse.json(
      { error: '搜索关键词不能为空' },
      { status: 400 }
    );
  }

  if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY === 'demo_key') {
    return NextResponse.json(
      { error: 'YouTube API Key未配置' },
      { status: 500 }
    );
  }

  try {
    // 使用search.list API搜索视频
    const searchUrl = new URL(`${YOUTUBE_API_BASE}/search`);
    searchUrl.searchParams.set('key', YOUTUBE_API_KEY);
    searchUrl.searchParams.set('q', query);
    searchUrl.searchParams.set('part', 'snippet');
    searchUrl.searchParams.set('type', 'video');
    searchUrl.searchParams.set('maxResults', maxResults);
    searchUrl.searchParams.set('order', 'relevance');
    
    if (pageToken) {
      searchUrl.searchParams.set('pageToken', pageToken);
    }

    const response = await fetch(searchUrl.toString());
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('YouTube API搜索失败:', response.status, errorData);
      
      return NextResponse.json(
        { 
          error: '搜索失败',
          details: errorData.error?.message || `HTTP ${response.status}`
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // 转换数据格式，确保与现有视频格式兼容
    const videos = (data.items || []).map((item: any) => ({
      id: { videoId: item.id?.videoId },
      snippet: {
        title: item.snippet?.title,
        description: item.snippet?.description,
        thumbnails: item.snippet?.thumbnails,
        channelTitle: item.snippet?.channelTitle,
        publishedAt: item.snippet?.publishedAt
      }
    })).filter((video: any) => video.id?.videoId); // 过滤掉无效的视频

    return NextResponse.json({
      videos,
      totalResults: data.pageInfo?.totalResults || 0,
      nextPageToken: data.nextPageToken,
      prevPageToken: data.prevPageToken,
      query
    });

  } catch (error) {
    console.error('YouTube搜索API错误:', error);
    return NextResponse.json(
      { error: '搜索服务暂时不可用' },
      { status: 500 }
    );
  }
}