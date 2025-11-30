import { NextRequest, NextResponse } from 'next/server';
import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { db } from '@/lib/db';
import { DanmakuConfig } from '@/lib/types';

export const runtime = 'nodejs';

/**
 * GET /api/danmaku-config
 * 获取用户的弹幕配置
 */
export async function GET(request: NextRequest) {
  try {
    // 从 cookie 获取用户信息
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await getConfig();
    if (authInfo.username !== process.env.ADMIN_USERNAME) {
      // 非站长，检查用户存在或被封禁
      const user = config.UserConfig.Users.find(
        (u) => u.username === authInfo.username
      );
      if (!user) {
        return NextResponse.json({ error: '用户不存在' }, { status: 401 });
      }
      if (user.banned) {
        return NextResponse.json({ error: '用户已被封禁' }, { status: 401 });
      }
    }

    const danmakuConfig = await db.getDanmakuConfig(authInfo.username);
    return NextResponse.json(danmakuConfig, { status: 200 });
  } catch (err) {
    console.error('获取弹幕配置失败', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/danmaku-config
 * body: { config: DanmakuConfig }
 */
export async function POST(request: NextRequest) {
  try {
    // 从 cookie 获取用户信息
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await getConfig();
    if (authInfo.username !== process.env.ADMIN_USERNAME) {
      // 非站长，检查用户存在或被封禁
      const user = config.UserConfig.Users.find(
        (u) => u.username === authInfo.username
      );
      if (!user) {
        return NextResponse.json({ error: '用户不存在' }, { status: 401 });
      }
      if (user.banned) {
        return NextResponse.json({ error: '用户已被封禁' }, { status: 401 });
      }
    }

    const body = await request.json();
    const { config: danmakuConfig }: { config: DanmakuConfig } = body;

    if (!danmakuConfig) {
      return NextResponse.json(
        { error: 'Missing danmaku config' },
        { status: 400 }
      );
    }

    // 验证弹幕配置数据
    if (typeof danmakuConfig.externalDanmuEnabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid danmaku config data' },
        { status: 400 }
      );
    }

    await db.saveDanmakuConfig(authInfo.username, danmakuConfig);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('保存弹幕配置失败', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/danmaku-config
 * 删除用户的弹幕配置
 */
export async function DELETE(request: NextRequest) {
  try {
    // 从 cookie 获取用户信息
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await getConfig();
    if (authInfo.username !== process.env.ADMIN_USERNAME) {
      // 非站长，检查用户存在或被封禁
      const user = config.UserConfig.Users.find(
        (u) => u.username === authInfo.username
      );
      if (!user) {
        return NextResponse.json({ error: '用户不存在' }, { status: 401 });
      }
      if (user.banned) {
        return NextResponse.json({ error: '用户已被封禁' }, { status: 401 });
      }
    }

    await db.deleteDanmakuConfig(authInfo.username);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('删除弹幕配置失败', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}