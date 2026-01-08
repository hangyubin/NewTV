/* eslint-disable @typescript-eslint/no-explicit-any */
import { Link, PlayCircleIcon } from 'lucide-react';
import Image from 'next/image';
import React, { forwardRef, memo, useCallback, useMemo } from 'react';

import { processImageUrl } from '@/lib/utils';

interface VideoCardCoreProps {
  id?: string;
  title?: string;
  poster?: string;
  year?: string;
  rate?: string;
  episodes?: number;
  source_name?: string;
  source_names?: string[];
  progress?: number;
  from: 'playrecord' | 'favorite' | 'search' | 'douban';
  currentEpisode?: number;
  douban_id?: number;
  type?: string;
  isBangumi?: boolean;
  isAggregate?: boolean;
  origin?: 'vod' | 'live';
  style?: React.CSSProperties;
  priority?: boolean;
  sameTitleStats?: {
    totalCount: number;
    uniqueSources: string[];
  };
  onPlay?: () => void;
  onFavoriteToggle?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onDragStart?: (e: React.DragEvent) => void;
  favorited?: boolean;
  searchFavorited?: boolean | null;
  isImageLoading?: boolean;
}

const VideoCardCore = memo(
  forwardRef<HTMLDivElement, VideoCardCoreProps>(function VideoCardCore(
    {
      id: _id,
      title = '',
      poster = '',
      year,
      rate,
      episodes,
      source_name,
      source_names,
      progress = 0,
      from,
      currentEpisode,
      douban_id,
      type: _type = '',
      isBangumi = false,
      isAggregate = false,
      origin = 'vod',
      style,
      priority = false,
      sameTitleStats,
      onPlay,
      onFavoriteToggle,
      onDelete,
      onContextMenu,
      onDragStart,
      favorited = false,
      searchFavorited: _searchFavorited = null,
      isImageLoading: _isImageLoading = false, // 保留参数但在组件内部不使用，使用默认值
    }: VideoCardCoreProps,
    ref
  ) {
    const actualTitle = title;
    const actualPoster = poster;
    const actualYear = year;
    const actualDoubanId = douban_id;
    const actualEpisodes = episodes;

    // 配置：根据来源显示不同的元素
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
          showRating: !!rate,
          showYear: false,
        },
      };
      return baseConfigs[from] || baseConfigs.search;
    }, [from, rate]);

    // 处理点击播放
    const handlePlayClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onPlay?.();
      },
      [onPlay]
    );

    // 处理收藏切换
    const handleFavoriteClick = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onFavoriteToggle?.(e);
      },
      [onFavoriteToggle]
    );

    // 处理删除记录
    const handleDeleteClick = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onDelete?.(e);
      },
      [onDelete]
    );

    return (
      <div
        ref={ref}
        className='group relative w-full rounded-apple-xl cursor-pointer transition-transform duration-200 ease-out hover:scale-105 hover:shadow-elevated hover:z-10 flex flex-col h-full'
        style={
          {
            WebkitUserSelect: 'none',
            userSelect: 'none',
            WebkitTouchCallout: 'none',
            WebkitTapHighlightColor: 'transparent',
            touchAction: 'manipulation',
            pointerEvents: 'auto',
            ...style,
          } as React.CSSProperties
        }
        onContextMenu={onContextMenu}
        onDragStart={onDragStart}
      >
        {/* 海报容器 */}
        <div
          className={`relative aspect-[2/3] overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800 transition-all duration-400 ease-in-out group-hover:shadow-2xl group-hover:shadow-black/30 dark:group-hover:shadow-black/40 glass ${
            origin === 'live'
              ? 'ring-1 ring-gray-300/80 dark:ring-gray-600/80'
              : ''
          }`}
          style={
            {
              WebkitUserSelect: 'none',
              userSelect: 'none',
              WebkitTouchCallout: 'none',
            } as React.CSSProperties
          }
        >
          {/* 渐变光泽动画层 - 简化动画并添加硬件加速 */}
          <div
            className='absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-10'
            style={{
              background:
                'linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
              backgroundSize: '150% 100%',
              animation: 'card-shimmer 2s ease-in-out infinite',
              // 硬件加速优化
              transform: 'translateZ(0)',
              willChange: 'opacity',
            }}
          />

          {/* 骨架屏 */}
          {/* {!isImageLoading && (
            <ImagePlaceholder
              aspectRatio='aspect-[2/3]'
              className='animate-pulse rounded-lg'
            />
          )} */}

          {/* 图片 */}
          <Image
            src={processImageUrl(actualPoster)}
            alt={actualTitle}
            fill
            className={`${
              origin === 'live' ? 'object-contain' : 'object-cover'
            } transition-all duration-600 ease-in-out opacity-100 scale-100`}
            referrerPolicy='no-referrer'
            loading='lazy'
            priority={priority}
            quality={75}
            onContextMenu={(e) => {
              e.preventDefault();
            }}
            style={
              {
                WebkitUserSelect: 'none',
                userSelect: 'none',
                WebkitTouchCallout: 'none',
                pointerEvents: 'none',
              } as React.CSSProperties
            }
          />

          {/* 悬浮遮罩 */}
          <div
            className='absolute inset-0 bg-linear-to-t from-black/90 via-black/30 to-transparent transition-all duration-400 ease-in-out opacity-0 group-hover:opacity-100'
            style={
              {
                WebkitUserSelect: 'none',
                userSelect: 'none',
                WebkitTouchCallout: 'none',
              } as React.CSSProperties
            }
          />

          {/* 播放按钮 */}
          {config.showPlayButton && (
            <div
              data-button='true'
              className='absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-300 ease-in-out delay-75 group-hover:opacity-100 group-hover:scale-100'
              style={
                {
                  WebkitUserSelect: 'none',
                  userSelect: 'none',
                  WebkitTouchCallout: 'none',
                } as React.CSSProperties
              }
            >
              {from === 'playrecord' && progress !== undefined ? (
                // 观看记录显示百分比进度
                <div className='flex flex-col items-center justify-center text-white'>
                  <div className='relative w-16 h-16 mb-2'>
                    {/* 圆形进度环 */}
                    <svg
                      className='w-16 h-16 transform -rotate-90'
                      viewBox='0 0 64 64'
                    >
                      {/* 背景圆环 */}
                      <circle
                        cx='32'
                        cy='32'
                        r='28'
                        stroke='rgba(255,255,255,0.2)'
                        strokeWidth='4'
                        fill='none'
                      />
                      {/* 进度圆环 */}
                      <circle
                        cx='32'
                        cy='32'
                        r='28'
                        stroke='white'
                        strokeWidth='4'
                        fill='none'
                        strokeDasharray={`${2 * Math.PI * 28}`}
                        strokeDashoffset={`${
                          2 * Math.PI * 28 * (1 - progress / 100)
                        }`}
                        className='transition-all duration-500 ease-out'
                        strokeLinecap='round'
                      />
                    </svg>
                    {/* 中心播放图标 */}
                    <div className='absolute inset-0 flex items-center justify-center'>
                      <PlayCircleIcon
                        size={24}
                        strokeWidth={1}
                        className='text-white fill-transparent hover:fill-blue-400 transition-all duration-200'
                        onClick={handlePlayClick}
                      />
                    </div>
                  </div>
                  {/* 百分比文字 */}
                  <div className='text-sm font-semibold bg-black/50 px-2 py-1 rounded-full'>
                    {Math.round(progress)}%
                  </div>
                </div>
              ) : (
                <PlayCircleIcon
                  size={50}
                  strokeWidth={0.8}
                  className='text-white fill-transparent transition-all duration-300 ease-out hover:fill-blue-500 hover:scale-[1.1] active:scale-[0.95]'
                  onClick={handlePlayClick}
                  style={
                    {
                      WebkitUserSelect: 'none',
                      userSelect: 'none',
                      WebkitTouchCallout: 'none',
                    } as React.CSSProperties
                  }
                />
              )}
            </div>
          )}

          {/* 操作按钮 */}
          {(config.showHeart || config.showCheckCircle) && (
            <div
              data-button='true'
              className='absolute bottom-3 right-3 flex gap-3 opacity-0 translate-y-2 transition-all duration-300 ease-in-out sm:group-hover:opacity-100 sm:group-hover:translate-y-0'
              style={
                {
                  WebkitUserSelect: 'none',
                  userSelect: 'none',
                  WebkitTouchCallout: 'none',
                } as React.CSSProperties
              }
            >
              {config.showCheckCircle && (
                <svg
                  onClick={handleDeleteClick}
                  width='20'
                  height='20'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  className='text-white transition-all duration-300 ease-out hover:stroke-red-500 hover:scale-[1.1]'
                  style={
                    {
                      WebkitUserSelect: 'none',
                      userSelect: 'none',
                      WebkitTouchCallout: 'none',
                    } as React.CSSProperties
                  }
                >
                  <path d='M3 6h18' />
                  <path d='M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6' />
                  <path d='M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2' />
                  <line x1='10' y1='11' x2='10' y2='17' />
                  <line x1='14' y1='11' x2='14' y2='17' />
                </svg>
              )}
              {config.showHeart && (
                <svg
                  onClick={handleFavoriteClick}
                  width='20'
                  height='20'
                  viewBox='0 0 24 24'
                  fill={favorited ? 'red' : 'transparent'}
                  stroke={favorited ? 'red' : 'white'}
                  strokeWidth='2'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  className={`transition-all duration-300 ease-out hover:scale-[1.1] ${
                    !favorited ? 'hover:stroke-red-400' : ''
                  }`}
                  style={
                    {
                      WebkitUserSelect: 'none',
                      userSelect: 'none',
                      WebkitTouchCallout: 'none',
                    } as React.CSSProperties
                  }
                >
                  <path d='M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z' />
                </svg>
              )}
            </div>
          )}

          {/* 年份徽章 */}
          {config.showYear &&
            actualYear &&
            actualYear !== 'unknown' &&
            actualYear.trim() !== '' && (
              <div
                className='absolute top-2 bg-black/50 text-white text-xs font-medium px-2 py-1 rounded backdrop-blur-sm shadow-sm transition-all duration-300 ease-out group-hover:opacity-90 left-2'
                style={
                  {
                    WebkitUserSelect: 'none',
                    userSelect: 'none',
                    WebkitTouchCallout: 'none',
                  } as React.CSSProperties
                }
              >
                {actualYear}
              </div>
            )}

          {/* 评分徽章 */}
          {config.showRating && rate && (
            <div
              className='absolute top-2 right-2 bg-pink-500 text-white text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center shadow-md transition-all duration-300 ease-out group-hover:scale-110'
              style={
                {
                  WebkitUserSelect: 'none',
                  userSelect: 'none',
                  WebkitTouchCallout: 'none',
                } as React.CSSProperties
              }
            >
              {rate}
            </div>
          )}

          {/* 剧集信息 */}
          {actualEpisodes && actualEpisodes > 1 && (
            <div
              className='absolute top-2 right-2 bg-black text-white text-xs font-semibold px-2 py-1 rounded-md shadow-md transition-all duration-300 ease-out group-hover:scale-110'
              style={
                {
                  WebkitUserSelect: 'none',
                  userSelect: 'none',
                  WebkitTouchCallout: 'none',
                } as React.CSSProperties
              }
            >
              {currentEpisode
                ? `${currentEpisode}/${actualEpisodes}`
                : actualEpisodes}
            </div>
          )}

          {/* 豆瓣链接 */}
          {config.showDoubanLink && actualDoubanId && actualDoubanId !== 0 && (
            <a
              href={
                isBangumi
                  ? `https://bgm.tv/subject/${actualDoubanId.toString()}`
                  : `https://movie.douban.com/subject/${actualDoubanId.toString()}`
              }
              target='_blank'
              rel='noopener noreferrer'
              onClick={(e) => e.stopPropagation()}
              className='absolute top-2 left-2 opacity-0 -translate-x-2 transition-all duration-300 ease-in-out delay-100 sm:group-hover:opacity-100 sm:group-hover:translate-x-0'
              style={
                {
                  WebkitUserSelect: 'none',
                  userSelect: 'none',
                  WebkitTouchCallout: 'none',
                } as React.CSSProperties
              }
            >
              <div
                className='bg-black text-white text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center shadow-md hover:bg-gray-800 hover:scale-[1.1] transition-all duration-300 ease-out'
                style={
                  {
                    WebkitUserSelect: 'none',
                    userSelect: 'none',
                    WebkitTouchCallout: 'none',
                  } as React.CSSProperties
                }
              >
                <Link
                  size={16}
                  style={
                    {
                      WebkitUserSelect: 'none',
                      userSelect: 'none',
                      WebkitTouchCallout: 'none',
                      pointerEvents: 'none',
                    } as React.CSSProperties
                  }
                />
              </div>
            </a>
          )}

          {/* 聚合播放源指示器 */}
          {isAggregate && source_names && source_names.length > 0 && (
            <div
              className='absolute bottom-2 right-2 opacity-0 transition-all duration-300 ease-in-out delay-75 sm:group-hover:opacity-100'
              style={
                {
                  WebkitUserSelect: 'none',
                  userSelect: 'none',
                  WebkitTouchCallout: 'none',
                } as React.CSSProperties
              }
            >
              <div
                className='relative group/sources'
                style={
                  {
                    WebkitUserSelect: 'none',
                    userSelect: 'none',
                    WebkitTouchCallout: 'none',
                  } as React.CSSProperties
                }
              >
                <div
                  className='glass-strong text-white text-xs font-bold w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center shadow-glass hover:scale-[1.1] transition-all duration-300 ease-out cursor-pointer'
                  style={
                    {
                      WebkitUserSelect: 'none',
                      userSelect: 'none',
                      WebkitTouchCallout: 'none',
                    } as React.CSSProperties
                  }
                >
                  {Array.from(new Set(source_names)).length}
                </div>

                {/* 播放源详情悬浮框 - 简化版，详细逻辑移至父组件 */}
                <div
                  className='absolute bottom-full mb-2 opacity-0 invisible group-hover/sources:opacity-100 group-hover/sources:visible transition-all duration-200 ease-out delay-100 pointer-events-none z-50 right-0 sm:right-0 -translate-x-0 sm:translate-x-0'
                  style={
                    {
                      WebkitUserSelect: 'none',
                      userSelect: 'none',
                      WebkitTouchCallout: 'none',
                    } as React.CSSProperties
                  }
                >
                  <div
                    className='glass-strong text-white text-xs sm:text-xs rounded-apple-lg shadow-floating border border-white/30 p-1.5 sm:p-2 min-w-[100px] sm:min-w-[120px] max-w-[140px] sm:max-w-[200px] overflow-hidden bg-black/90 dark:bg-gray-900/90'
                    style={
                      {
                        WebkitUserSelect: 'none',
                        userSelect: 'none',
                        WebkitTouchCallout: 'none',
                      } as React.CSSProperties
                    }
                  >
                    {/* 简化的播放源显示 */}
                    <div className='space-y-0.5 sm:space-y-1'>
                      {Array.from(new Set(source_names))
                        .slice(0, 6)
                        .map((sourceName, index) => (
                          <div
                            key={index}
                            className='flex items-center gap-1 sm:gap-1.5'
                          >
                            <div className='w-0.5 h-0.5 sm:w-1 sm:h-1 bg-blue-400 rounded-full flex-shrink-0'></div>
                            <span
                              className='truncate text-[10px] sm:text-xs leading-tight'
                              title={sourceName}
                            >
                              {sourceName}
                            </span>
                          </div>
                        ))}
                    </div>
                    {Array.from(new Set(source_names)).length > 6 && (
                      <div className='mt-1 sm:mt-2 pt-1 sm:pt-1.5 border-t border-gray-600/70'>
                        <div className='flex items-center justify-center'>
                          <span className='text-[10px] sm:text-xs font-medium'>
                            +{Array.from(new Set(source_names)).length - 6}{' '}
                            播放源
                          </span>
                        </div>
                      </div>
                    )}
                    <div className='absolute top-full right-2 sm:right-3 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] sm:border-l-[6px] sm:border-r-[6px] sm:border-t-[6px] border-transparent border-t-gray-800/90'></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 相同标题统计指示器 */}
          {!isAggregate && sameTitleStats && sameTitleStats.totalCount > 1 && (
            <div
              className='absolute bottom-2 right-2 opacity-0 transition-all duration-300 ease-in-out delay-75 sm:group-hover:opacity-100'
              style={
                {
                  WebkitUserSelect: 'none',
                  userSelect: 'none',
                  WebkitTouchCallout: 'none',
                } as React.CSSProperties
              }
            >
              <div
                className='relative group/same-title'
                style={
                  {
                    WebkitUserSelect: 'none',
                    userSelect: 'none',
                    WebkitTouchCallout: 'none',
                  } as React.CSSProperties
                }
              >
                <div
                  className='bg-purple-500/80 text-white text-xs font-bold w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center shadow-glass hover:scale-[1.1] transition-all duration-300 ease-out cursor-pointer backdrop-blur-sm'
                  style={
                    {
                      WebkitUserSelect: 'none',
                      userSelect: 'none',
                      WebkitTouchCallout: 'none',
                    } as React.CSSProperties
                  }
                >
                  {sameTitleStats.totalCount}
                </div>

                {/* 相同标题详情悬浮框 - 简化版 */}
                <div
                  className='absolute bottom-full mb-2 opacity-0 invisible group-hover/same-title:opacity-100 group-hover/same-title:visible transition-all duration-200 ease-out delay-100 pointer-events-none z-50 right-0 sm:right-0 -translate-x-0 sm:translate-x-0'
                  style={
                    {
                      WebkitUserSelect: 'none',
                      userSelect: 'none',
                      WebkitTouchCallout: 'none',
                    } as React.CSSProperties
                  }
                >
                  <div
                    className='glass-strong text-white text-xs sm:text-xs rounded-apple-lg shadow-floating border border-white/20 p-1.5 sm:p-2 min-w-[120px] sm:min-w-[150px] max-w-[180px] sm:max-w-[220px] overflow-hidden'
                    style={
                      {
                        WebkitUserSelect: 'none',
                        userSelect: 'none',
                        WebkitTouchCallout: 'none',
                      } as React.CSSProperties
                    }
                  >
                    <div className='mb-2 text-sm font-semibold text-center text-purple-300'>
                      相同片名
                    </div>
                    <div className='space-y-0.5 sm:space-y-1'>
                      {sameTitleStats.uniqueSources
                        .slice(0, 8)
                        .map((sourceName, index) => (
                          <div
                            key={index}
                            className='flex items-center gap-1 sm:gap-1.5'
                          >
                            <div className='w-0.5 h-0.5 sm:w-1 sm:h-1 bg-purple-400 rounded-full flex-shrink-0'></div>
                            <span
                              className='truncate text-[10px] sm:text-xs leading-tight'
                              title={sourceName}
                            >
                              {sourceName}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 进度条 */}
        {config.showProgress && progress !== undefined && (
          <div
            className='mt-1 h-1 w-full bg-gray-200 rounded-full overflow-hidden'
            style={
              {
                WebkitUserSelect: 'none',
                userSelect: 'none',
                WebkitTouchCallout: 'none',
              } as React.CSSProperties
            }
          >
            <div
              className='h-full bg-blue-500 transition-all duration-500 ease-out'
              style={
                {
                  width: `${progress}%`,
                  WebkitUserSelect: 'none',
                  userSelect: 'none',
                  WebkitTouchCallout: 'none',
                } as React.CSSProperties
              }
            />
          </div>
        )}

        <div
          className='mt-2 text-center'
          style={
            {
              WebkitUserSelect: 'none',
              userSelect: 'none',
              WebkitTouchCallout: 'none',
            } as React.CSSProperties
          }
        >
          <div
            className='relative px-1'
            style={
              {
                WebkitUserSelect: 'none',
                userSelect: 'none',
                WebkitTouchCallout: 'none',
              } as React.CSSProperties
            }
          >
            {/* 背景高亮效果 */}
            <div className='absolute inset-0 bg-linear-to-r from-transparent via-green-50/0 to-transparent dark:via-green-900/0 group-hover:via-green-50/50 dark:group-hover:via-green-900/30 transition-all duration-300 rounded-md'></div>

            {/* 标题文字 */}
            <span
              className='block text-xs sm:text-sm font-bold line-clamp-2 text-gray-900 dark:text-gray-100 transition-all duration-300 ease-in-out peer relative z-10'
              style={
                {
                  WebkitUserSelect: 'none',
                  userSelect: 'none',
                  WebkitTouchCallout: 'none',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  lineHeight: '1.4',
                  WebkitFontSmoothing: 'antialiased',
                  textRendering: 'optimizeLegibility',
                } as React.CSSProperties
              }
            >
              {actualTitle}
            </span>

            {/* 自定义 tooltip */}
            <div
              className='absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-800 text-white text-xs rounded-md shadow-lg opacity-0 invisible peer-hover:opacity-100 peer-hover:visible transition-all duration-200 ease-out delay-100 whitespace-nowrap pointer-events-none'
              style={
                {
                  WebkitUserSelect: 'none',
                  userSelect: 'none',
                  WebkitTouchCallout: 'none',
                } as React.CSSProperties
              }
            >
              {actualTitle}
              <div
                className='absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800'
                style={
                  {
                    WebkitUserSelect: 'none',
                    userSelect: 'none',
                    WebkitTouchCallout: 'none',
                  } as React.CSSProperties
                }
              ></div>
            </div>
          </div>
          {config.showSourceName && source_name && (
            <span
              className='block text-xs text-gray-500 dark:text-gray-400 mt-1'
              style={
                {
                  WebkitUserSelect: 'none',
                  userSelect: 'none',
                  WebkitTouchCallout: 'none',
                } as React.CSSProperties
              }
            >
              <span
                className='inline-block border rounded px-2 py-0.5 border-gray-500/60 dark:border-gray-400/60 transition-all duration-300 ease-in-out group-hover:border-black/60 group-hover:text-black dark:group-hover:text-white'
                style={
                  {
                    WebkitUserSelect: 'none',
                    userSelect: 'none',
                    WebkitTouchCallout: 'none',
                  } as React.CSSProperties
                }
              >
                {origin === 'live' && (
                  <svg
                    width='12'
                    height='12'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    className='inline-block text-gray-500 dark:text-gray-400 mr-1.5'
                  >
                    <circle cx='12' cy='12' r='10' />
                    <path d='M10 8v8l6-4z' />
                  </svg>
                )}
                {source_name}
              </span>
            </span>
          )}
        </div>
      </div>
    );
  })
);

export default VideoCardCore;
