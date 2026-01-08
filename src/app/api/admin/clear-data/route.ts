/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 只有管理员可以清除所有数据
  const username = authInfo.username;
  const adminUsername = process.env.USERNAME || 'admin';

  if (username !== adminUsername) {
    return NextResponse.json(
      { error: '仅支持管理员清除所有数据' },
      { status: 401 }
    );
  }

  try {
    // 调用db的clearAllData方法清除所有数据
    await db.clearAllData();

    return NextResponse.json(
      {
        ok: true,
        message: '所有数据已成功清除',
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: '清除数据失败',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
