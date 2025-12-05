/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, no-console, @next/next/no-img-element */

'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Hls from 'hls.js';
import { Heart } from 'lucide-react';

// import artplayerPluginChromecast from '@/lib/artplayer-plugin-chromecast';

import {
  deleteFavorite,
  deletePlayRecord,
  deleteSkipConfig,
  generateStorageKey,
  getAllPlayRecords,
  getSkipConfig,
  isFavorited,
  saveFavorite,
  savePlayRecord,
  saveSkipConfig,
  subscribeToDataUpdates,
} from '@/lib/db.client';
import { getAuthInfoFromBrowserCookie } from '@/lib/auth';
import { getDoubanDetails } from '@/lib/douban.client';
import { Favorite, PlayRecord, SearchResult } from '@/lib/types';
import { checkVideoUpdate } from '@/lib/watching-updates';


import { getVideoResolutionFromM3u8, processImageUrl } from '@/lib/utils';

import EpisodeSelector from '@/components/EpisodeSelector';
import PageLayout from '@/components/PageLayout';

// 扩展 HTMLVideoElement 类型以支持 hls 属性
declare global {
  interface HTMLVideoElement {
    hls?: any;
  }
}

// Wake Lock API 类型声明
interface WakeLockSentinel {
  released: boolean;
  release(): Promise<void>;
  addEventListener(type: 'release', listener: () => void): void;
  removeEventListener(type: 'release', listener: () => void): void;
}

function PlayPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // -----------------------------------------------------------------------------  
  // 状态变量（State）
  // -----------------------------------------------------------------------------  
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<
    'searching' | 'preferring' | 'fetching' | 'ready'
  >('searching');
  const [loadingMessage, setLoadingMessage] = useState('正在搜索播放源...');
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<SearchResult | null>(null);

  // 收藏状态
  const [favorited, setFavorited] = useState(false);

  // 豆瓣详情状态
  const [movieDetails, setMovieDetails] = useState<any>(null);
  const [loadingMovieDetails, setLoadingMovieDetails] = useState(false);

  // 跳过片头片尾配置
  const [skipConfig, setSkipConfig] = useState<{
    enable: boolean;
    intro_time: number;
    outro_time: number;
  }>({
    enable: false,
    intro_time: 0,
    outro_time: 0,
  });
  const skipConfigRef = useRef(skipConfig);
  useEffect(() => {
    skipConfigRef.current = skipConfig;
  }, [
    skipConfig,
    skipConfig.enable,
    skipConfig.intro_time,
    skipConfig.outro_time,
  ]);

  // 跳过检查的时间间隔控制
  const lastSkipCheckRef = useRef(0);

  // 进度条拖拽状态管理
  const isDraggingProgressRef = useRef(false);
  const seekResetTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // resize事件防抖管理
  const resizeResetTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 去广告开关（从 localStorage 继承，默认 true）
  const [blockAdEnabled, setBlockAdEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const v = localStorage.getItem('enable_blockad');
      if (v !== null) return v === 'true';
    }
    return true;
  });
  const blockAdEnabledRef = useRef(blockAdEnabled);
  useEffect(() => {
    blockAdEnabledRef.current = blockAdEnabled;
  }, [blockAdEnabled]);

  // 视频基本信息
  const [videoTitle, setVideoTitle] = useState(searchParams.get('title') || '');
  const [videoYear, setVideoYear] = useState(searchParams.get('year') || '');
  const [videoCover, setVideoCover] = useState('');
  const [videoDoubanId, setVideoDoubanId] = useState(
    parseInt(searchParams.get('douban_id') || '0') || 0
  );
  // 当前源和ID
  const [currentSource, setCurrentSource] = useState(
    searchParams.get('source') || ''
  );
  const [currentId, setCurrentId] = useState(searchParams.get('id') || '');

  // 搜索所需信息
  const [searchTitle] = useState(searchParams.get('stitle') || '');
  const [searchType] = useState(searchParams.get('stype') || '');

  // 是否需要优选
  const [needPrefer, setNeedPrefer] = useState(
    searchParams.get('prefer') === 'true'
  );
  const needPreferRef = useRef(needPrefer);
  useEffect(() => {
    needPreferRef.current = needPrefer;
  }, [needPrefer]);
  // 集数相关
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(0);

  const currentSourceRef = useRef(currentSource);
  const currentIdRef = useRef(currentId);
  const videoTitleRef = useRef(videoTitle);
  const videoYearRef = useRef(videoYear);
  const videoDoubanIdRef = useRef(videoDoubanId);
  const detailRef = useRef<SearchResult | null>(detail);
  const currentEpisodeIndexRef = useRef(currentEpisodeIndex);

  // 同步最新值到 refs
  useEffect(() => {
    currentSourceRef.current = currentSource;
    currentIdRef.current = currentId;
    detailRef.current = detail;
    currentEpisodeIndexRef.current = currentEpisodeIndex;
    videoTitleRef.current = videoTitle;
    videoYearRef.current = videoYear;
    videoDoubanIdRef.current = videoDoubanId;
  }, [
    currentSource,
    currentId,
    detail,
    currentEpisodeIndex,
    videoTitle,
    videoYear,
    videoDoubanId,
  ]);

  // 加载豆瓣详情
  useEffect(() => {
    const loadMovieDetails = async () => {
      // 只有当videoDoubanId是有效的非0数值时才尝试加载豆瓣详情
      if (
        !videoDoubanId ||
        videoDoubanId === 0 ||
        loadingMovieDetails ||
        movieDetails
      ) {
        // 如果没有有效的豆瓣ID，但有detail.class，使用回滚数据
        if (detail?.class && !movieDetails) {
          const fallbackData = {
            id: '0',
            title: detail.title || '',
            poster: '',
            rate: '',
            year: detail.year || '',
            genres: [detail.class], // 使用class作为genres的回滚
            plot_summary: detail.desc || '', // 使用desc作为plot_summary的回滚
          };
          setMovieDetails(fallbackData);
          console.log('使用回滚数据:', fallbackData);
        }
        return;
      }

      setLoadingMovieDetails(true);
      try {
        const response = await getDoubanDetails(videoDoubanId.toString());
        if (response.code === 200 && response.data) {
          setMovieDetails(response.data);
        } else {
          // 豆瓣API失败时的回滚机制：使用detail.class作为genres
          if (detail?.class) {
            const fallbackData = {
              id: videoDoubanId.toString(),
              title: detail.title || '',
              poster: '',
              rate: '',
              year: detail.year || '',
              genres: [detail.class], // 使用class作为genres的回滚
              plot_summary: detail.desc || '', // 使用desc作为plot_summary的回滚
            };
            setMovieDetails(fallbackData);
            console.log('使用回滚数据:', fallbackData);
          }
        }
      } catch (error) {
        console.error('Failed to load movie details:', error);
        // 豆瓣API异常时的回滚机制：使用detail.class作为genres
        if (detail?.class) {
          const fallbackData = {
            id: videoDoubanId.toString(),
            title: detail.title || '',
            poster: '',
            rate: '',
            year: detail.year || '',
            genres: [detail.class], // 使用class作为genres的回滚
            plot_summary: detail.desc || '', // 使用desc作为plot_summary的回滚
          };
          setMovieDetails(fallbackData);
          console.log('使用异常回滚数据:', fallbackData);
        }
      } finally {
        setLoadingMovieDetails(false);
      }
    };

    loadMovieDetails();
  }, [videoDoubanId, detail]);

  // 视频播放地址
  const [videoUrl, setVideoUrl] = useState('');

  // 总集数
  const totalEpisodes = detail?.episodes?.length || 0;

  // 用于记录是否需要在播放器 ready 后跳转到指定进度
  const resumeTimeRef = useRef<number | null>(null);
  // 上次使用的音量，默认 0.7
  const lastVolumeRef = useRef<number>(0.7);
  // 上次使用的播放速率，默认 1.0
  const lastPlaybackRateRef = useRef<number>(1.0);
  // 保存当前视频的总时长
  const durationRef = useRef<number>(0);

  // 换源相关状态
  const [availableSources, setAvailableSources] = useState<SearchResult[]>([]);
  const [sourceSearchLoading, setSourceSearchLoading] = useState(false);
  const [sourceSearchError, setSourceSearchError] = useState<string | null>(
    null
  );

  // 优选和测速开关
  const [optimizationEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('enableOptimization');
      if (saved !== null) {
        try {
          return JSON.parse(saved);
        } catch {
          /* ignore */
        }
      }
    }
    return false; // 默认关闭优选和测速
  });

  // 保存优选时的测速结果，避免EpisodeSelector重复测速
  const [precomputedVideoInfo, setPrecomputedVideoInfo] = useState<
    Map<string, { quality: string; loadSpeed: string; pingTime: number }>
  >(new Map());

  // 折叠状态（仅在 lg 及以上屏幕有效）
  const [isEpisodeSelectorCollapsed, setIsEpisodeSelectorCollapsed] = 
    useState(false);

  // 换源加载状态
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [videoLoadingStage, setVideoLoadingStage] = useState<
    'initing' | 'sourceChanging'
  >('initing');

  // 播放进度保存相关
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveTimeRef = useRef<number>(0);

  const artPlayerRef = useRef<any>(null);
  const artRef = useRef<HTMLDivElement | null>(null);

  // Wake Lock 相关
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // -----------------------------------------------------------------------------  
  // 工具函数（Utils）
  // -----------------------------------------------------------------------------  

  // 播放源优选函数（针对旧iPad做极端保守优化）
  const preferBestSource = async (
    sources: SearchResult[]
  ): Promise<SearchResult> => {
    if (sources.length === 1) return sources[0];

    // 检测是否为iPad（所有浏览器都可能崩溃）
    const userAgent = 
      typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isIPad = /iPad/i.test(userAgent);
    const isIOS = /iPad|iPhone|iPod/i.test(userAgent);
    const isMobile = 
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        userAgent
      ) || isIOS;

    // 如果是iPad，使用极简策略避免崩溃
    if (isIPad) {
      console.log('检测到iPad，使用无测速优选策略避免崩溃');

      // 简单的源名称优先级排序，不进行实际测速
      const sourcePreference = [
        'ok',
        'niuhu',
        'ying',
        'wasu',
        'mgtv',
        'iqiyi',
        'youku',
        'qq',
      ];

      const sortedSources = sources.sort((a, b) => {
        const aIndex = sourcePreference.findIndex((name) =>
          a.source_name?.toLowerCase().includes(name)
        );
        const bIndex = sourcePreference.findIndex((name) =>
          b.source_name?.toLowerCase().includes(name)
        );

        // 如果都在优先级列表中，按优先级排序
        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex;
        }
        // 如果只有一个在优先级列表中，优先选择它
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;

        // 都不在优先级列表中，保持原始顺序
        return 0;
      });

      console.log(
        'iPad优选结果:',
        sortedSources.map((s) => s.source_name)
      );
      return sortedSources[0];
    }

    // 移动设备使用轻量级测速（仅ping，不创建HLS）
    if (isMobile) {
      console.log('移动设备使用轻量级优选');
      return await lightweightPreference(sources);
    }

    // 桌面设备使用原来的测速方法（控制并发）
    return await fullSpeedTest(sources);
  };

  // 轻量级优选：仅测试连通性，不创建video和HLS
  const lightweightPreference = async (
    sources: SearchResult[]
  ): Promise<SearchResult> => {
    console.log('开始轻量级测速，仅测试连通性');

    const results = await Promise.all(
      sources.map(async (source) => {
        try {
          if (!source.episodes || source.episodes.length === 0) {
            return { source, pingTime: 9999, available: false };
          }

          const episodeUrl = 
            source.episodes.length > 1
              ? source.episodes[1]
              : source.episodes[0];

          // 仅测试连通性和响应时间
          const startTime = performance.now();
          await fetch(episodeUrl, {
            method: 'HEAD',
            mode: 'no-cors',
            signal: AbortSignal.timeout(3000), // 3秒超时
          });
          const pingTime = performance.now() - startTime;

          return {
            source,
            pingTime: Math.round(pingTime),
            available: true,
          };
        } catch (error) {
          console.warn(`轻量级测速失败: ${source.source_name}`, error);
          return { source, pingTime: 9999, available: false };
        }
      })
    );

    // 按可用性和响应时间排序
    const sortedResults = results
      .filter((r) => r.available)
      .sort((a, b) => a.pingTime - b.pingTime);

    if (sortedResults.length === 0) {
      console.warn('所有源都不可用，返回第一个');
      return sources[0];
    }

    console.log(
      '轻量级优选结果:',
      sortedResults.map((r) => `${r.source.source_name}: ${r.pingTime}ms`)
    );

    return sortedResults[0].source;
  };

  // 完整测速（桌面设备）
  const fullSpeedTest = async (
    sources: SearchResult[]
  ): Promise<SearchResult> => {
    // 桌面设备使用小批量并发，避免创建过多实例
    const concurrency = 2;
    const allResults: Array<{
      source: SearchResult;
      testResult: { quality: string; loadSpeed: string; pingTime: number };
    } | null> = [];

    for (let i = 0; i < sources.length; i += concurrency) {
      const batch = sources.slice(i, i + concurrency);
      console.log(
        `测速批次 ${Math.floor(i / concurrency) + 1}/${Math.ceil(
          sources.length / concurrency
        )}: ${batch.length} 个源`
      );

      const batchResults = await Promise.all(
        batch.map(async (source) => {
          try {
            if (!source.episodes || source.episodes.length === 0) {
              return null;
            }

            const episodeUrl = 
              source.episodes.length > 1
                ? source.episodes[1]
                : source.episodes[0];

            const testResult = await getVideoResolutionFromM3u8(episodeUrl);
            return { source, testResult };
          } catch (error) {
            console.warn(`测速失败: ${source.source_name}`, error);
            return null;
          }
        })
      );

      allResults.push(...batchResults);

      // 批次间延迟，让资源有时间清理
      if (i + concurrency < sources.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // 等待所有测速完成，包含成功和失败的结果
    // 保存所有测速结果到 precomputedVideoInfo，供 EpisodeSelector 使用（包含错误结果）
    const newVideoInfoMap = new Map<
      string,
      {
        quality: string;
        loadSpeed: string;
        pingTime: number;
        hasError?: boolean;
      }
    >();
    allResults.forEach((result, index) => {
      const source = sources[index];
      const sourceKey = `${source.source}-${source.id}`;

      if (result) {
        // 成功的结果
        newVideoInfoMap.set(sourceKey, result.testResult);
      }
    });

    // 过滤出成功的结果用于优选计算
    const successfulResults = allResults.filter(Boolean) as Array<{
      source: SearchResult;
      testResult: { quality: string; loadSpeed: string; pingTime: number };
    }>;

    setPrecomputedVideoInfo(newVideoInfoMap);

    if (successfulResults.length === 0) {
      console.warn('所有播放源测速都失败，使用第一个播放源');
      return sources[0];
    }

    // 找出所有有效速度的最大值，用于线性映射
    const validSpeeds = successfulResults
      .map((result) => {
        const speedStr = result.testResult.loadSpeed;
        if (speedStr === '未知' || speedStr === '测量中...') return 0;

        const match = speedStr.match(/^([\d.]+)\s*(KB\/s|MB\/s)$/);
        if (!match) return 0;

        const value = parseFloat(match[1]);
        const unit = match[2];
        return unit === 'MB/s' ? value * 1024 : value; // 统一转换为 KB/s
      })
      .filter((speed) => speed > 0);

    const maxSpeed = validSpeeds.length > 0 ? Math.max(...validSpeeds) : 1024; // 默认1MB/s作为基准

    // 找出所有有效延迟的最小值和最大值，用于线性映射
    const validPings = successfulResults
      .map((result) => result.testResult.pingTime)
      .filter((ping) => ping > 0);

    const minPing = validPings.length > 0 ? Math.min(...validPings) : 50;
    const maxPing = validPings.length > 0 ? Math.max(...validPings) : 1000;

    // 计算每个结果的评分
    const resultsWithScore = successfulResults.map((result) => ({
      ...result,
      score: calculateSourceScore(
        result.testResult,
        maxSpeed,
        minPing,
        maxPing
      ),
    }));

    // 按综合评分排序，选择最佳播放源
    resultsWithScore.sort((a, b) => b.score - a.score);

    console.log('播放源评分排序结果:');
    resultsWithScore.forEach((result, index) => {
      console.log(
        `${index + 1}. ${
          result.source.source_name
        } - 评分: ${result.score.toFixed(2)} (${result.testResult.quality}, ${
          result.testResult.loadSpeed
        }, ${result.testResult.pingTime}ms)`
      );
    });

    return resultsWithScore[0].source;
  };

  // 计算播放源综合评分
  const calculateSourceScore = (
    testResult: {
      quality: string;
      loadSpeed: string;
      pingTime: number;
    },
    maxSpeed: number,
    minPing: number,
    maxPing: number
  ): number => {
    let score = 0;

    // 分辨率评分 (40% 权重)
    const qualityScore = (() => {
      switch (testResult.quality) {
        case '4K':
          return 100;
        case '2K':
          return 85;
        case '1080p':
          return 75;
        case '720p':
          return 60;
        case '480p':
          return 40;
        case 'SD':
          return 20;
        default:
          return 0;
      }
    })();
    score += qualityScore * 0.4;

    // 下载速度评分 (40% 权重) - 基于最大速度线性映射
    const speedScore = (() => {
      const speedStr = testResult.loadSpeed;
      if (speedStr === '未知' || speedStr === '测量中...') return 30;

      // 解析速度值
      const match = speedStr.match(/^([\d.]+)\s*(KB\/s|MB\/s)$/);
      if (!match) return 30;

      const value = parseFloat(match[1]);
      const unit = match[2];
      const speedKBps = unit === 'MB/s' ? value * 1024 : value;

      // 基于最大速度线性映射，最高100分
      const speedRatio = speedKBps / maxSpeed;
      return Math.min(100, Math.max(0, speedRatio * 100));
    })();
    score += speedScore * 0.4;

    // 网络延迟评分 (20% 权重) - 基于延迟范围线性映射
    const pingScore = (() => {
      const ping = testResult.pingTime;
      if (ping <= 0) return 0; // 无效延迟给默认分

      // 如果所有延迟都相同，给满分
      if (maxPing === minPing) return 100;

      // 线性映射：最低延迟=100分，最高延迟=0分
      const pingRatio = (maxPing - ping) / (maxPing - minPing);
      return Math.min(100, Math.max(0, pingRatio * 100));
    })();
    score += pingScore * 0.2;

    return Math.round(score * 100) / 100; // 保留两位小数
  };

  // 更新视频地址
  const updateVideoUrl = (
    detailData: SearchResult | null,
    episodeIndex: number
  ) => {
    if (
      !detailData ||
      !detailData.episodes ||
      episodeIndex >= detailData.episodes.length
    ) {
      setVideoUrl('');
      return;
    }
    const newUrl = detailData?.episodes[episodeIndex] || '';
    if (newUrl !== videoUrl) {
      setVideoUrl(newUrl);
    }
  };

  const ensureVideoSource = (video: HTMLVideoElement | null, url: string) => {
    if (!video || !url) return;
    const sources = Array.from(video.getElementsByTagName('source'));
    const existed = sources.some((s) => s.src === url);
    if (!existed) {
      // 移除旧的 source，保持唯一
      sources.forEach((s) => s.remove());
      const sourceEl = document.createElement('source');
      sourceEl.src = url;
      video.appendChild(sourceEl);
    }

    // 始终允许远程播放（AirPlay / Cast）
    video.disableRemotePlayback = false;
    // 如果曾经有禁用属性，移除之
    if (video.hasAttribute('disableRemotePlayback')) {
      video.removeAttribute('disableRemotePlayback');
    }
  };

  // 检测移动设备（在组件层级定义）
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIOSGlobal = 
    /iPad|iPhone|iPod/i.test(userAgent) && !(window as any).MSStream;
  const isMobileGlobal = 
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      userAgent
    ) || isIOSGlobal;

  // 内存压力检测和清理（针对移动设备）
  const checkMemoryPressure = () => {
    // 仅在支持performance.memory的浏览器中执行
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      try {
        const memInfo = (performance as any).memory;
        const usedJSHeapSize = memInfo.usedJSHeapSize;
        const heapLimit = memInfo.jsHeapSizeLimit;

        // 计算内存使用率
        const memoryUsageRatio = usedJSHeapSize / heapLimit;

        console.log(
          `内存使用情况: ${(memoryUsageRatio * 100).toFixed(2)}% (${(
            usedJSHeapSize /
            1024 /
            1024
          ).toFixed(2)}MB / ${(heapLimit / 1024 / 1024).toFixed(2)}MB)`
        );

        // 如果内存使用超过75%，触发清理
        if (memoryUsageRatio > 0.75) {
          console.warn('内存使用过高，清理缓存...');

          // 尝试强制垃圾回收（如果可用）
          if (typeof (window as any).gc === 'function') {
            (window as any).gc();
            console.log('已触发垃圾回收');
          }

          return true; // 返回真表示高内存压力
        }
      } catch (error) {
        console.warn('内存检测失败:', error);
      }
    }
    return false;
  };

  // 定期内存检查（仅在移动设备上）
  useEffect(() => {
    if (!isMobileGlobal) return;

    const memoryCheckInterval = setInterval(() => {
      checkMemoryPressure();
    }, 30000); // 每30秒检查一次

    return () => {
      clearInterval(memoryCheckInterval);
    };
  }, [isMobileGlobal]);
  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request(
          'screen'
        );
        console.log('Wake Lock 已启用');
      }
    } catch (err) {
      console.warn('Wake Lock 请求失败:', err);
    }
  };

  const releaseWakeLock = async () => {
    try {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        console.log('Wake Lock 已释放');
      }
    } catch (err) {
      console.warn('Wake Lock 释放失败:', err);
    }
  };

  // 清理播放器资源的统一函数（添加更完善的清理逻辑）
  const cleanupPlayer = () => {
    if (artPlayerRef.current) {
      try {
        // 1. 销毁HLS实例
        if (artPlayerRef.current.video.hls) {
          artPlayerRef.current.video.hls.destroy();
          console.log('HLS实例已销毁');
        }
        // 2. 销毁ArtPlayer实例 (使用false参数避免DOM清理冲突)
        artPlayerRef.current.destroy(false);
        artPlayerRef.current = null;

        console.log('播放器资源已清理');
      } catch (err) {
        console.warn('清理播放器资源时出错:', err);
        // 即使出错也要确保引用被清空
        artPlayerRef.current = null;
      }
    }
  };

  // 去广告相关函数
  function filterAdsFromM3U8(m3u8Content: string): string {
    if (!m3u8Content) return '';

    // 按行分割M3U8内容
    const lines = m3u8Content.split('\n');
    const filteredLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 只过滤#EXT-X-DISCONTINUITY标识
      if (!line.includes('#EXT-X-DISCONTINUITY')) {
        filteredLines.push(line);
      }
    }

    return filteredLines.join('\n');
  }

  // 跳过片头片尾配置相关函数
  const handleSkipConfigChange = async (newConfig: {
    enable: boolean;
    intro_time: number;
    outro_time: number;
  }) => {
    if (!currentSourceRef.current || !currentIdRef.current) return;

    try {
      setSkipConfig(newConfig);
      if (!newConfig.enable && !newConfig.intro_time && !newConfig.outro_time) {
        await deleteSkipConfig(currentSourceRef.current, currentIdRef.current);
        artPlayerRef.current.setting.update({
          name: '跳过片头片尾',
          html: '跳过片头片尾',
          switch: skipConfigRef.current.enable,
          onSwitch: function (item: any) {
            const newConfig = {
              ...skipConfigRef.current,
              enable: !item.switch,
            };
            handleSkipConfigChange(newConfig);
            return !item.switch;
          },
        });
        artPlayerRef.current.setting.update({
          name: '设置片头',
          html: '设置片头',
          icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="12" r="2" fill="#ffffff"/><path d="M9 12L17 12" stroke="#ffffff" stroke-width="2"/><path d="M17 6L17 18" stroke="#ffffff" stroke-width="2"/></svg>',
          tooltip: 
            skipConfigRef.current.intro_time === 0
              ? '设置片头时间'
              : `${formatTime(skipConfigRef.current.intro_time)}`,
          onClick: function (this: any) {
            const currentTime = artPlayerRef.current?.currentTime || 0;
            if (currentTime > 0) {
              const newConfig = {
                ...skipConfigRef.current,
                intro_time: currentTime,
              };
              handleSkipConfigChange(newConfig);
              return `${formatTime(currentTime)}`;
            }
          },
        });
        artPlayerRef.current.setting.update({
          name: '设置片尾',
          html: '设置片尾',
          icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 6L7 18" stroke="#ffffff" stroke-width="2"/><path d="M7 12L15 12" stroke="#ffffff" stroke-width="2"/><circle cx="19" cy="12" r="2" fill="#ffffff"/></svg>',
          tooltip: 
            skipConfigRef.current.outro_time >= 0
              ? '设置片尾时间'
              : `-${formatTime(-skipConfigRef.current.outro_time)}`,
          onClick: function () {
            const outroTime = 
              -(
                artPlayerRef.current?.duration - 
                artPlayerRef.current?.currentTime
              ) || 0;
            if (outroTime < 0) {
              const newConfig = {
                ...skipConfigRef.current,
                outro_time: outroTime,
              };
              handleSkipConfigChange(newConfig);
              return `-${formatTime(-outroTime)}`;
            }
          },
        });
      } else {
        await saveSkipConfig(
          currentSourceRef.current,
          currentIdRef.current,
          newConfig
        );
      }
      console.log('跳过片头片尾配置已保存:', newConfig);
    } catch (err) {
      console.error('保存跳过片头片尾配置失败:', err);
    }
  };

  const formatTime = (seconds: number): string => {
    if (seconds === 0) return '00:00';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.round(seconds % 60);

    if (hours === 0) {
      // 不到一小时，格式为 00:00
      return `${minutes.toString().padStart(2, '0')}:${remainingSeconds
        .toString()
        .padStart(2, '0')}`;
    } else {
      // 超过一小时，格式为 00:00:00
      return `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  };

  class CustomHlsJsLoader extends Hls.DefaultConfig.loader {
    constructor(config: any) {
      super(config);
      const load = this.load.bind(this);
      this.load = function (context: any, config: any, callbacks: any) {
        // 拦截manifest和level请求
        if (
          (context as any).type === 'manifest' ||
          (context as any).type === 'level'
        ) {
          const onSuccess = callbacks.onSuccess;
          callbacks.onSuccess = function (
            response: any,
            stats: any,
            context: any
          ) {
            // 如果是m3u8文件，处理内容以移除广告分段
            if (response.data && typeof response.data === 'string') {
              // 过滤掉广告段 - 实现更精确的广告过滤逻辑
              response.data = filterAdsFromM3U8(response.data);
            }
            return onSuccess(response, stats, context, null);
          };
        }
        // 执行原始load方法
        load(context, config, callbacks);
      };
    }
  }

  // 当集数索引变化时自动更新视频地址
  useEffect(() => {
    updateVideoUrl(detail, currentEpisodeIndex);
  }, [detail, currentEpisodeIndex]);

  // 进入页面时直接获取全部源信息
  useEffect(() => {
    const fetchSourceDetail = async (
      source: string,
      id: string
    ): Promise<SearchResult[]> => {
      try {
        const detailResponse = await fetch(
          `/api/detail?source=${source}&id=${id}`
        );
        if (!detailResponse.ok) {
          throw new Error('获取视频详情失败');
        }
        const detailData = (await detailResponse.json()) as SearchResult;
        setAvailableSources([detailData]);
        return [detailData];
      } catch (err) {
        console.error('获取视频详情失败:', err);
        return [];
      } finally {
        setSourceSearchLoading(false);
      }
    };
    const fetchSourcesData = async (query: string): Promise<SearchResult[]> => {
      // 根据搜索词获取全部源信息
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query.trim())}`
        );
        if (!response.ok) {
          throw new Error('搜索失败');
        }
        const data = await response.json();

        // 处理搜索结果，根据规则过滤
        const results = data.results.filter(
          (result: SearchResult) =>
            result.title.replaceAll(' ', '').toLowerCase() ===
              videoTitleRef.current.replaceAll(' ', '').toLowerCase() &&
            (videoYearRef.current
              ? result.year.toLowerCase() === videoYearRef.current.toLowerCase()
              : true) &&
            (searchType
              ? (searchType === 'tv' && result.episodes.length > 1) ||
                (searchType === 'movie' && result.episodes.length === 1)
              : true)
        );
        setAvailableSources(results);
        return results;
      } catch (err) {
        setSourceSearchError(err instanceof Error ? err.message : '搜索失败');
        setAvailableSources([]);
        return [];
      } finally {
        setSourceSearchLoading(false);
      }
    };

    const initAll = async () => {
      if (!currentSource && !currentId && !videoTitle && !searchTitle) {
        setError('缺少必要参数');
        return;
      }

      let sourcesInfo = await fetchSourcesData(searchTitle || videoTitle);
      if (
        currentSource &&
        currentId &&
        !sourcesInfo.some(
          (source) => source.source === currentSource && source.id === currentId
        )
      ) {
        sourcesInfo = await fetchSourceDetail(currentSource, currentId);
      }
      if (sourcesInfo.length === 0) {
        setError('未找到匹配结果');
        return;
      }

      let detailData: SearchResult = sourcesInfo[0];
      // 指定源和id且无需优选
      if (currentSource && currentId && !needPreferRef.current) {
        const target = sourcesInfo.find(
          (source) => source.source === currentSource && source.id === currentId
        );
        if (target) {
          detailData = target;
        } else {
          setError('未找到匹配结果');
          return;
        }
      }

      // 未指定源和 id 或需要优选，且开启优选开关
      if (
        (!currentSource || !currentId || needPreferRef.current) &&
        optimizationEnabled
      ) {
        detailData = await preferBestSource(sourcesInfo);
      }

      console.log(detailData.source, detailData.id);

      setNeedPrefer(false);
      setCurrentSource(detailData.source);
      setCurrentId(detailData.id);
      setVideoYear(detailData.year);
      setVideoTitle(detailData.title || videoTitleRef.current);
      setVideoCover(detailData.poster);
      // 优先保留URL参数中的豆瓣ID，如果URL中没有则使用详情数据中的
      setVideoDoubanId(videoDoubanIdRef.current || detailData.douban_id || 0);
      setDetail(detailData);
      if (currentEpisodeIndex >= detailData.episodes.length) {
        setCurrentEpisodeIndex(0);
      }

      // 检查新集数更新
      try {
        await checkVideoUpdate(detailData.source, detailData.id);
      } catch (error) {
        console.error('检查新集数更新失败:', error);
      }

      // 规范URL参数
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('source', detailData.source);
      newUrl.searchParams.set('id', detailData.id);
      newUrl.searchParams.set('year', detailData.year);
      newUrl.searchParams.set('title', detailData.title);
      newUrl.searchParams.delete('prefer');
      window.history.replaceState({}, '', newUrl.toString());
    };

    initAll();
  }, []);

  // 播放记录处理
  useEffect(() => {
    // 仅在初次挂载时检查播放记录
    const initFromHistory = async () => {
      if (!currentSource || !currentId) return;

      try {
        const allRecords = await getAllPlayRecords();
        const key = generateStorageKey(currentSource, currentId);
        const record = allRecords[key];

        if (record) {
          const targetIndex = record.index - 1;
          const targetTime = record.play_time;

          // 更新当前选集索引
          if (targetIndex !== currentEpisodeIndex) {
            setCurrentEpisodeIndex(targetIndex);
          }

          // 保存待恢复的播放进度，待播放器就绪后跳转
          resumeTimeRef.current = targetTime;
        }
      } catch (err) {
        console.error('读取播放记录失败:', err);
      }
    };

    initFromHistory();
  }, []);

  // 跳过片头片尾配置处理
  useEffect(() => {
    // 仅在初次挂载时检查跳过片头片尾配置
    const initSkipConfig = async () => {
      if (!currentSource || !currentId) return;

      try {
        const config = await getSkipConfig(currentSource, currentId);
        if (config) {
          setSkipConfig(config);
        }
      } catch (err) {
        console.error('读取跳过片头片尾配置失败:', err);
      }
    };

    initSkipConfig();
  }, []);

  // 处理换源
  const handleSourceChange = async (
    newSource: string,
    newId: string,
    newTitle: string
  ) => {
    try {
      // 显示换源加载状态
      setVideoLoadingStage('sourceChanging');
      setIsVideoLoading(true);

      // 记录当前播放进度（仅在同一集数切换时恢复）
      const currentPlayTime = artPlayerRef.current?.currentTime || 0;
      console.log('换源前当前播放时间:', currentPlayTime);

      // 清除前一个历史记录
      if (currentSourceRef.current && currentIdRef.current) {
        try {
          await deletePlayRecord(
            currentSourceRef.current,
            currentIdRef.current
          );
          console.log('已清除前一个播放记录');
        } catch (err) {
          console.error('清除播放记录失败:', err);
        }
      }

      // 清除并设置下一个跳过片头片尾配置
      if (currentSourceRef.current && currentIdRef.current) {
        try {
          await deleteSkipConfig(
            currentSourceRef.current,
            currentIdRef.current
          );
          await saveSkipConfig(newSource, newId, skipConfigRef.current);
        } catch (err) {
          console.error('清除跳过片头片尾配置失败:', err);
        }
      }

      const newDetail = availableSources.find(
        (source) => source.source === newSource && source.id === newId
      );
      if (!newDetail) {
        console.error('未找到新源的详情');
        setIsVideoLoading(false);
        return;
      }

      // 更新状态
      setCurrentSource(newSource);
      setCurrentId(newId);
      setVideoYear(newDetail.year);
      setVideoTitle(newDetail.title || videoTitleRef.current);
      setVideoCover(newDetail.poster);
      setVideoDoubanId(newDetail.douban_id || 0);
      setDetail(newDetail);
      setCurrentEpisodeIndex(0);
      updateVideoUrl(newDetail, 0);

      // 规范URL参数
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('source', newSource);
      newUrl.searchParams.set('id', newId);
      newUrl.searchParams.set('year', newDetail.year);
      newUrl.searchParams.set('title', newDetail.title);
      newUrl.searchParams.delete('prefer');
      window.history.replaceState({}, '', newUrl.toString());
    } catch (err) {
      console.error('换源失败:', err);
      setIsVideoLoading(false);
    }
  };

  // 保存播放记录
  const savePlayRecordAsync = async (time: number, index: number) => {
    if (!currentSource || !currentId) return;

    try {
      const record: PlayRecord = {
        title: videoTitle,
        source_name: detail?.source_name || '',
        cover: detail?.poster || '',
        year: videoYear,
        index: index,
        total_episodes: totalEpisodes,
        play_time: time,
        total_time: durationRef.current || 0, // 从播放器获取总时长
        save_time: Date.now(),
        search_title: videoTitle
      };
      await savePlayRecord(currentSource, currentId, record);
      lastSaveTimeRef.current = Date.now();
    } catch (err) {
      console.error('保存播放记录失败:', err);
    }
  };

  // 处理收藏状态切换
  const toggleFavorite = async () => {
    if (!currentSource || !currentId) return;

    try {
      if (favorited) {
        await deleteFavorite(currentSource, currentId);
      } else {
        const favorite: Favorite = {
          title: videoTitle,
          source_name: detail?.source_name || '',
          year: videoYear,
          cover: detail?.poster || '',
          total_episodes: totalEpisodes,
          save_time: Date.now(),
          search_title: videoTitle
        };
        await saveFavorite(currentSource, currentId, favorite);
      }
      setFavorited(!favorited);
    } catch (err) {
      console.error('切换收藏状态失败:', err);
    }
  };

  // 检查收藏状态
  useEffect(() => {
    const checkFavorite = async () => {
      if (!currentSource || !currentId) return;

      try {
        const isFavorite = await isFavorited(currentSource, currentId);
        setFavorited(isFavorite);
      } catch (err) {
        console.error('检查收藏状态失败:', err);
      }
    };

    checkFavorite();
  }, [currentSource, currentId]);

  // 监听数据更新
  useEffect(() => {
    const unsubscribe = subscribeToDataUpdates('favoritesUpdated', () => {
      // 收藏数据更新，重新检查收藏状态
      const checkFavorite = async () => {
        if (!currentSource || !currentId) return;
        try {
          const isFavorite = await isFavorited(currentSource, currentId);
          setFavorited(isFavorite);
        } catch (err) {
          console.error('检查收藏状态失败:', err);
        }
      };
      checkFavorite();
    });

    return () => unsubscribe();
  }, [currentSource, currentId]);

  // 播放器初始化和管理
  useEffect(() => {
    if (!videoUrl) return;

    // 清理旧的播放器实例
    cleanupPlayer();

    // 重置加载状态
    setIsVideoLoading(true);

    // 动态导入ArtPlayer并初始化
    const loadAndInit = async () => {
      try {
        // 动态导入ArtPlayer
        const { default: Artplayer } = await import('artplayer');
        
        // 将导入的模块设置为全局变量
        (window as any).DynamicArtplayer = Artplayer;
        
        // 使用动态导入的Artplayer，添加类型断言解决TypeScript编译错误
        const art: any = new (Artplayer as any)({
          container: artRef.current || '',
          url: videoUrl,
          title: videoTitle,
          volume: lastVolumeRef.current,
          playbackRate: lastPlaybackRateRef.current,
          screenshot: true,
          fullscreen: true,
          pip: true,
          mutex: true,
          backdrop: true,
          autoSize: true,
          autoplay: true,
          autoMini: true,
          theme: '#ff3300',
          lang: {
            play: '播放',
            pause: '暂停',
            volume: '音量',
            muted: '静音',
            speed: '速度',
            pip: '画中画',
            fullscreen: '全屏',
            loading: '加载中...',
            screenshot: '截图',
          },
          quality: [
            {
              name: '自动',
              url: videoUrl,
        },
      ],
      setting: [
        {
          name: '跳过片头片尾',
          html: '跳过片头片尾',
          switch: skipConfig.enable,
          onSwitch: function (item: any) {
            const newConfig = {
              ...skipConfigRef.current,
              enable: !item.switch,
            };
            handleSkipConfigChange(newConfig);
            return !item.switch;
          },
        },
        {
          name: '设置片头',
          html: '设置片头',
          icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="12" r="2" fill="#ffffff"/><path d="M9 12L17 12" stroke="#ffffff" stroke-width="2"/><path d="M17 6L17 18" stroke="#ffffff" stroke-width="2"/></svg>',
          tooltip: 
            skipConfig.intro_time === 0
              ? '设置片头时间'
              : `${formatTime(skipConfig.intro_time)}`,
          onClick: function (): string | void {
            const currentTime = art.currentTime;
            if (currentTime > 0) {
              const newConfig = {
                ...skipConfigRef.current,
                intro_time: currentTime,
              };
              handleSkipConfigChange(newConfig);
              return `${formatTime(currentTime)}`;
            }
          },
        },
        {
          name: '设置片尾',
          html: '设置片尾',
          icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 6L7 18" stroke="#ffffff" stroke-width="2"/><path d="M7 12L15 12" stroke="#ffffff" stroke-width="2"/><circle cx="19" cy="12" r="2" fill="#ffffff"/></svg>',
          tooltip: 
            skipConfig.outro_time >= 0
              ? '设置片尾时间'
              : `-${formatTime(-skipConfig.outro_time)}`,
          onClick: function (): string | void {
            const outroTime = 
              -(art.duration - art.currentTime) || 0;
            if (outroTime < 0) {
              const newConfig = {
                ...skipConfigRef.current,
                outro_time: outroTime,
              };
              handleSkipConfigChange(newConfig);
              return `-${formatTime(-outroTime)}`;
            }
          },
        },
        {
          name: '去广告',
          html: '去广告',
          switch: blockAdEnabled,
          onSwitch: function (item: any) {
            setBlockAdEnabled(!item.switch);
            localStorage.setItem('enable_blockad', (!item.switch).toString());
            blockAdEnabledRef.current = !item.switch;
            return !item.switch;
          },
        },
      ],
      contextmenu: [
        {
          html: favorited ? '取消收藏' : '收藏',
          click: toggleFavorite,
        },
      ],
      controls: [
        {
          position: 'right',
          html: favorited ? 
            '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#ff4444"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>' :
            '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
          click: toggleFavorite,
        },
      ],
      layers: [
        {
          html: <div className="absolute top-2 right-2 z-10 flex items-center gap-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
            <Heart 
              size={16} 
              fill={favorited ? '#ff4444' : 'none'} 
              stroke={favorited ? '#ff4444' : '#ffffff'} 
              className="cursor-pointer transition-all duration-200 hover:scale-110"
              onClick={toggleFavorite}
            />
            <span className="text-xs">{videoTitle}</span>
          </div>,
          style: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
          },
        },
      ],
    });

        // 保存播放器实例
        artPlayerRef.current = art;
        
        // 更新总时长
        durationRef.current = art.duration;

        // 跳转到指定进度
        if (resumeTimeRef.current !== null && resumeTimeRef.current > 0) {
          setTimeout(() => {
            art.seek = resumeTimeRef.current || 0;
            resumeTimeRef.current = null;
          }, 500);
        }

        // 监听播放进度变化，定期保存播放记录
        art.on('timeupdate', () => {
          const currentTime = art.currentTime;
          const currentIndex = currentEpisodeIndex;
          const now = Date.now();

          // 更新总时长（处理动态时长变化）
          durationRef.current = art.duration;

          // 实现跳过片头片尾功能
          if (skipConfig.enable && art.duration > 0) {
            const nowTime = Date.now();
            if (nowTime - lastSkipCheckRef.current > 1000) { // 限制检查频率
              lastSkipCheckRef.current = nowTime;

              // 跳过片头
              if (skipConfig.intro_time > 0 && currentTime >= skipConfig.intro_time - 1 && currentTime <= skipConfig.intro_time + 1) {
                art.seek = skipConfig.intro_time;
                console.log('自动跳过片头到', skipConfig.intro_time, '秒');
              }

              // 跳过片尾
              if (skipConfig.outro_time < 0) {
                const outroStart = art.duration + skipConfig.outro_time;
                if (currentTime >= outroStart - 1 && currentTime <= outroStart + 1) {
                  // 如果是最后一集，不跳过片尾
                  if (currentIndex < totalEpisodes - 1) {
                    // 跳转到下一集
                    art.on('seeked', () => {
                      setCurrentEpisodeIndex(currentIndex + 1);
                      art.play();
                    });
                    art.seek = art.duration;
                    console.log('自动跳过片尾，跳转到下一集');
                  }
                }
              }
            }
          }

          // 保存播放记录 (每10秒保存一次，或播放结束时保存)
          if (now - lastSaveTimeRef.current > 10000) {
            savePlayRecordAsync(currentTime, currentIndex + 1);
          }
        });

        // 监听播放结束事件
        art.on('ended', () => {
          const currentIndex = currentEpisodeIndex;
          savePlayRecordAsync(0, currentIndex + 1);

          // 自动播放下一集
          if (currentIndex < totalEpisodes - 1) {
            setCurrentEpisodeIndex(currentIndex + 1);
          }
        });

        // 监听播放器销毁事件
        art.on('destroy', () => {
          console.log('ArtPlayer 已销毁');
          releaseWakeLock();
        });

        // 处理视频缓冲事件
        art.on('waiting', () => {
          console.log('视频缓冲中...');
        });

        // 处理视频播放事件
        art.on('play', () => {
          console.log('视频开始播放');
          requestWakeLock();
        });

        // 处理视频暂停事件
        art.on('pause', () => {
          console.log('视频已暂停');
        });

        // 处理全屏变化事件
        art.on('fullscreen', (fullscreen: boolean) => {
          console.log('全屏状态:', fullscreen);
          if (fullscreen) {
            requestWakeLock();
          }
        });

        // 处理画中画变化事件
        art.on('pip', (pip: boolean) => {
          console.log('画中画状态:', pip);
        });

        // 处理错误事件
        art.on('error', (err: any) => {
          console.error('播放器错误:', err);
          setError('播放器发生错误，请刷新页面重试');
          setIsVideoLoading(false);
        });

        // 监听HLS错误事件
        if (art.video.hls) {
          art.video.hls.on(Hls.Events.ERROR, (event: any, data: any) => {
            console.error('HLS 错误:', event, data);
            if (data.fatal) {
              setError('视频加载失败，请切换播放源');
              setIsVideoLoading(false);
            }
          });
        }
        
        // 视频加载完成后更新状态
        art.on('ready', () => {
          setIsVideoLoading(false);
          setError(null);
        });
      } catch (error) {
        console.error('初始化播放器失败:', error);
        setError('初始化播放器失败，请刷新页面重试');
        setIsVideoLoading(false);
        return;
      }
    };

    // 调用动态加载和初始化函数
    loadAndInit();
    
    // 清除定时器和事件监听
    return () => {
      cleanupPlayer();
      releaseWakeLock();
    };
  }, [videoUrl, currentEpisodeIndex, skipConfig, blockAdEnabled, favorited, toggleFavorite, videoTitle, totalEpisodes]);

  // 监听键盘事件
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!artPlayerRef.current) return;

      switch (event.key) {
        case ' ': // 空格键，播放/暂停
          event.preventDefault();
          artPlayerRef.current.toggle();
          break;
        case 'ArrowLeft': // 左箭头，快退5秒
          event.preventDefault();
          artPlayerRef.current.seek -= 5;
          break;
        case 'ArrowRight': // 右箭头，快进5秒
          event.preventDefault();
          artPlayerRef.current.seek += 5;
          break;
        case 'ArrowUp': // 上箭头，音量增加10%
          event.preventDefault();
          artPlayerRef.current.volume = Math.min(1, artPlayerRef.current.volume + 0.1);
          break;
        case 'ArrowDown': // 下箭头，音量减少10%
          event.preventDefault();
          artPlayerRef.current.volume = Math.max(0, artPlayerRef.current.volume - 0.1);
          break;
        case 'f': // F键，切换全屏
          event.preventDefault();
          artPlayerRef.current.fullscreen = !artPlayerRef.current.fullscreen;
          break;
        case 'm': // M键，切换静音
          event.preventDefault();
          artPlayerRef.current.muted = !artPlayerRef.current.muted;
          break;
        case 'p': // P键，切换画中画
          event.preventDefault();
          artPlayerRef.current.pip = !artPlayerRef.current.pip;
          break;
        case 's': // S键，截图
          event.preventDefault();
          artPlayerRef.current.screenshot();
          break;
        case 'r': // R键，刷新视频
          event.preventDefault();
          if (artPlayerRef.current) {
            const currentTime = artPlayerRef.current.currentTime;
            artPlayerRef.current.reload();
            setTimeout(() => {
              artPlayerRef.current.seek = currentTime;
            }, 500);
          }
          break;
        case '0': // 数字键0-9，跳转到对应百分比位置
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9': {
          event.preventDefault();
          const percentage = parseInt(event.key) * 10;
          artPlayerRef.current.seek = (percentage / 100) * artPlayerRef.current.duration;
          break;
        }
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <PageLayout>
      <div className="relative flex flex-col h-screen bg-black">
        {/* 视频播放器 */}
        <div 
          ref={artRef} 
          className="relative flex-1 bg-black"
          style={{ 
            minHeight: '300px',
            maxHeight: 'calc(100vh - 200px)'
          }}
        >
          {/* 加载指示器 */}
          {isVideoLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 z-20">
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500 mx-auto mb-4"></div>
                <p>{videoLoadingStage === 'initing' ? '正在加载视频...' : '正在切换播放源...'}</p>
                {error && <p className="text-red-400 mt-2">{error}</p>}
              </div>
            </div>
          )}

          {/* 错误信息 */}
          {error && !isVideoLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 z-20">
              <div className="text-white text-center p-4">
                <p className="text-red-400 text-lg mb-4">{error}</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                >
                  刷新页面
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 剧集选择器 */}
        <EpisodeSelector 
          totalEpisodes={totalEpisodes} 
          episodes_titles={detail?.episodes_titles || []}
          value={currentEpisodeIndex + 1} 
          onChange={(episodeNumber) => setCurrentEpisodeIndex(episodeNumber - 1)} 
          onSourceChange={handleSourceChange}
          currentSource={currentSource}
          currentId={currentId}
          videoTitle={videoTitle}
          videoYear={videoYear}
          availableSources={availableSources} 
          precomputedVideoInfo={precomputedVideoInfo}
        />
      </div>
    </PageLayout>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-black flex items-center justify-center text-white">加载中...</div>}>
      <PlayPageClient />
    </Suspense>
  );
}