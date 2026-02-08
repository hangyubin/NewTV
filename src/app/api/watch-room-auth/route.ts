import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * 获取观影室认证信息
 * GET /api/watch-room-auth
 */
export async function GET() {
  try {
    // 从环境变量读取观影室认证信息
    const externalServerAuth = process.env.WATCH_ROOM_EXTERNAL_SERVER_AUTH;

    if (!externalServerAuth) {
      return NextResponse.json({ error: '认证信息未配置' }, { status: 400 });
    }

    return NextResponse.json({
      externalServerAuth,
    });
  } catch (error) {
    console.error('获取观影室认证信息失败:', error);
    return NextResponse.json({ error: '获取认证信息失败' }, { status: 500 });
  }
}
