import { NextRequest, NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';

export async function GET(request: NextRequest) {
  try {
    const config = await getConfig();
    
    // 返回AI配置的公开信息
    const aiConfig = {
      enabled: config.AIConfig?.enabled || false,
      apiUrl: config.AIConfig?.apiUrl || '',
      hasApiKey: !!(config.AIConfig?.apiKey)
    };

    return NextResponse.json(aiConfig);
  } catch (error) {
    console.error('Failed to get AI config:', error);
    return NextResponse.json(
      { error: 'Failed to get AI config' },
      { status: 500 }
    );
  }
}