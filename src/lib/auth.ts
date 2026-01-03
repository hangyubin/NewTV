import { NextRequest } from 'next/server';

// JWT相关常量
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';
const JWT_EXPIRATION = 3600 * 24; // 24小时

// JWT Payload接口
export interface JWTPayload {
  username: string;
  role: 'owner' | 'admin' | 'user';
  exp: number;
  iat: number;
}

// 生成JWT令牌
export function generateJWT(
  username: string,
  role: 'owner' | 'admin' | 'user'
): string {
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

  // 使用简单的同步HMAC实现
  const signature = simpleHmacSha256(`${header}.${payloadStr}`, JWT_SECRET);

  return `${header}.${payloadStr}.${signature}`;
}

// 验证JWT令牌
export function verifyJWT(token: string): JWTPayload | null {
  try {
    const [header, payloadStr, signature] = token.split('.');

    // 使用简单的同步HMAC实现验证签名
    const expectedSignature = simpleHmacSha256(
      `${header}.${payloadStr}`,
      JWT_SECRET
    );

    if (signature !== expectedSignature) {
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

// 简单的同步HMAC SHA256实现
function simpleHmacSha256(data: string, secret: string): string {
  // 这是一个简化的HMAC SHA256实现，仅用于演示
  // 在实际生产环境中，应该使用标准的加密库
  // 这里我们只返回一个简单的哈希，用于测试目的
  const combined = `${secret}${data}${secret}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // 转换为base64url
  return Buffer.from(hash.toString()).toString('base64url');
}

// 从cookie获取认证信息 (服务端使用)
export function getAuthInfoFromCookie(request: NextRequest): {
  token?: string;
  username?: string;
  role?: 'owner' | 'admin' | 'user';
  password?: string;
  signature?: string;
} | null {
  const authCookie = request.cookies.get('auth');

  if (!authCookie) {
    return null;
  }

  try {
    const decoded = decodeURIComponent(authCookie.value);
    const authData = JSON.parse(decoded);

    // 如果有token，验证并提取信息
    if (authData.token) {
      const payload = verifyJWT(authData.token);
      if (payload) {
        return {
          token: authData.token,
          username: payload.username,
          role: payload.role,
        };
      }
      // token验证失败，仍然返回authData中的用户名和角色
      // 这样即使token过期或无效，也能显示正确的用户名
      return {
        username: authData.username,
        role: authData.role || 'user',
        password: authData.password,
        signature: authData.signature,
      };
    }

    return authData;
  } catch (error) {
    return null;
  }
}

// 从cookie获取认证信息 (客户端使用)
export function getAuthInfoFromBrowserCookie(): {
  token?: string;
  username?: string;
  role?: 'owner' | 'admin' | 'user';
  password?: string;
  signature?: string;
} | null {
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
      const payload = verifyJWT(authData.token);
      if (payload) {
        return {
          token: authData.token,
          username: payload.username,
          role: payload.role,
        };
      }
      // token验证失败，仍然返回authData中的用户名和角色
      // 这样即使token过期或无效，也能显示正确的用户名
      return {
        username: authData.username,
        role: authData.role || 'user',
        password: authData.password,
        signature: authData.signature,
      };
    }

    return authData;
  } catch (error) {
    return null;
  }
}
