import { NextRequest } from 'next/server';

// JWT相关常量
let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  // 使用Web Crypto API生成随机密钥
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  JWT_SECRET = Array.from(array, (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('');
}
const JWT_EXPIRATION = 3600 * 24; // 24小时

// JWT Payload接口
export interface JWTPayload {
  username: string;
  role: 'owner' | 'admin' | 'user';
  exp: number;
  iat: number;
}

// 生成JWT令牌
export async function generateJWT(
  username: string,
  role: 'owner' | 'admin' | 'user'
): Promise<string> {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + JWT_EXPIRATION;

  const payload = {
    username,
    role,
    exp,
    iat,
  };

  // 简单的JWT实现，使用HS256算法
  const header = Buffer.from(
    JSON.stringify({ alg: 'HS256', typ: 'JWT' })
  ).toString('base64url');
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');

  // 使用Web Crypto API生成签名
  const encoder = new TextEncoder();
  const keyData = encoder.encode(JWT_SECRET);
  const messageData = encoder.encode(`${header}.${payloadStr}`);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', key, messageData);

  // 将ArrayBuffer转换为base64url
  const signature = Buffer.from(signatureBuffer).toString('base64url');

  return `${header}.${payloadStr}.${signature}`;
}

// 验证JWT令牌
export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const [header, payloadStr, signature] = token.split('.');

    // 使用Web Crypto API验证签名
    const encoder = new TextEncoder();
    const keyData = encoder.encode(JWT_SECRET);
    const messageData = encoder.encode(`${header}.${payloadStr}`);

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signatureBuffer = Buffer.from(signature, 'base64url');
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBuffer,
      messageData
    );

    if (!isValid) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(payloadStr, 'base64url').toString()
    ) as JWTPayload;

    // 检查令牌是否过期
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch (error) {
    return null;
  }
}

// 从cookie获取认证信息 (服务端使用)
export async function getAuthInfoFromCookie(request: NextRequest): Promise<{
  token?: string;
  username?: string;
  role?: 'owner' | 'admin' | 'user';
  password?: string;
  signature?: string;
} | null> {
  const authCookie = request.cookies.get('auth');

  if (!authCookie) {
    return null;
  }

  try {
    const decoded = decodeURIComponent(authCookie.value);
    const authData = JSON.parse(decoded);

    // 如果有token，验证并提取信息
    if (authData.token) {
      const payload = await verifyJWT(authData.token);
      if (payload) {
        return {
          token: authData.token,
          username: payload.username,
          role: payload.role,
        };
      }
      return null;
    }

    return authData;
  } catch (error) {
    return null;
  }
}

// 从cookie获取认证信息 (客户端使用)
export async function getAuthInfoFromBrowserCookie(): Promise<{
  token?: string;
  username?: string;
  role?: 'owner' | 'admin' | 'user';
  password?: string;
  signature?: string;
} | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    // 解析 document.cookie
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const trimmed = cookie.trim();
      const firstEqualIndex = trimmed.indexOf('=');

      if (firstEqualIndex > 0) {
        const key = trimmed.substring(0, firstEqualIndex);
        const value = trimmed.substring(firstEqualIndex + 1);
        if (key && value) {
          acc[key] = value;
        }
      }

      return acc;
    }, {} as Record<string, string>);

    const authCookie = cookies['auth'];
    if (!authCookie) {
      return null;
    }

    // 处理可能的双重编码
    let decoded = decodeURIComponent(authCookie);

    // 如果解码后仍然包含 %，说明是双重编码，需要再次解码
    if (decoded.includes('%')) {
      decoded = decodeURIComponent(decoded);
    }

    const authData = JSON.parse(decoded);

    // 如果有token，验证并提取信息
    if (authData.token) {
      const payload = await verifyJWT(authData.token);
      if (payload) {
        return {
          token: authData.token,
          username: payload.username,
          role: payload.role,
        };
      }
      return null;
    }

    return authData;
  } catch (error) {
    return null;
  }
}
