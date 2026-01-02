// 用户代理池
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
];

// 请求限制器 - 进一步优化用户体验
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 500; // 减少到500ms，更快响应

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// 智能延时：根据URL类型调整延时
function getSmartDelay(url: string): { min: number; max: number } {
  // 移动端API通常更宽松，可以减少延时
  if (url.includes('m.douban.com')) {
    return { min: 100, max: 400 }; // 移动端API：100-400ms
  }
  // 桌面端API需要更谨慎
  if (url.includes('movie.douban.com')) {
    return { min: 300, max: 800 }; // 桌面端API：300-800ms
  }
  return { min: 200, max: 500 }; // 默认：200-500ms
}

function smartRandomDelay(url: string): Promise<void> {
  const { min, max } = getSmartDelay(url);
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * 通用的豆瓣数据获取函数
 * @param url 请求的URL
 * @returns Promise<T> 返回指定类型的数据
 */
export async function fetchDoubanData<T>(url: string): Promise<T> {
  // 请求限流：确保请求间隔
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise((resolve) =>
      setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest)
    );
  }
  lastRequestTime = Date.now();

  // 智能延时：根据API类型调整
  await smartRandomDelay(url);

  // 添加超时控制
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 增加超时时间到15秒，提高成功率

  // 设置请求选项
  const fetchOptions = {
    signal: controller.signal,
    headers: {
      'User-Agent': getRandomUserAgent(),
      Accept: 'application/json, text/plain, */*',
      Referer: 'https://movie.douban.com/',
      Origin: 'https://movie.douban.com', // 固定添加Origin，提高请求成功率
      // 添加额外的 headers 以模拟真实浏览器请求
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      Connection: 'keep-alive',
      DNT: '1',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'cross-site',
    },
    // 添加重定向处理
    redirect: 'follow' as RequestRedirect,
    // 添加缓存控制
    cache: 'no-cache' as RequestCache,
  };

  // 备用URL列表
  const alternativeUrls = [
    url, // 原始URL
    url.replace('movie.douban.com', 'm.douban.com'), // 移动版URL
    url.replace('movie.douban.com', 'movie.douban.cmliussss.net'), // CDN代理URL
    url.replace('movie.douban.com', 'movie.douban.cmliussss.com'), // 另一个CDN代理URL
  ];

  // 去重备用URL（兼容ES5）
  const uniqueUrls: string[] = [];
  const seenUrls: Record<string, boolean> = {};
  for (const url of alternativeUrls) {
    if (!seenUrls[url]) {
      seenUrls[url] = true;
      uniqueUrls.push(url);
    }
  }

  for (let i = 0; i < uniqueUrls.length; i++) {
    const currentUrl = uniqueUrls[i];

    try {
      console.log(
        `Attempt ${i + 1}/${
          uniqueUrls.length
        }: Fetching from URL: ${currentUrl}`
      );
      const response = await fetch(currentUrl, fetchOptions);
      clearTimeout(timeoutId);

      console.log(`Response status: ${response.status} for URL: ${currentUrl}`);

      if (response.ok) {
        const data = await response.json();
        console.log(`Successfully fetched data from: ${currentUrl}`);

        // 验证返回的数据是否有效
        if (data && (data.items || data.subjects || data.total > 0)) {
          return data;
        } else {
          console.warn(
            `Received empty or invalid data from ${currentUrl}, trying next URL...`
          );
          continue;
        }
      } else {
        // 处理HTTP错误
        const errorText = await response.text();
        console.error(`HTTP error details for ${currentUrl}: ${errorText}`);

        // 如果不是最后一个URL，继续尝试下一个
        if (i < uniqueUrls.length - 1) {
          console.log(`Trying next URL for: ${currentUrl}`);
          continue;
        }

        // 如果是最后一个URL，抛出错误
        throw new Error(
          `HTTP error! Status: ${response.status}, Details: ${errorText}`
        );
      }
    } catch (error) {
      clearTimeout(timeoutId);

      // 如果不是最后一个URL，继续尝试下一个
      if (i < uniqueUrls.length - 1) {
        console.error(
          `Error fetching data from ${currentUrl}, trying next URL...`,
          error
        );
        continue;
      }

      // 如果是最后一个URL，抛出错误
      console.error(`All attempts failed for URL: ${url}`, error);

      // 对于特定错误，可以提供更详细的错误信息
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(
            `请求超时！尝试了 ${uniqueUrls.length} 个URL: ${uniqueUrls.join(
              ', '
            )}`
          );
        } else if (
          error.message.includes('NetworkError') ||
          error.message.includes('fetch failed')
        ) {
          throw new Error(
            `网络错误！请检查网络连接。尝试了 ${
              uniqueUrls.length
            } 个URL: ${uniqueUrls.join(', ')}`
          );
        }
      }

      throw error;
    }
  }

  // 理论上不会到达这里，因为循环中要么返回数据，要么抛出错误
  throw new Error(`All attempts failed for URL: ${url}`);
}
