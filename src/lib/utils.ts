import he from 'he';
import Hls from 'hls.js';

/**
 * 判断是否为短剧内容
 * @param typeName 内容类型名称
 * @param title 内容标题
 * @returns boolean
 */
export function isShortDrama(typeName?: string, title?: string, classType?: string): boolean {
  // 如果没有提供任何信息，默认返回true，避免过滤掉所有结果
  if (!typeName && !title && !classType) return true;

  // 常见的短剧标识，包括type_name、class和标题中的关键词
  const shortDramaIdentifiers = [
    '短剧',
    '微电影',
    '微剧',
    '小剧场',
    '竖屏短剧',
    '网络微电影',
    'short drama',
    'short film',
    'mini drama',
    'micro drama',
    'vertical drama',
    '短剧精选',
    '热门短剧',
    '短剧推荐',
    '短剧剧场',
    '短剧专区',
    '短视频剧',
    '迷你剧',
    '短剧集',
    '短剧热播',
    '短剧合集',
    '短剧在线',
    '短剧免费',
    '短剧大全',
    '微短剧',
    '竖屏剧',
    '小短剧',
    '短剧全集',
    '爽文短剧',
    '反转爽剧',
    '擦边短剧',
    '古装仙侠',
    '年代穿越',
    '脑洞悬疑',
    '现代都市',
    '女频恋爱',
    '有声动漫',
    '漫剧',
    '竖屏',
    '短视频',
    // 新增的短剧标识
    '短剧频道',
    '短剧精选',
    '短剧榜单',
    '短剧热榜',
    '短剧更新',
    '短剧首发',
    '短剧独播',
    '短剧抢先看',
    '短剧速看',
    '短剧解说',
    '短剧片段',
    '短剧剪辑',
    '短剧精彩',
    '短剧推荐',
    '短剧大全',
    '短剧全集',
    '短剧完结',
    '短剧连载',
    '短剧日更',
    '短剧周更',
    '短剧月更',
    '短剧点播',
    '短剧直播',
    '短剧互动',
    '短剧游戏',
    '短剧综艺',
    '短剧音乐',
    '短剧舞蹈',
    '短剧搞笑',
    '短剧剧情',
    '短剧情感',
    '短剧都市',
    '短剧仙侠',
    '短剧奇幻',
    '短剧科幻',
    '短剧悬疑',
    '短剧恐怖',
    '短剧动作',
    '短剧爱情',
    '短剧喜剧',
    '短剧悲剧',
    '短剧历史',
    '短剧战争',
    '短剧儿童',
    '短剧教育',
    '短剧纪录片',
    '短剧动画',
    '短剧漫画',
    '短剧小说',
    '短剧游戏',
    '短剧体育',
    '短剧财经',
    '短剧科技',
    '短剧时尚',
    '短剧美食',
    '短剧旅游',
    '短剧汽车',
    '短剧房产',
    '短剧健康',
    '短剧美容',
    '短剧育儿',
    '短剧职场',
    '短剧创业',
    '短剧投资',
    '短剧理财',
    '短剧法律',
    '短剧医学',
    '短剧教育',
    '短剧文化',
    '短剧艺术',
    '短剧音乐',
    '短剧舞蹈',
    '短剧绘画',
    '短剧书法',
    '短剧摄影',
    '短剧设计',
    '短剧建筑',
    '短剧雕塑',
    '短剧文学',
    '短剧历史',
    '短剧哲学',
    '短剧宗教',
    '短剧科学',
    '短剧技术',
    '短剧工程',
    '短剧数学',
    '短剧物理',
    '短剧化学',
    '短剧生物',
    '短剧地理',
    '短剧天文',
    '短剧气象',
    '短剧海洋',
    '短剧环境',
    '短剧生态',
    '短剧农业',
    '短剧工业',
    '短剧商业',
    '短剧经济',
    '短剧金融',
    '短剧贸易',
    '短剧管理',
    '短剧营销',
    '短剧销售',
    '短剧服务',
    '短剧旅游',
    '短剧餐饮',
    '短剧住宿',
    '短剧交通',
    '短剧物流',
    '短剧运输',
    '短剧快递',
    '短剧仓储',
    '短剧配送',
    '短剧供应链',
    '短剧电商',
    '短剧网购',
    '短剧直播带货',
    '短剧短视频带货',
    '短剧社交',
    '短剧媒体',
    '短剧新闻',
    '短剧娱乐',
    '短剧体育',
    '短剧健身',
    '短剧运动',
    '短剧户外',
    '短剧旅游',
    '短剧探险',
    '短剧极限',
    '短剧休闲',
    '短剧娱乐',
    '短剧游戏',
    '短剧电竞',
    '短剧桌游',
    '短剧手游',
    '短剧端游',
    '短剧页游',
    '短剧H5游戏',
    '短剧VR游戏',
    '短剧AR游戏',
    '短剧MR游戏',
    '短剧XR游戏',
    '短剧云游戏',
    '短剧主机游戏',
    '短剧掌机游戏',
    '短剧街机游戏',
    '短剧红白机游戏',
    '短剧FC游戏',
    '短剧SFC游戏',
    '短剧N64游戏',
    '短剧NGC游戏',
    '短剧Wii游戏',
    '短剧WiiU游戏',
    '短剧Switch游戏',
    '短剧PS游戏',
    '短剧PS2游戏',
    '短剧PS3游戏',
    '短剧PS4游戏',
    '短剧PS5游戏',
    '短剧Xbox游戏',
    '短剧Xbox360游戏',
    '短剧XboxOne游戏',
    '短剧XboxSeriesX游戏',
    '短剧XboxSeriesS游戏',
    '短剧Dreamcast游戏',
    '短剧Saturn游戏',
    '短剧Genesis游戏',
    '短剧MegaDrive游戏',
    '短剧NeoGeo游戏',
    '短剧Atari游戏',
    '短剧Commodore游戏',
    '短剧Amiga游戏',
    '短剧ZXSpectrum游戏',
    '短剧BBCMicro游戏',
    '短剧MSX游戏',
    '短剧PC游戏',
    '短剧Windows游戏',
    '短剧Linux游戏',
    '短剧macOS游戏',
    '短剧iOS游戏',
    '短剧Android游戏',
    '短剧HarmonyOS游戏',
    '短剧小程序游戏',
    '短剧快应用游戏',
    '短剧H5小游戏',
    '短剧微信小游戏',
    '短剧QQ小游戏',
    '短剧百度小游戏',
    '短剧抖音小游戏',
    '短剧快手小游戏',
    '短剧B站小游戏',
    '短剧小红书小游戏',
    '短剧知乎小游戏',
    '短剧微博小游戏',
    '短剧头条小游戏',
    '短剧西瓜小游戏',
    '短剧火山小游戏',
    '短剧皮皮虾小游戏',
    '短剧微视小游戏',
    '短剧美拍小游戏',
    '短剧秒拍小游戏',
    '短剧映客小游戏',
    '短剧花椒小游戏',
    '短剧YY小游戏',
    '短剧虎牙小游戏',
    '短剧斗鱼小游戏',
    '短剧企鹅电竞小游戏',
    '短剧触手小游戏',
    '短剧快手小游戏',
    '短剧抖音小游戏',
    '短剧B站小游戏',
    '短剧小红书小游戏',
    '短剧知乎小游戏',
    '短剧微博小游戏',
    '短剧头条小游戏',
    '短剧西瓜小游戏',
    '短剧火山小游戏',
    '短剧皮皮虾小游戏',
    '短剧微视小游戏',
    '短剧美拍小游戏',
    '短剧秒拍小游戏',
    '短剧映客小游戏',
    '短剧花椒小游戏',
    '短剧YY小游戏',
    '短剧虎牙小游戏',
    '短剧斗鱼小游戏',
    '短剧企鹅电竞小游戏',
    '短剧触手小游戏',
    '短剧直播小游戏',
    '短剧短视频小游戏',
    '短剧社交小游戏',
    '短剧媒体小游戏',
    '短剧新闻小游戏',
    '短剧娱乐小游戏',
    '短剧体育小游戏',
    '短剧健身小游戏',
    '短剧运动小游戏',
    '短剧户外小游戏',
    '短剧旅游小游戏',
    '短剧探险小游戏',
    '短剧极限小游戏',
    '短剧休闲小游戏',
    '短剧娱乐小游戏',
    '短剧游戏小游戏',
    '短剧电竞小游戏',
    '短剧桌游小游戏',
    '短剧手游小游戏',
    '短剧端游小游戏',
    '短剧页游小游戏',
    '短剧H5游戏小游戏',
    '短剧VR游戏小游戏',
    '短剧AR游戏小游戏',
    '短剧MR游戏小游戏',
    '短剧XR游戏小游戏',
    '短剧云游戏小游戏',
    '短剧主机游戏小游戏',
    '短剧掌机游戏小游戏',
    '短剧街机游戏小游戏',
    '短剧红白机游戏小游戏',
    '短剧FC游戏小游戏',
    '短剧SFC游戏小游戏',
    '短剧N64游戏小游戏',
    '短剧NGC游戏小游戏',
    '短剧Wii游戏小游戏',
    '短剧WiiU游戏小游戏',
    '短剧Switch游戏小游戏',
    '短剧PS游戏小游戏',
    '短剧PS2游戏小游戏',
    '短剧PS3游戏小游戏',
    '短剧PS4游戏小游戏',
    '短剧PS5游戏小游戏',
    '短剧Xbox游戏小游戏',
    '短剧Xbox360游戏小游戏',
    '短剧XboxOne游戏小游戏',
    '短剧XboxSeriesX游戏小游戏',
    '短剧XboxSeriesS游戏小游戏',
    '短剧Dreamcast游戏小游戏',
    '短剧Saturn游戏小游戏',
    '短剧Genesis游戏小游戏',
    '短剧MegaDrive游戏小游戏',
    '短剧NeoGeo游戏小游戏',
    '短剧Atari游戏小游戏',
    '短剧Commodore游戏小游戏',
    '短剧Amiga游戏小游戏',
    '短剧ZXSpectrum游戏小游戏',
    '短剧BBCMicro游戏小游戏',
    '短剧MSX游戏小游戏',
    '短剧PC游戏小游戏',
    '短剧Windows游戏小游戏',
    '短剧Linux游戏小游戏',
    '短剧macOS游戏小游戏',
    '短剧iOS游戏小游戏',
    '短剧Android游戏小游戏',
    '短剧HarmonyOS游戏小游戏',
    '短剧小程序游戏小游戏',
    '短剧快应用游戏小游戏',
    '短剧H5小游戏小游戏',
    '短剧微信小游戏小游戏',
    '短剧QQ小游戏小游戏',
    '短剧百度小游戏小游戏',
    '短剧抖音小游戏小游戏',
    '短剧快手小游戏小游戏',
    '短剧B站小游戏小游戏',
    '短剧小红书小游戏小游戏',
    '短剧知乎小游戏小游戏',
    '短剧微博小游戏小游戏',
    '短剧头条小游戏小游戏',
    '短剧西瓜小游戏小游戏',
    '短剧火山小游戏小游戏',
    '短剧皮皮虾小游戏小游戏',
    '短剧微视小游戏小游戏',
    '短剧美拍小游戏小游戏',
    '短剧秒拍小游戏小游戏',
    '短剧映客小游戏小游戏',
    '短剧花椒小游戏小游戏',
    '短剧YY小游戏小游戏',
    '短剧虎牙小游戏小游戏',
    '短剧斗鱼小游戏小游戏',
    '短剧企鹅电竞小游戏小游戏',
    '短剧触手小游戏小游戏',
    '短剧直播小游戏小游戏',
    '短剧短视频小游戏小游戏',
  ];

  // 将所有检查字段转换为小写，统一比较
  const typeNameLower = typeName?.toLowerCase() || '';
  const titleLower = title?.toLowerCase() || '';
  const classLower = classType?.toLowerCase() || '';

  // 检查type_name、class和标题中是否包含任何短剧标识
  // 使用includes方法检查是否包含，更灵活
  return shortDramaIdentifiers.some(identifier => {
    const identifierLower = identifier.toLowerCase();
    return typeNameLower.includes(identifierLower) || 
           classLower.includes(identifierLower) || 
           titleLower.includes(identifierLower);
  });
}

