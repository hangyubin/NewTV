/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getConfig } from '@/lib/config';
import { CURRENT_VERSION } from '@/lib/version';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const config = await getConfig();
    const result = {
      SiteName: config.SiteConfig.SiteName,
      StorageType: process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage',
      Version: CURRENT_VERSION,
      WatchRoom: config.SiteConfig.WatchRoom,
    };
    return NextResponse.json(result);
  } catch (error) {
    // 数据库连接失败时返回默认配置
    const defaultResult = {
      SiteName: process.env.NEXT_PUBLIC_SITE_NAME || 'NewTV',
      StorageType: process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage',
      Version: CURRENT_VERSION,
      WatchRoom: {
        enabled: process.env.NEXT_PUBLIC_WATCH_ROOM_ENABLED === 'true',
        serverType: (process.env.NEXT_PUBLIC_WATCH_ROOM_SERVER_TYPE ||
          'internal') as 'internal' | 'external',
        externalServerUrl:
          process.env.NEXT_PUBLIC_WATCH_ROOM_EXTERNAL_URL || '',
      },
    };
    return NextResponse.json(defaultResult);
  }
}
