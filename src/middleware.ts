/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 跳过不需要认证的路径
  if (shouldSkipAuth(pathname)) {
    return NextResponse.next();
  }

  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';

  if (!process.env.PASSWORD) {
    // 如果没有设置密码，重定向到警告页面
    const warningUrl = new URL('/warning', request.url);
    return NextResponse.redirect(warningUrl);
  }

  // 从cookie获取认证信息
  const authInfo = getAuthInfoFromCookie(request);

  if (!authInfo) {
    return handleAuthFailure(request, pathname);
  }

  // 如果有token，已经在getAuthInfoFromCookie中验证过了
  if (authInfo.token) {
    return NextResponse.next();
  }

  // 兼容旧的认证方式
  // localstorage模式：在middleware中完成验证
  if (storageType === 'localstorage') {
    if (!authInfo.password || authInfo.password !== process.env.PASSWORD) {
      return handleAuthFailure(request, pathname);
    }
    return NextResponse.next();
  }

  // 其他模式：只验证签名
  // 检查是否有用户名（非localStorage模式下密码不存储在cookie中）
  if (!authInfo.username || !authInfo.signature) {
    return handleAuthFailure(request, pathname);
  }

  // 验证签名（如果存在）
  if (authInfo.signature) {
    const isValidSignature = verifySignature(
      authInfo.username,
      authInfo.signature,
      process.env.PASSWORD || ''
    );

    // 签名验证通过即可
    if (isValidSignature) {
      return NextResponse.next();
    }
  }

  // 签名验证失败或不存在签名
  return handleAuthFailure(request, pathname);
}

// 验证签名
function verifySignature(
  data: string,
  signature: string,
  secret: string
): boolean {
  try {
    // 使用简单的同步HMAC实现验证签名
    const expectedSignature = simpleHmacSha256(data, secret);
    return signature === expectedSignature;
  } catch (error) {
    console.error('签名验证失败:', error);
    return false;
  }
}

// 简单的同步HMAC SHA256实现
function simpleHmacSha256(data: string, secret: string): string {
  // 这是一个简化的HMAC SHA256实现，仅用于演示
  // 在实际生产环境中，应该使用标准的加密库
  // 这里我们只返回一个简单的哈希，用于测试目的
  const combined = `${secret}${data}${secret}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // 转换为十六进制字符串
  return hash.toString(16);
}

// 处理认证失败的情况
function handleAuthFailure(
  request: NextRequest,
  pathname: string
): NextResponse {
  // 如果是 API 路由，返回 401 状态码
  if (pathname.startsWith('/api')) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // 否则重定向到登录页面
  const loginUrl = new URL('/login', request.url);
  // 保留完整的URL，包括查询参数
  const fullUrl = `${pathname}${request.nextUrl.search}`;
  loginUrl.searchParams.set('redirect', fullUrl);
  return NextResponse.redirect(loginUrl);
}

// 判断是否需要跳过认证的路径
function shouldSkipAuth(pathname: string): boolean {
  const skipPaths = [
    '/_next',
    '/favicon.ico',
    '/robots.txt',
    '/manifest.json',
    '/icons/',
    '/logo.png',
    '/screenshot.png',
  ];

  return skipPaths.some((path) => pathname.startsWith(path));
}

// 配置middleware匹配规则
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|login|register|warning|api/login|api/register|api/logout|api/cron|api/server-config|api/short-drama).*)',
  ],
};