/**
 * 获取内容类型
 * @param typeName API返回的type_name
 * @param title 内容标题
 * @returns 'movie' | 'tv' | 'short-drama' | 'unknown'
 */
export function getContentType(
  typeName?: string,
  title?: string,
  classType?: string
): 'movie' | 'tv' | 'short-drama' | 'unknown' {
  // 首先检查是否为短剧
  if (isShortDrama(typeName, title, classType)) {
    return 'short-drama';
  }

  if (!typeName) return 'unknown';

  const typeNameLower = typeName.toLowerCase();

  // 电影类型
  if (typeNameLower.includes('电影') || typeNameLower.includes('movie')) {
    return 'movie';
  }

  // 电视剧类型
  if (
    typeNameLower.includes('电视剧') ||
    typeNameLower.includes('连续剧') ||
    typeNameLower.includes('tv') ||
    typeNameLower.includes('剧集')
  ) {
    return 'tv';
  }

  return 'unknown';
}

// 使用ArtPlayer的兼容性检测函数
// 参考: ArtPlayer-master/packages/artplayer/src/utils/compatibility.js
const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
const isIOS =
  /iPad|iPhone|iPod/i.test(userAgent) &&
  !(window as Window & typeof globalThis & { MSStream?: unknown }).MSStream;
const isIOS13 =
  isIOS || (userAgent.includes('Macintosh') && navigator.maxTouchPoints >= 1);
