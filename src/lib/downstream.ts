/* eslint-disable @typescript-eslint/no-explicit-any */

import { API_CONFIG, ApiSite } from '@/lib/config';
import { getCachedSearchPage, setCachedSearchPage } from '@/lib/search-cache';
import { SearchResult } from '@/lib/types';
import { cleanHtmlTags } from '@/lib/utils';

interface ApiSearchItem {
  vod_id: string;
  vod_name: string;
  vod_pic: string;
  vod_remarks?: string;
  vod_play_url?: string;
  vod_class?: string;
  vod_year?: string;
  vod_content?: string;
  vod_douban_id?: number;
  type_name?: string;
}

/**
 * 通用的带缓存搜索函数
 */
async function searchWithCache(
  apiSite: ApiSite,
  query: string,
  page: number,
  url: string,
  timeoutMs = 20000 // 增加超时时间到20秒
): Promise<{ results: SearchResult[]; pageCount?: number }> {
  // 先查缓存
  const cached = getCachedSearchPage(apiSite.key, query, page);
  if (cached) {
    if (cached.status === 'ok') {
      return { results: cached.data, pageCount: cached.pageCount };
    } else {
      return { results: [] };
    }
  }

  // 重试机制配置
  const MAX_RETRIES = 2;
  const RETRY_DELAY = 500; // 初始重试延迟

  // 缓存未命中，发起网络请求，带重试机制
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        headers: API_CONFIG.search.headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 403) {
          setCachedSearchPage(apiSite.key, query, page, 'forbidden', []);
          return { results: [] };
        }

        // 非403错误，尝试重试
        if (attempt < MAX_RETRIES) {
          // 指数退避：每次重试延迟翻倍
          const delay = RETRY_DELAY * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        return { results: [] };
      }

      const data = await response.json();
      if (
        !data ||
        !data.list ||
        !Array.isArray(data.list) ||
        data.list.length === 0
      ) {
        // 空结果不做负缓存要求，这里不写入缓存
        return { results: [] };
      }

      // 处理结果数据
      const allResults = data.list.map((item: ApiSearchItem) => {
        let episodes: string[] = [];
        let titles: string[] = [];

        // 使用正则表达式从 vod_play_url 提取 m3u8 链接
        if (item.vod_play_url) {
          // 先用 $$$ 分割
          const vod_play_url_array = item.vod_play_url.split('$$$');
          // 分集之间#分割，标题和播放链接 $ 分割
          vod_play_url_array.forEach((url: string) => {
            const matchEpisodes: string[] = [];
            const matchTitles: string[] = [];
            const title_url_array = url.split('#');
            title_url_array.forEach((title_url: string) => {
              const episode_title_url = title_url.split('$');
              if (
                episode_title_url.length === 2 &&
                episode_title_url[1].endsWith('.m3u8')
              ) {
                matchTitles.push(episode_title_url[0]);
                matchEpisodes.push(episode_title_url[1]);
              }
            });
            if (matchEpisodes.length > episodes.length) {
              episodes = matchEpisodes;
              titles = matchTitles;
            }
          });
        }

        return {
          id: item.vod_id.toString(),
          title: item.vod_name.trim().replace(/\s+/g, ' '),
          poster: item.vod_pic,
          episodes,
          episodes_titles: titles,
          source: apiSite.key,
          source_name: apiSite.name,
          class: item.vod_class,
          year: item.vod_year
            ? item.vod_year.match(/\d{4}/)?.[0] || ''
            : 'unknown',
          desc: cleanHtmlTags(item.vod_content || ''),
          type_name: item.type_name,
          douban_id: item.vod_douban_id,
        };
      });

      // 对于短剧API，返回所有结果，让调用者来过滤真正的短剧
      // 这样可以确保获取到最多的结果，然后在短剧API中统一过滤
      let results = allResults;

      // 在每个API站点返回的数据中也进行去重处理，但保留更多内容
      const seenItems = new Set<string>();
      const uniqueResults: SearchResult[] = [];

      for (const result of results) {
        // 使用源+ID+标题前15个字符作为唯一标识，允许不同源的同一部剧存在
        const uniqueKey = `${result.source}_${result.id}_${result.title.slice(
          0,
          15
        )}`;
        if (!seenItems.has(uniqueKey)) {
          seenItems.add(uniqueKey);
          uniqueResults.push(result);
        }
      }

      results = uniqueResults;

      const pageCount = page === 1 ? data.pagecount || 1 : undefined;
      // 写入缓存（成功）
      setCachedSearchPage(apiSite.key, query, page, 'ok', results, pageCount);
      return { results, pageCount };
    } catch (error: any) {
      clearTimeout(timeoutId);
      // 识别被 AbortController 中止（超时）
      const aborted =
        error?.name === 'AbortError' ||
        error?.code === 20 ||
        error?.message?.includes('aborted');

      if (aborted) {
        // 超时错误，尝试重试
        if (attempt < MAX_RETRIES) {
          // 指数退避：每次重试延迟翻倍
          const delay = RETRY_DELAY * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        setCachedSearchPage(apiSite.key, query, page, 'timeout', []);
      }

      // 其他错误，尝试重试
      if (attempt < MAX_RETRIES) {
        // 指数退避：每次重试延迟翻倍
        const delay = RETRY_DELAY * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      return { results: [] };
    }
  }

  // 理论上不会执行到这里
  return { results: [] };
}

