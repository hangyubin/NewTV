/* eslint-disable @typescript-eslint/no-explicit-any,react-hooks/exhaustive-deps,@typescript-eslint/no-empty-function */

import { useRouter } from 'next/navigation';
import React, {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

import {
  deleteFavorite,
  deletePlayRecord,
  generateStorageKey,
  isFavorited,
  saveFavorite,
  subscribeToDataUpdates,
} from '@/lib/db.client';
import { getDoubanDetails } from '@/lib/douban.client';
import { cachedSearch } from '@/lib/searchCache';
import { DoubanDetail, SearchResult } from '@/lib/types';

import VideoCardActions from './VideoCardActions';
import VideoCardCore from './VideoCardCore';
import VideoCardModal from './VideoCardModal';

export interface VideoCardProps {
  id?: string;
  source?: string;
  title?: string;
  query?: string;
  poster?: string;
  episodes?: number;
  source_name?: string;
  source_names?: string[];
  progress?: number;
  year?: string;
  from: 'playrecord' | 'favorite' | 'search' | 'douban';
  currentEpisode?: number;
  douban_id?: number;
  onDelete?: () => void;
  rate?: string;
  type?: string;
  isBangumi?: boolean;
  isAggregate?: boolean;
  origin?: 'vod' | 'live';
  style?: React.CSSProperties;
  // 新增：图片优先加载属性
  priority?: boolean;
  // 新增：相同片名的统计信息
  sameTitleStats?: {
    totalCount: number;
    uniqueSources: string[];
  };
}

export type VideoCardHandle = {
  setEpisodes: (episodes?: number) => void;
  setSourceNames: (names?: string[]) => void;
  setDoubanId: (id?: number) => void;
};

const VideoCard = memo(
  forwardRef<VideoCardHandle, VideoCardProps>(function VideoCard(
    {
      id,
      title = '',
      query = '',
      poster = '',
      episodes,
      source,
      source_name,
      source_names,
      progress = 0,
      year,
      from,
      currentEpisode,
      douban_id,
      onDelete,
      rate,
      type = '',
      isBangumi = false,
      isAggregate = false,
      origin = 'vod',
      style,
      priority = false,
      sameTitleStats,
    }: VideoCardProps,
    ref
  ) {
    const router = useRouter();
    const [favorited, setFavorited] = useState(false);
    const [showMobileActions, setShowMobileActions] = useState(false);
    const [isImageLoading, setIsImageLoading] = useState(true); // 修复：需要使用isImageLoading变量
    const [searchFavorited, setSearchFavorited] = useState<boolean | null>(
      null
    ); // 搜索结果的收藏状态

    const [showCombinedModal, setShowCombinedModal] = useState(false);
    const [doubanDetail, setDoubanDetail] = useState<DoubanDetail | null>(null);
    const [videoDetail, setVideoDetail] = useState<SearchResult | null>(null);
    const [isLoadingModal, setIsLoadingModal] = useState(false);
    const [isApiLoading, setIsApiLoading] = useState(false);
    const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);

    // 可外部修改的可控字段 - 使用ref存储动态值，避免不必要的重渲染
    const dynamicValuesRef = useRef({
      episodes: episodes,
      sourceNames: source_names,
      doubanId: douban_id,
    });

    // 当props变化时更新ref值
    useEffect(() => {
      dynamicValuesRef.current.episodes = episodes;
    }, [episodes]);

    useEffect(() => {
      dynamicValuesRef.current.sourceNames = source_names;
    }, [source_names]);

    useEffect(() => {
      dynamicValuesRef.current.doubanId = douban_id;
    }, [douban_id]);

    useImperativeHandle(ref, () => ({
      setEpisodes: (eps?: number) => {
        dynamicValuesRef.current.episodes = eps;
      },
      setSourceNames: (names?: string[]) => {
        dynamicValuesRef.current.sourceNames = names;
      },
      setDoubanId: (id?: number) => {
        dynamicValuesRef.current.doubanId = id;
      },
    }));

    const actualTitle = title;
    const actualPoster = poster;
    // 对于播放记录，id是完整的存储key（source+id格式），需要解析
    const actualSource =
      from === 'playrecord' && id?.includes('+') ? id.split('+')[0] : source;
    const actualId =
      from === 'playrecord' && id?.includes('+') ? id.split('+')[1] : id;
    const actualDoubanId = dynamicValuesRef.current.doubanId;
    const actualEpisodes = dynamicValuesRef.current.episodes;
    const actualYear = year;
    const actualQuery = query || '';
    const actualSearchType = isAggregate
      ? actualEpisodes && actualEpisodes === 1
        ? 'movie'
        : 'tv'
      : type;

    // 获取收藏状态（搜索结果页面不检查）
    useEffect(() => {
      if (from === 'douban' || from === 'search' || !actualSource || !actualId)
        return;

      const fetchFavoriteStatus = async () => {
        try {
          const fav = await isFavorited(actualSource, actualId);
          setFavorited(fav);
        } catch (err) {
          throw new Error('检查收藏状态失败');
        }
      };

      fetchFavoriteStatus();

      // 监听收藏状态更新事件
      const storageKey = generateStorageKey(actualSource, actualId);
      const unsubscribe = subscribeToDataUpdates(
        'favoritesUpdated',
        (newFavorites: Record<string, any>) => {
          // 检查当前项目是否在新的收藏列表中
          const isNowFavorited = !!newFavorites[storageKey];
          setFavorited(isNowFavorited);
        }
      );

      return unsubscribe;
    }, [from, actualSource, actualId]);

    const handleToggleFavorite = useCallback(
      async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (from === 'douban' || !actualSource || !actualId) return;

        try {
          // 确定当前收藏状态
          const currentFavorited =
            from === 'search' ? searchFavorited : favorited;

          if (currentFavorited) {
            // 如果已收藏，删除收藏
            await deleteFavorite(actualSource, actualId);
            if (from === 'search') {
              setSearchFavorited(false);
            } else {
              setFavorited(false);
            }
          } else {
            // 如果未收藏，添加收藏
            await saveFavorite(actualSource, actualId, {
              title: actualTitle,
              source_name: source_name || '',
              year: actualYear || '',
              cover: actualPoster,
              total_episodes: actualEpisodes ?? 1,
              save_time: Date.now(),
            });
            if (from === 'search') {
              setSearchFavorited(true);
            } else {
              setFavorited(true);
            }
          }
        } catch (err) {
          throw new Error('切换收藏状态失败');
        }
      },
      [
        from,
        actualSource,
        actualId,
        actualTitle,
        source_name,
        actualYear,
        actualPoster,
        actualEpisodes,
        favorited,
        searchFavorited,
      ]
    );

    const handleDeleteRecord = useCallback(
      async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (from !== 'playrecord' || !id) return;
        try {
          // 对于观看记录页面，id是完整的存储key，需要解析出source和id
          if (from === 'playrecord') {
            const [source, videoId] = id.split('+');
            if (source && videoId) {
              await deletePlayRecord(source, videoId);
            }
          } else if (actualSource && actualId) {
            // 对于其他页面，使用原有逻辑
            await deletePlayRecord(actualSource, actualId);
          }
          onDelete?.();
        } catch (err) {
          throw new Error('删除播放记录失败');
        }
      },
      [from, actualSource, actualId, id, onDelete]
    );

    // 跳转到播放页面的函数
    const navigateToPlay = useCallback(() => {
      // 清除自动播放计时器，防止重复跳转
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
        autoPlayTimerRef.current = null;
      }

      // 构建豆瓣ID参数
      const doubanIdParam =
        actualDoubanId && actualDoubanId > 0
          ? `&douban_id=${actualDoubanId}`
          : '';

      if (origin === 'live' && actualSource && actualId) {
        // 直播内容跳转到直播页面
        const url = `/live?source=${actualSource.replace(
          'live_',
          ''
        )}&id=${actualId.replace('live_', '')}`;
        router.push(url);
      } else if (
        from === 'douban' ||
        (isAggregate && !actualSource && !actualId)
      ) {
        const url = `/play?title=${encodeURIComponent(actualTitle.trim())}${
          actualYear ? `&year=${actualYear}` : ''
        }${doubanIdParam}${
          actualSearchType ? `&stype=${actualSearchType}` : ''
        }${isAggregate ? '&prefer=true' : ''}${
          actualQuery ? `&stitle=${encodeURIComponent(actualQuery.trim())}` : ''
        }`;
        router.push(url);
      } else if (actualSource && actualId) {
        const url = `/play?source=${actualSource}&id=${actualId}&title=${encodeURIComponent(
          actualTitle
        )}${actualYear ? `&year=${actualYear}` : ''}${doubanIdParam}${
          isAggregate ? '&prefer=true' : ''
        }${
          actualQuery ? `&stitle=${encodeURIComponent(actualQuery.trim())}` : ''
        }${actualSearchType ? `&stype=${actualSearchType}` : ''}`;
        router.push(url);
      }
    }, [
      origin,
      from,
      actualSource,
      actualId,
      router,
      actualTitle,
      actualYear,
      isAggregate,
      actualQuery,
      actualSearchType,
      actualDoubanId,
    ]);

    const handleDoubanClick = useCallback(async () => {
      // 防止重复调用
      if (isApiLoading || showCombinedModal) {
        return;
      }

      // 立即显示模态框和加载状态
      setIsApiLoading(true);
      setShowCombinedModal(true);
      setIsLoadingModal(true);
      setDoubanDetail(null);
      setVideoDetail(null);

      try {
        // 并行执行API请求 - 使用请求队列优化
        const [doubanRes, searchRes] = await Promise.all([
          // 获取豆瓣详情 - 高优先级
          actualDoubanId
            ? getDoubanDetails(actualDoubanId.toString())
                .then((res) => (res.code === 200 ? res.data : null))
                .catch(() => null)
            : Promise.resolve(null),
          // 获取搜索详情 - 使用带缓存的搜索API
          cachedSearch(actualTitle.trim()),
        ]);

        // 处理结果
        if (doubanRes) {
          // 豆瓣API成功：显示豆瓣信息
          setDoubanDetail(doubanRes);
          // 如果搜索也成功，设置搜索结果
          if (searchRes?.results?.length > 0) {
            setVideoDetail(searchRes.results[0]);
          }
          setIsLoadingModal(false);

          // 5秒后自动播放
          autoPlayTimerRef.current = setTimeout(() => {
            if (searchRes?.results?.length > 0) {
              navigateToPlay();
            }
          }, 5000);
        } else {
          // 豆瓣API失败：使用搜索结果作为备用方案
          if (searchRes?.results?.length > 0) {
            // 查找匹配title且有desc的结果
            const matchedResult =
              searchRes.results.find(
                (result: SearchResult) =>
                  result.title &&
                  result.title.includes(actualTitle.trim()) &&
                  result.desc
              ) ||
              searchRes.results.find((result: SearchResult) => result.desc) ||
              searchRes.results[0];

            setVideoDetail(matchedResult);
            setIsLoadingModal(false);

            // 5秒后跳转到第一个源播放
            autoPlayTimerRef.current = setTimeout(() => {
              const firstResult = searchRes.results[0];
              if (firstResult.id && firstResult.source) {
                navigateToPlay();
              }
            }, 5000);
          } else {
            // 搜索也失败
            setIsLoadingModal(false);
          }
        }
      } catch (error) {
        setIsLoadingModal(false);
      } finally {
        setIsApiLoading(false);
      }
    }, [
      actualDoubanId,
      actualTitle,
      isApiLoading,
      showCombinedModal,
      setIsApiLoading,
      setShowCombinedModal,
      setIsLoadingModal,
      setDoubanDetail,
      setVideoDetail,
      navigateToPlay,
    ]);

    // 组件卸载时清理自动播放计时器
    useEffect(() => {
      return () => {
        if (autoPlayTimerRef.current) {
          clearTimeout(autoPlayTimerRef.current);
          autoPlayTimerRef.current = null;
        }
      };
    }, []);

    const handleClick = useCallback(() => {
      // 如果是豆瓣来源，展示豆瓣详情
      if (from === 'douban') {
        handleDoubanClick();
      } else if (isAggregate && !actualSource && !actualId) {
        // 如果是聚合搜索且没有具体的source和id（即搜索源状态），使用统一的处理逻辑
        handleDoubanClick();
      } else {
        // 其他情况直接跳转
        navigateToPlay();
      }
    }, [
      from,
      isAggregate,
      actualSource,
      actualId,
      handleDoubanClick,
      navigateToPlay,
    ]);

    // 新标签页播放处理函数
    const handlePlayInNewTab = useCallback(() => {
      // 构建豆瓣ID参数
      const doubanIdParam =
        actualDoubanId && actualDoubanId > 0
          ? `&douban_id=${actualDoubanId}`
          : '';

      if (origin === 'live' && actualSource && actualId) {
        // 直播内容跳转到直播页面
        const url = `/live?source=${actualSource.replace(
          'live_',
          ''
        )}&id=${actualId.replace('live_', '')}`;
        window.open(url, '_blank');
      } else if (
        from === 'douban' ||
        (isAggregate && !actualSource && !actualId)
      ) {
        const url = `/play?title=${encodeURIComponent(actualTitle.trim())}${
          actualYear ? `&year=${actualYear}` : ''
        }${doubanIdParam}${
          actualSearchType ? `&stype=${actualSearchType}` : ''
        }${isAggregate ? '&prefer=true' : ''}${
          actualQuery ? `&stitle=${encodeURIComponent(actualQuery.trim())}` : ''
        }`;
        window.open(url, '_blank');
      } else if (actualSource && actualId) {
        const url = `/play?source=${actualSource}&id=${actualId}&title=${encodeURIComponent(
          actualTitle
        )}${actualYear ? `&year=${actualYear}` : ''}${doubanIdParam}${
          isAggregate ? '&prefer=true' : ''
        }${
          actualQuery ? `&stitle=${encodeURIComponent(actualQuery.trim())}` : ''
        }${actualSearchType ? `&stype=${actualSearchType}` : ''}`;
        window.open(url, '_blank');
      }
    }, [
      origin,
      from,
      actualSource,
      actualId,
      actualTitle,
      actualYear,
      isAggregate,
      actualQuery,
      actualSearchType,
      actualDoubanId,
    ]);

    // 检查搜索结果的收藏状态
    const checkSearchFavoriteStatus = useCallback(async () => {
      if (
        from === 'search' &&
        !isAggregate &&
        actualSource &&
        actualId &&
        searchFavorited === null
      ) {
        try {
          const fav = await isFavorited(actualSource, actualId);
          setSearchFavorited(fav);
        } catch (err) {
          setSearchFavorited(false);
        }
      }
    }, [from, isAggregate, actualSource, actualId, searchFavorited]);

    return (
      <>
        {/* 核心卡片组件 */}
        <VideoCardCore
          id={id}
          title={actualTitle}
          poster={actualPoster}
          year={actualYear}
          rate={rate}
          episodes={actualEpisodes}
          source_name={source_name}
          source_names={dynamicValuesRef.current.sourceNames}
          progress={progress}
          from={from}
          currentEpisode={currentEpisode}
          douban_id={actualDoubanId}
          type={actualSearchType}
          isBangumi={isBangumi}
          isAggregate={isAggregate}
          origin={origin}
          style={style}
          priority={priority}
          sameTitleStats={sameTitleStats}
          onPlay={handleClick}
          onFavoriteToggle={handleToggleFavorite}
          onDelete={handleDeleteRecord}
          onContextMenu={(e) => {
            // 阻止默认右键菜单
            e.preventDefault();
            e.stopPropagation();

            // 右键弹出操作菜单
            setShowMobileActions(true);

            // 异步检查收藏状态，不阻塞菜单显示
            if (
              from === 'search' &&
              !isAggregate &&
              actualSource &&
              actualId &&
              searchFavorited === null
            ) {
              checkSearchFavoriteStatus();
            }

            return false;
          }}
          onDragStart={(e) => {
            // 阻止拖拽
            e.preventDefault();
            return false;
          }}
          favorited={favorited}
          searchFavorited={searchFavorited}
          isImageLoading={isImageLoading}
        />

        {/* 移动端操作菜单 */}
        <VideoCardActions
          id={actualId}
          source={actualSource}
          title={actualTitle}
          poster={actualPoster}
          episodes={actualEpisodes}
          source_name={source_name}
          source_names={dynamicValuesRef.current.sourceNames}
          from={from}
          currentEpisode={currentEpisode}
          isAggregate={isAggregate}
          origin={origin}
          favorited={favorited}
          searchFavorited={searchFavorited}
          showMobileActions={showMobileActions}
          onCloseActions={() => setShowMobileActions(false)}
          onPlay={handleClick}
          onPlayInNewTab={handlePlayInNewTab}
          onFavoriteToggle={handleToggleFavorite}
          onDelete={handleDeleteRecord}
        />

        {/* 混合详情模态框 */}
        <VideoCardModal
          isVisible={showCombinedModal}
          isLoading={isLoadingModal}
          doubanDetail={doubanDetail}
          videoDetail={videoDetail}
          poster={actualPoster}
          title={actualTitle}
          onClose={() => {
            if (autoPlayTimerRef.current) {
              clearTimeout(autoPlayTimerRef.current);
              autoPlayTimerRef.current = null;
            }
            setShowCombinedModal(false);
            setDoubanDetail(null);
            setVideoDetail(null);
            setIsLoadingModal(false);
          }}
          onPlay={() => {
            setShowCombinedModal(false);
            setDoubanDetail(null);
            setVideoDetail(null);
            setIsLoadingModal(false);
            navigateToPlay();
          }}
          onClearAutoPlayTimer={() => {
            if (autoPlayTimerRef.current) {
              clearTimeout(autoPlayTimerRef.current);
              autoPlayTimerRef.current = null;
            }
          }}
        />
      </>
    );
  })
);

export default VideoCard;