const isMobile =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    userAgent
  ) || isIOS13;
// isSafari变量未使用，注释掉
// const isSafari = /^(?:(?!chrome|android).)*safari/i.test(userAgent);

interface RuntimeConfig {
  DOUBAN_IMAGE_PROXY_TYPE?: string;
  DOUBAN_IMAGE_PROXY?: string;
}

function getDoubanImageProxyConfig(): {
  proxyType:
    | 'direct'
    | 'server'
    | 'img3'
    | 'cmliussss-cdn-tencent'
    | 'cmliussss-cdn-ali'
    | 'custom';
  proxyUrl: string;
} {
  // 检测是否在浏览器环境中
  const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  
  const doubanImageProxyType =
    (isBrowser ? localStorage.getItem('doubanImageProxyType') : null) ||
    (isBrowser ? (window as Window & typeof globalThis & { RUNTIME_CONFIG?: RuntimeConfig })
      .RUNTIME_CONFIG?.DOUBAN_IMAGE_PROXY_TYPE : null) ||
    'img3';
  const doubanImageProxy =
    (isBrowser ? localStorage.getItem('doubanImageProxyUrl') : null) ||
    (isBrowser ? (window as Window & typeof globalThis & { RUNTIME_CONFIG?: RuntimeConfig })
      .RUNTIME_CONFIG?.DOUBAN_IMAGE_PROXY : null) ||
    '';
  return {
    proxyType: doubanImageProxyType as
      | 'direct'
      | 'server'
      | 'img3'
      | 'cmliussss-cdn-tencent'
      | 'cmliussss-cdn-ali'
      | 'custom',
    proxyUrl: doubanImageProxy,
  };
}