export async function searchFromApi(
  apiSite: ApiSite,
  query: string
): Promise<SearchResult[]> {
  try {
    const apiBaseUrl = apiSite.api;

    // 智能搜索：优化短剧关键词策略，减少不必要的请求，提高效率
    let searchVariants = [];

    // 对于所有查询，使用简化的搜索变体，减少变体数量
    // 只使用原始查询，减少请求数量
    searchVariants = [query];
    
    const results: SearchResult[] = [];

    // 遍历所有搜索变体，获取更多结果
    const seenIds = new Set<string>(); // 用于去重

    for (let i = 0; i < searchVariants.length; i++) {
      const variant = searchVariants[i];

      // 根据不同API源使用不同的请求格式
      let apiUrl;
      if (
        apiBaseUrl.includes('iqiyizyapi.com') ||
        apiBaseUrl.includes('caiji.dbzy5.com') ||
        apiBaseUrl.includes('caiji.dyttzyapi.com') ||
        apiBaseUrl.includes('wwzy.tv') ||
        apiBaseUrl.includes('tyyszy.com') ||
        apiBaseUrl.includes('api.52zyapi.com') ||
        apiBaseUrl.includes('api.yhdm.so')
      ) {
        // 新的短剧API源，使用不同的请求格式，平衡数据量和性能
        // 对于所有查询，使用统一的请求格式，避免分类参数不被支持的问题
        apiUrl = `${apiBaseUrl}?ac=videolist&wd=${encodeURIComponent(
          variant
        )}&limit=50`; // 每页返回50条结果，平衡数据量和性能
      } else {
        // 传统API源，使用原有格式
        apiUrl = apiBaseUrl + API_CONFIG.search.path + encodeURIComponent(variant);
      }

      try {
        // 使用新的缓存搜索函数处理第一页，增加超时时间适应本地Docker环境
        const firstPageResult = await searchWithCache(
          apiSite,
          variant,
          1,
          apiUrl,
          10000 // 调整超时时间为10秒，避免过多超时
        );

        // 无论结果多少，都添加到结果列表中
        // 去重添加结果
        firstPageResult.results.forEach((result) => {
          const uniqueKey = `${result.source}_${result.id}`;
          if (!seenIds.has(uniqueKey)) {
            seenIds.add(uniqueKey);
            results.push(result);
          }
        });

        

        // 不停止搜索，继续遍历所有变体获取更多结果
      } catch (error) {
        // 忽略搜索变体失败，继续尝试下一个
      }
    }

    // 返回所有找到的结果，即使数量为0
    return results;
  } catch (error) {
    return [];
  }
}

