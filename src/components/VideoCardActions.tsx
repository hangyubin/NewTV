/* eslint-disable @typescript-eslint/no-explicit-any */
import { ExternalLink, Heart, PlayCircleIcon, Trash2 } from 'lucide-react';
import React, { useMemo } from 'react';

import MobileActionSheet from './MobileActionSheet';

interface VideoCardActionsProps {
  id?: string;
  source?: string;
  title?: string;
  poster?: string;
  episodes?: number;
  source_name?: string;
  source_names?: string[];
  from: 'playrecord' | 'favorite' | 'search' | 'douban';
  currentEpisode?: number;
  isAggregate?: boolean;
  origin?: 'vod' | 'live';
  favorited?: boolean;
  searchFavorited?: boolean | null;
  showMobileActions: boolean;
  onCloseActions: () => void;
  onPlay: () => void;
  onPlayInNewTab: () => void;
  onFavoriteToggle: (e: React.MouseEvent) => Promise<void>;
  onDelete: (e: React.MouseEvent) => Promise<void>;
}

const VideoCardActions = React.memo(function VideoCardActions({
  id,
  source,
  title = '',
  poster = '',
  episodes,
  source_name,
  source_names,
  from,
  currentEpisode,
  isAggregate = false,
  origin = 'vod',
  favorited = false,
  searchFavorited = null,
  showMobileActions,
  onCloseActions,
  onPlay,
  onPlayInNewTab,
  onFavoriteToggle,
  onDelete,
}: VideoCardActionsProps) {
  // 配置：根据来源显示不同的操作
  const config = useMemo(() => {
    const baseConfigs = {
      playrecord: {
        showSourceName: true,
        showProgress: true,
        showPlayButton: true,
        showHeart: true,
        showCheckCircle: true,
        showDoubanLink: false,
        showRating: false,
        showYear: false,
      },
      favorite: {
        showSourceName: true,
        showProgress: false,
        showPlayButton: true,
        showHeart: true,
        showCheckCircle: false,
        showDoubanLink: false,
        showRating: false,
        showYear: false,
      },
      search: {
        showSourceName: true,
        showProgress: false,
        showPlayButton: true,
        showHeart: true,
        showCheckCircle: false,
        showDoubanLink: true,
        showRating: false,
        showYear: true,
      },
      douban: {
        showSourceName: false,
        showProgress: false,
        showPlayButton: true,
        showHeart: false,
        showCheckCircle: false,
        showDoubanLink: true,
        showRating: false,
        showYear: false,
      },
    };
    return baseConfigs[from] || baseConfigs.search;
  }, [from]);

  // 移动端操作菜单配置
  const mobileActions = useMemo(() => {
    const actions: any[] = [];

    // 播放操作
    if (config.showPlayButton) {
      actions.push({
        id: 'play',
        label: origin === 'live' ? '观看直播' : '播放',
        icon: <PlayCircleIcon size={20} />,
        onClick: onPlay,
        color: 'primary' as const,
      });
    }

    // 新标签页播放
    if (config.showPlayButton) {
      actions.push({
        id: 'play-new-tab',
        label: origin === 'live' ? '新标签页观看' : '新标签页播放',
        icon: <ExternalLink size={20} />,
        onClick: onPlayInNewTab,
        color: 'default' as const,
      });
    }

    // 收藏/取消收藏操作
    if (config.showHeart && from !== 'douban' && source && id) {
      const currentFavorited = from === 'search' ? searchFavorited : favorited;

      if (from === 'search') {
        // 搜索结果：根据加载状态显示不同的选项
        if (searchFavorited !== null) {
          // 已加载完成，显示实际的收藏状态
          actions.push({
            id: 'favorite',
            label: currentFavorited ? '取消收藏' : '添加收藏',
            icon: currentFavorited ? (
              <Heart size={20} className='fill-red-600 stroke-red-600' />
            ) : (
              <Heart size={20} className='fill-transparent stroke-red-500' />
            ),
            onClick: onFavoriteToggle,
            color: currentFavorited
              ? ('danger' as const)
              : ('default' as const),
          });
        } else {
          // 正在加载中，显示占位项
          actions.push({
            id: 'favorite-loading',
            label: '收藏加载中...',
            icon: <Heart size={20} />,
            onClick: () => undefined, // 加载中时不响应点击
            disabled: true,
          });
        }
      } else {
        // 非搜索结果：直接显示收藏选项
        actions.push({
          id: 'favorite',
          label: currentFavorited ? '取消收藏' : '添加收藏',
          icon: currentFavorited ? (
            <Heart size={20} className='fill-red-600 stroke-red-600' />
          ) : (
            <Heart size={20} className='fill-transparent stroke-red-500' />
          ),
          onClick: onFavoriteToggle,
          color: currentFavorited ? ('danger' as const) : ('default' as const),
        });
      }
    }

    // 删除播放记录操作
    if (config.showCheckCircle && from === 'playrecord' && source && id) {
      actions.push({
        id: 'delete',
        label: '删除记录',
        icon: <Trash2 size={20} />,
        onClick: onDelete,
        color: 'danger' as const,
      });
    }

    return actions;
  }, [
    config,
    from,
    source,
    id,
    favorited,
    searchFavorited,
    onPlay,
    onPlayInNewTab,
    onFavoriteToggle,
    onDelete,
    origin,
  ]);

  return (
    <MobileActionSheet
      isOpen={showMobileActions}
      onClose={onCloseActions}
      title={title}
      poster={poster}
      actions={mobileActions}
      sources={
        isAggregate && source_names
          ? Array.from(new Set(source_names))
          : undefined
      }
      isAggregate={isAggregate}
      sourceName={source_name}
      currentEpisode={currentEpisode}
      totalEpisodes={episodes}
      origin={origin}
    />
  );
});

export default VideoCardActions;