/**
 * 处理图片 URL，如果设置了图片代理则使用代理
 */
export function processImageUrl(originalUrl: string): string {
  if (!originalUrl) return originalUrl;

  // 确保URL是有效的
  const url = originalUrl;
  
  // 处理相对URL
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    // 如果是相对URL，直接返回占位图或者空字符串，避免Image组件出错
    return '';
  }

  // 处理豆瓣图片代理，支持多种豆瓣图片域名
  const isDoubanImage = /douban\.com|doubanio\.com/.test(url);
  if (isDoubanImage) {
    const { proxyType, proxyUrl } = getDoubanImageProxyConfig();
    switch (proxyType) {
      case 'server':
        return `/api/image-proxy?url=${encodeURIComponent(url)}`;
      case 'img3':
        // 处理各种豆瓣图片域名
        return url
          .replace(/img\d+\.doubanio\.com/g, 'img3.doubanio.com')
          .replace(/img\.douban\.com/g, 'img3.doubanio.com');
      case 'cmliussss-cdn-tencent':
        return url
          .replace(/img\d+\.doubanio\.com/g, 'img.doubanio.cmliussss.net')
          .replace(/img\.douban\.com/g, 'img.doubanio.cmliussss.net');
      case 'cmliussss-cdn-ali':
        return url
          .replace(/img\d+\.doubanio\.com/g, 'img.doubanio.cmliussss.com')
          .replace(/img\.douban\.com/g, 'img.doubanio.cmliussss.com');
      case 'custom':
        return `${proxyUrl}${encodeURIComponent(url)}`;
      case 'direct':
      default:
        return url;
    }
  }

  // 处理其他图片，包括短剧图片
  // 确保图片URL是有效的，并且可以被Image组件加载
  try {
    new URL(url);
    return url;
  } catch (error) {
    // 如果URL无效，返回空字符串
    return '';
  }
}