// 匹配 m3u8 链接的正则
const M3U8_PATTERN = /(https?:\/\/[^"'\s]+?\.m3u8)/g;

export async function getDetailFromApi(
  apiSite: ApiSite,
  id: string
): Promise<SearchResult> {
  if (apiSite.detail) {
    return handleSpecialSourceDetail(id, apiSite);
  }

  const detailUrl = `${apiSite.api}${API_CONFIG.detail.path}${id}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  const response = await fetch(detailUrl, {
    headers: API_CONFIG.detail.headers,
    signal: controller.signal,
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    throw new Error(`详情请求失败: ${response.status}`);
  }

  const data = await response.json();

  if (
    !data ||
    !data.list ||
    !Array.isArray(data.list) ||
    data.list.length === 0
  ) {
    throw new Error('获取到的详情内容无效');
  }

  const videoDetail = data.list[0];
  let episodes: string[] = [];
  let titles: string[] = [];

  // 处理播放源拆分
  if (videoDetail.vod_play_url) {
    // 先用 $$$ 分割
    const vod_play_url_array = videoDetail.vod_play_url.split('$$$');
    // 分集之间#分割，标题和播放链接 $ 分割
    vod_play_url_array.forEach((url: string) => {
      const matchEpisodes: string[] = [];
      const matchTitles: string[] = [];
      const title_url_array = url.split('#');
      title_url_array.forEach((title_url: string) => {
        const episode_title_url = title_url.split('$');
        if (
          episode_title_url.length === 2 &&
          episode_title_url[1].endsWith('.m3u8')
        ) {
          matchTitles.push(episode_title_url[0]);
          matchEpisodes.push(episode_title_url[1]);
        }
      });
      if (matchEpisodes.length > episodes.length) {
        episodes = matchEpisodes;
        titles = matchTitles;
      }
    });
  }

  // 如果播放源为空，则尝试从内容中解析 m3u8
  if (episodes.length === 0 && videoDetail.vod_content) {
    const matches = videoDetail.vod_content.match(M3U8_PATTERN) || [];
    episodes = matches.map((link: string) => link.replace(/^\$/, ''));
  }

  return {
    id: id.toString(),
    title: videoDetail.vod_name,
    poster: videoDetail.vod_pic,
    episodes,
    episodes_titles: titles,
    source: apiSite.key,
    source_name: apiSite.name,
    class: videoDetail.vod_class,
    year: videoDetail.vod_year
      ? videoDetail.vod_year.match(/\d{4}/)?.[0] || ''
      : 'unknown',
    desc: cleanHtmlTags(videoDetail.vod_content),
    type_name: videoDetail.type_name,
    douban_id: videoDetail.vod_douban_id,
  };
}

async function handleSpecialSourceDetail(
  id: string,
  apiSite: ApiSite
): Promise<SearchResult> {
  const detailUrl = `${apiSite.detail}/index.php/vod/detail/id/${id}.html`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  const response = await fetch(detailUrl, {
    headers: API_CONFIG.detail.headers,
    signal: controller.signal,
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    throw new Error(`详情页请求失败: ${response.status}`);
  }

  const html = await response.text();
  let matches: string[] = [];

  if (apiSite.key === 'ffzy') {
    const ffzyPattern =
      /\$(https?:\/\/[^"'\s]+?\/\d{8}\/\d+_[a-f0-9]+\/index\.m3u8)/g;
    matches = html.match(ffzyPattern) || [];
  }

  if (matches.length === 0) {
    const generalPattern = /\$(https?:\/\/[^"'\s]+?\.m3u8)/g;
    matches = html.match(generalPattern) || [];
  }

  // 去重并清理链接前缀
  matches = Array.from(new Set(matches)).map((link: string) => {
    link = link.substring(1); // 去掉开头的 $
    const parenIndex = link.indexOf('(');
    return parenIndex > 0 ? link.substring(0, parenIndex) : link;
  });

  // 根据 matches 数量生成剧集标题
  const episodes_titles = Array.from({ length: matches.length }, (_, i) =>
    (i + 1).toString()
  );

  // 提取标题
  const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
  const titleText = titleMatch ? titleMatch[1].trim() : '';

  // 提取描述
  const descMatch = html.match(
    /<div[^>]*class=["']sketch["'][^>]*>([\s\S]*?)<\/div>/
  );
  const descText = descMatch ? cleanHtmlTags(descMatch[1]) : '';

  // 提取封面
  const coverMatch = html.match(/(https?:\/\/[^"'\s]+?\.jpg)/g);
  const coverUrl = coverMatch ? coverMatch[0].trim() : '';

  // 提取年份
  const yearMatch = html.match(/>(\d{4})</);
  const yearText = yearMatch ? yearMatch[1] : 'unknown';

  return {
    id,
    title: titleText,
    poster: coverUrl,
    episodes: matches,
    episodes_titles,
    source: apiSite.key,
    source_name: apiSite.name,
    class: '',
    year: yearText,
    desc: descText,
    type_name: '',
    douban_id: 0,
  };
}
