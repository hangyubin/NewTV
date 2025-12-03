/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { SearchResult } from '@/lib/types';

import VideoCard from '@/components/VideoCard';

interface VirtualSearchGridProps {
  // 搜索结果数据
  allResults: SearchResult[];
  filteredResults: SearchResult[];
  aggregatedResults: [string, SearchResult[]][];
  filteredAggResults: [string, SearchResult[]][];

  // 视图模式
  viewMode: 'agg' | 'all';

  // 搜索相关
  searchQuery: string;
  isLoading: boolean;

  // VideoCard相关props
  groupRefs: React.MutableRefObject<Map<string, React.RefObject<any>>>;
  groupStatsRef: React.MutableRefObject<Map<string, any>>;
  getGroupRef: (key: string) => React.RefObject<any>;
  computeGroupStats: (group: SearchResult[]) => any;
}

// 渐进式加载配置
const INITIAL_BATCH_SIZE = 12;
const LOAD_MORE_BATCH_SIZE = 8;

export const VirtualSearchGrid: React.FC<VirtualSearchGridProps> = ({
  allResults: _allResults,
  filteredResults,
  aggregatedResults: _aggregatedResults,
  filteredAggResults,
  viewMode,
  searchQuery,
  isLoading,
  groupRefs: _groupRefs,
  groupStatsRef,
  getGroupRef,
  computeGroupStats,
}) => {
  // 渐进式加载状态
  const [visibleItemCount, setVisibleItemCount] = useState(INITIAL_BATCH_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // 选择当前显示的数据
  const currentData = viewMode === 'agg' ? filteredAggResults : filteredResults;
  const totalItemCount = currentData.length;

  // 实际显示的项目数量（考虑渐进式加载）
  const displayItemCount = Math.min(visibleItemCount, totalItemCount);

  // 重置可见项目数量（当搜索或过滤变化时）
  useEffect(() => {
    setVisibleItemCount(INITIAL_BATCH_SIZE);
    setIsLoadingMore(false);
  }, [currentData, viewMode]);

  // 保存上一次的totalItemCount和displayItemCount
  const prevStateRef = useRef({ totalItemCount, displayItemCount });

  // 当totalItemCount增加时，如果当前已经显示了所有项目，自动增加可见项目数量
  useEffect(() => {
    const { totalItemCount: prevTotal, displayItemCount: prevDisplay } =
      prevStateRef.current;

    // 如果当前已经显示了所有项目，但totalItemCount增加了，自动加载更多
    if (prevDisplay === prevTotal && totalItemCount > displayItemCount) {
      // 计算需要增加的项目数量
      const newVisibleCount = Math.min(
        displayItemCount + LOAD_MORE_BATCH_SIZE,
        totalItemCount
      );
      if (newVisibleCount > displayItemCount) {
        setVisibleItemCount(newVisibleCount);
      }
    }

    // 更新上一次的状态
    prevStateRef.current = { totalItemCount, displayItemCount };
  }, [totalItemCount, displayItemCount]);

  // 检查是否还有更多项目可以加载
  const hasNextPage = displayItemCount < totalItemCount;

  // 加载更多项目
  const loadMoreItems = useCallback(() => {
    if (isLoadingMore || !hasNextPage) return;

    setIsLoadingMore(true);

    // 模拟异步加载
    setTimeout(() => {
      setVisibleItemCount((prev) =>
        Math.min(prev + LOAD_MORE_BATCH_SIZE, totalItemCount)
      );
      setIsLoadingMore(false);
    }, 100);
  }, [isLoadingMore, hasNextPage, totalItemCount]);

  // 使用Intersection Observer检测最后一个项目的可见性，触发加载更多
  const lastItemRef = useCallback(
    (node: HTMLDivElement) => {
      // 移除旧的Observer
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      // 创建新的Observer
      observerRef.current = new IntersectionObserver(
        (entries) => {
          // 当最后一个项目进入视口，并且有更多项目可加载时，触发加载
          if (entries[0].isIntersecting && hasNextPage && !isLoadingMore) {
            loadMoreItems();
          }
        },
        {
          threshold: 0.1, // 当项目10%可见时触发
          rootMargin: '0px 0px 200px 0px', // 提前200px触发加载
        }
      );

      // 观察最后一个项目
      if (node) {
        observerRef.current.observe(node);
      }
    },
    [hasNextPage, isLoadingMore, loadMoreItems]
  );

  // 存储Observer实例
  const observerRef = useRef<IntersectionObserver | null>(null);

  // 组件卸载时清理Observer
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return (
    <div className='w-full'>
      {totalItemCount === 0 ? (
        <div className='flex flex-col justify-center items-center py-12'>
          {isLoading ? (
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-green-500'></div>
          ) : (
            <div className='text-center py-16 dark:text-gray-400'>
              <div className='flex justify-center mb-4'>
                <svg
                  className='h-12 w-12 text-gray-300 dark:text-gray-600 animate-pulse'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={1}
                    d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
                  />
                </svg>
              </div>
              <h3 className='text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2 animate-fade-in'>
                未找到相关结果
              </h3>
              <p className='text-gray-500 dark:text-gray-400 animate-fade-in'>
                尝试调整搜索条件或使用其他关键词
              </p>
            </div>
          )}
        </div>
      ) : (
        /* 使用渐进式加载的网格布局，避免固定高度限制 */
        <div className='relative'>
          <div
            className='grid grid-cols-2 gap-x-4 gap-y-14 sm:gap-y-20 px-0 sm:px-2 sm:grid-cols-[repeat(auto-fill,_minmax(11rem,_1fr))] sm:gap-x-8 transition-all duration-300 scrollbar-hide'
            style={{
              overflowY: 'visible',
              scrollBehavior: 'smooth',
              isolation: 'auto',
            }}
          >
            {viewMode === 'agg'
              ? filteredAggResults
                  .slice(0, displayItemCount)
                  .map(([mapKey, group], index) => {
                    const title = group[0]?.title || '';
                    const poster = group[0]?.poster || '';
                    const year = group[0]?.year || 'unknown';
                    const { episodes, source_names, douban_id } =
                      computeGroupStats(group);
                    const type = episodes === 1 ? 'movie' : 'tv';

                    // 如果该聚合第一次出现，写入初始统计
                    if (!groupStatsRef.current.has(mapKey)) {
                      groupStatsRef.current.set(mapKey, {
                        episodes,
                        source_names,
                        douban_id,
                      });
                    }

                    // 检查是否是最后一个元素
                    const isLastItem = index === displayItemCount - 1;

                    return (
                      <div
                        key={`agg-${mapKey}`}
                        ref={isLastItem ? lastItemRef : null}
                        className='w-full animate-fade-in transition-all duration-500 ease-out transform hover:scale-105 hover:shadow-xl opacity-0'
                        style={{
                          animationDelay: `${index * 20}ms`,
                          animationFillMode: 'forwards',
                        }}
                      >
                        <VideoCard
                          ref={getGroupRef(mapKey)}
                          from='search'
                          isAggregate={true}
                          title={title}
                          poster={poster}
                          year={year}
                          episodes={episodes}
                          source_names={source_names}
                          douban_id={douban_id}
                          query={
                            searchQuery.trim() !== title
                              ? searchQuery.trim()
                              : ''
                          }
                          type={type}
                        />
                      </div>
                    );
                  })
              : filteredResults
                  .slice(0, displayItemCount)
                  .map((item, index) => {
                    // 检查是否是最后一个元素
                    const isLastItem = index === displayItemCount - 1;

                    return (
                      <div
                        key={`all-${item.source}-${item.id}`}
                        ref={isLastItem ? lastItemRef : null}
                        className='w-full animate-fade-in transition-all duration-500 ease-out transform hover:scale-105 hover:shadow-xl opacity-0'
                        style={{
                          animationDelay: `${index * 20}ms`,
                          animationFillMode: 'forwards',
                        }}
                      >
                        <VideoCard
                          id={item.id}
                          title={item.title}
                          poster={item.poster}
                          episodes={item.episodes.length}
                          source={item.source}
                          source_name={item.source_name}
                          douban_id={item.douban_id}
                          query={
                            searchQuery.trim() !== item.title
                              ? searchQuery.trim()
                              : ''
                          }
                          year={item.year}
                          from='search'
                          type={item.episodes.length > 1 ? 'tv' : 'movie'}
                        />
                      </div>
                    );
                  })}
          </div>
        </div>
      )}

      {/* 加载更多指示器 */}
      {isLoadingMore && (
        <div className='flex justify-center items-center py-8 animate-fade-in'>
          <div className='animate-spin rounded-full h-8 w-8 border-4 border-green-200 border-t-green-600 dark:border-green-800 dark:border-t-green-400 shadow-lg'></div>
          <span className='ml-3 text-sm font-medium text-gray-600 dark:text-gray-300'>
            加载更多...
          </span>
        </div>
      )}

      {/* 已加载完所有内容的提示 */}
      {!hasNextPage && displayItemCount > INITIAL_BATCH_SIZE && (
        <div className='text-center py-6 px-4 animate-fade-in'>
          <div className='text-sm font-medium text-gray-600 dark:text-gray-300'>
            已显示全部 {displayItemCount} 个结果
          </div>
          <div className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
            没有更多内容了
          </div>
        </div>
      )}
    </div>
  );
};

export default VirtualSearchGrid;