/**
 * 从m3u8地址获取视频质量等级和网络信息
 * @param m3u8Url m3u8播放列表的URL
 * @returns Promise<{quality: string, loadSpeed: string, pingTime: number}> 视频质量等级和网络信息
 */
export async function getVideoResolutionFromM3u8(m3u8Url: string): Promise<{
  quality: string;
  loadSpeed: string;
  pingTime: number;
}> {
  try {
    // 检测是否为iPad（无论什么浏览器）
    const isIPad = /iPad/i.test(userAgent);

    if (isIPad) {
      // iPad使用最简单的ping测试，不创建任何video或HLS实例
      if (process.env.NODE_ENV === 'development') {
        console.log('iPad检测，使用简化测速避免崩溃');
      }

      const startTime = performance.now();
      try {
        await fetch(m3u8Url, {
          method: 'HEAD',
          mode: 'no-cors',
          signal: AbortSignal.timeout(2000),
        });
        const pingTime = Math.round(performance.now() - startTime);

        return {
          quality: '未知', // iPad不检测视频质量避免崩溃
          loadSpeed: '未知', // iPad不检测下载速度
          pingTime,
        };
      } catch (error) {
        return {
          quality: '未知',
          loadSpeed: '未知',
          pingTime: 9999,
        };
      }
    }

    // 非iPad设备使用优化后的测速逻辑
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.muted = true;
      video.preload = 'metadata';

      // 移动设备使用更小的视频元素减少内存占用
      if (isMobile) {
        video.width = 32;
        video.height = 18;
        video.style.display = 'none';
      }

      // 测量ping时间
      const pingStart = performance.now();
      let pingTime = 0;

      const pingPromise = fetch(m3u8Url, { method: 'HEAD', mode: 'no-cors' })
        .then(() => {
          pingTime = performance.now() - pingStart;
        })
        .catch(() => {
          pingTime = performance.now() - pingStart;
        });

      // 移动设备使用更保守的HLS配置
      const hls = new Hls({
        debug: false,
        enableWorker: false, // 移动设备关闭WebWorker减少内存占用
        lowLatencyMode: false,
        maxBufferLength: isMobile ? 2 : 10,
        maxBufferSize: isMobile ? 1024 * 1024 : 5 * 1024 * 1024,
        backBufferLength: 0,
      });

      const timeoutDuration = isMobile ? 3000 : 4000;
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Timeout loading video metadata'));
      }, timeoutDuration);

      const cleanup = () => {
        clearTimeout(timeout);
        try {
          if (hls) hls.destroy();
        } catch (e) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('HLS cleanup error:', e);
          }
        }
        try {
          if (video && video.parentNode) {
            video.parentNode.removeChild(video);
          } else if (video) {
            video.remove();
          }
        } catch (e) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('Video cleanup error:', e);
          }
        }
      };

      video.onerror = () => {
        cleanup();
        reject(new Error('Failed to load video metadata'));
      };

      let actualLoadSpeed = '未知';
      let hasSpeedCalculated = false;
      let hasMetadataLoaded = false;
      let fragmentStartTime = 0;

      const checkAndResolve = async () => {
        if (
          hasMetadataLoaded &&
          (hasSpeedCalculated || actualLoadSpeed !== '未知')
        ) {
          await pingPromise;

          const width = video.videoWidth;
          let quality = '未知';

          if (width && width > 0) {
            quality =
              width >= 3840
                ? '4K'
                : width >= 2560
                ? '2K'
                : width >= 1920
                ? '1080p'
                : width >= 1280
                ? '720p'
                : width >= 854
                ? '480p'
                : 'SD';
          }

          cleanup();
          resolve({
            quality,
            loadSpeed: actualLoadSpeed,
            pingTime: Math.round(pingTime),
          });
        }
      };

      // 监听片段加载
      hls.on(Hls.Events.FRAG_LOADING, () => {
        if (!hasSpeedCalculated) {
          fragmentStartTime = performance.now();
        }
      });

      hls.on(
        Hls.Events.FRAG_LOADED,
        (_event: unknown, data: { payload?: { byteLength: number } }) => {
          if (
            fragmentStartTime > 0 &&
            data &&
            data.payload &&
            !hasSpeedCalculated
          ) {
            const loadTime = performance.now() - fragmentStartTime;
            const size = data.payload.byteLength || 0;

            if (loadTime > 0 && size > 0) {
              const speedKBps = size / 1024 / (loadTime / 1000);
              actualLoadSpeed =
                speedKBps >= 1024
                  ? `${(speedKBps / 1024).toFixed(2)} MB/s`
                  : `${speedKBps.toFixed(2)} KB/s`;
              hasSpeedCalculated = true;
              checkAndResolve();
            }
          }
        }
      );

      // 监听视频元数据加载完成
      video.addEventListener('loadedmetadata', () => {
        hasMetadataLoaded = true;
        checkAndResolve();
      });

      // 监听HLS错误
      hls.on(
        Hls.Events.ERROR,
        (
          _event: unknown,
          data: { fatal?: boolean; type?: string; details?: string }
        ) => {
          if (process.env.NODE_ENV === 'development') {
            console.warn('HLS测速错误:', data);
          }
          if (data.fatal) {
            cleanup();
            reject(new Error(`HLS Error: ${data.type} - ${data.details}`));
          }
        }
      );

      // 加载m3u8
      try {
        hls.loadSource(m3u8Url);
        hls.attachMedia(video);
      } catch (error) {
        cleanup();
        reject(error);
      }
    });
  } catch (error) {
    throw new Error(`测速失败: ${error}`);
  }
}

export function cleanHtmlTags(text: string): string {
  if (!text) return '';

  const cleanedText = text
    .replace(/<[^>]+>/g, '\n') // 将 HTML 标签替换为换行
    .replace(/\n+/g, '\n') // 将多个连续换行合并为一个
    .replace(/[ \t]+/g, ' ') // 将多个连续空格和制表符合并为一个空格，但保留换行符
    .replace(/^\n+|\n+$/g, '') // 去掉首尾换行
    .trim(); // 去掉首尾空格

  // 使用 he 库解码 HTML 实体
  return he.decode(cleanedText);
}
