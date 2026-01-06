/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import dynamic from 'next/dynamic';
import React, { useCallback, useEffect, useMemo, useRef, useState, useTransition, useImperativeHandle } from 'react';

const Grid = dynamic(
  () => import('react-window').then((mod) => ({ default: mod.Grid })),
  {
    ssr: false,
    loading: () => (
      <div className='animate-pulse h-96 bg-gray-200 dark:bg-gray-800 rounded-lg' />
    ),
  }
);

import { SearchResult } from '@/lib/types';
import { useImagePreload } from '@/hooks/useImagePreload';
import { useResponsiveGrid } from '@/hooks/useResponsiveGrid';

import VideoCard from '@/components/VideoCard';

// 导出的 ref 接口，供父组件调用
export interface VirtualSearchGridRef {
  scrollToTop: () => void;
}

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
const INITIAL_BATCH_SIZE = 16; // 优化初始加载量，平衡性能和首屏体验
const LOAD_MORE_BATCH_SIZE = 12; // 优化每次加载量，减少单次渲染压力
const LOAD_MORE_THRESHOLD = 3; // 优化触发阈值，更早开始加载，减少滚动白屏

export const VirtualSearchGrid = React.forwardRef<VirtualSearchGridRef, VirtualSearchGridProps>(({
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
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<any>(null); // Grid ref for imperative scroll
  const { columnCount, itemWidth, itemHeight, containerWidth } = useResponsiveGrid(containerRef);

  // React 19 useTransition - 将渐进式加载标记为非紧急更新，避免阻塞用户交互
  const [isPending, startTransition] = useTransition();

  // 渐进式加载状态
  const [visibleItemCount, setVisibleItemCount] = useState(INITIAL_BATCH_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // 选择当前显示的数据
  const currentData = viewMode === 'agg' ? filteredAggResults : filteredResults;
  const totalItemCount = currentData.length;

  // 实际显示的项目数量（考虑渐进式加载）
  const displayItemCount = Math.min(visibleItemCount, totalItemCount);
  const displayData = currentData.slice(0, displayItemCount);

  // 预加载图片 - 收集即将显示的图片 URLs
  const imagesToPreload = useMemo(() => {
    const urls: string[] = [];
    const itemsToPreload = currentData.slice(displayItemCount, Math.min(displayItemCount + 20, totalItemCount));

    itemsToPreload.forEach(item => {
      if (viewMode === 'agg') {
        const [, group] = item as [string, SearchResult[]];
        if (group[0]?.poster) urls.push(group[0].poster);
      } else {
        const searchItem = item as SearchResult;
        if (searchItem.poster) urls.push(searchItem.poster);
      }
    });

    return urls;
  }, [currentData, displayItemCount, totalItemCount, viewMode]);

  useImagePreload(imagesToPreload, totalItemCount > 0);

  // 重置可见项目数量（当搜索或过滤变化时）
  useEffect(() => {
    setVisibleItemCount(INITIAL_BATCH_SIZE);
    setIsLoadingMore(false);
  }, [currentData, viewMode]);

  // 强制重新计算容器尺寸的useEffect
  useEffect(() => {
    // 容器尺寸检查已通过ResizeObserver处理，移除不必要的debug log
  }, [containerWidth]);

  // 当搜索关键词或视图模式改变时，滚动到顶部
  useEffect(() => {
    if (gridRef.current?.scrollToCell && totalItemCount > 0) {
      try {
        gridRef.current.scrollToCell({
          columnIndex: 0,
          rowIndex: 0,
          align: 'start',
          behavior: 'smooth'
        });
      } catch (error) {
        // 忽略滚动错误（可能在组件卸载时发生）
        console.debug('Grid scroll error (safe to ignore):', error);
      }
    }
  }, [searchQuery, viewMode, totalItemCount]);

  // 检查是否还有更多项目可以加载
  const hasNextPage = displayItemCount < totalItemCount;

  // 加载更多项目
  const loadMoreItems = useCallback(() => {
    if (isLoadingMore || !hasNextPage) return;

    setIsLoadingMore(true);

    // 使用 useTransition 优化加载更多 - 将状态更新标记为 transition，让滚动和交互保持流畅
    startTransition(() => {
      // 立即更新可见项目数量，但不阻塞用户交互
      setVisibleItemCount((prev) =>
        Math.min(prev + LOAD_MORE_BATCH_SIZE, totalItemCount)
      );
      setIsLoadingMore(false);
    });
  }, [isLoadingMore, hasNextPage, totalItemCount, startTransition]);

  // 暴露 scrollToTop 方法给父组件
  useImperativeHandle(ref, () => ({
    scrollToTop: () => {
      if (gridRef.current?.scrollToCell) {
        try {
          gridRef.current.scrollToCell({
            columnIndex: 0,
            rowIndex: 0,
            align: 'start',
            behavior: 'smooth'
          });
        } catch (error) {
          console.debug('Grid scroll to top error (safe to ignore):', error);
        }
      }
    }
  }), []);

  // 网格行数计算
  const rowCount = Math.ceil(displayItemCount / columnCount);

  // CellComponent - 优化实现
  const CellComponent = ({ 
    ariaAttributes,
    columnIndex,
    rowIndex,
    style,
  }: { 
    ariaAttributes: { "aria-colindex": number; role: "gridcell"; };
    columnIndex: number;
    rowIndex: number;
    style: React.CSSProperties;
  }): React.ReactElement => {
    const index = rowIndex * columnCount + columnIndex;

    // 如果超出显示范围，返回隐藏的占位符
    if (index >= displayItemCount || index >= displayData.length) {
      return <div style={{ ...style, visibility: 'hidden' }} />;
    }

    const item = displayData[index];
    if (!item) {
      return <div style={{ ...style, visibility: 'hidden' }} />;
    }

    // 根据视图模式渲染不同内容
    if (viewMode === 'agg') {
      const [mapKey, group] = item as [string, SearchResult[]];
      
      // 从缓存中获取统计信息
      let stats = groupStatsRef.current.get(mapKey);
      if (!stats) {
        stats = computeGroupStats(group);
        groupStatsRef.current.set(mapKey, stats);
      }
      
      const title = group[0]?.title || '';
      const poster = group[0]?.poster || '';
      const year = group[0]?.year || 'unknown';
      const { episodes, source_names, douban_id } = stats;
      const type = episodes === 1 ? 'movie' : 'tv';

      return (
        <div style={{ ...style, padding: '8px' }} {...ariaAttributes}>
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
              query={searchQuery.trim() !== title ? searchQuery.trim() : ''}
              type={type}
            />
        </div>
      );
    } else {
      const searchItem = item as SearchResult;
      
      return (
        <div style={{ ...style, padding: '8px' }} {...ariaAttributes}>
          <VideoCard
              id={searchItem.id}
              title={searchItem.title}
              poster={searchItem.poster}
              episodes={searchItem.episodes.length}
              source={searchItem.source}
              source_name={searchItem.source_name}
              douban_id={searchItem.douban_id}
              query={searchQuery.trim() !== searchItem.title ? searchQuery.trim() : ''}
              year={searchItem.year}
              from='search'
              type={searchItem.episodes.length > 1 ? 'tv' : 'movie'}
            />
        </div>
      );
    }
  };

  // 计算网格高度 - 优化动态调整，确保良好的滚动体验
  const gridHeight = typeof window !== 'undefined' 
    ? Math.max(
        window.innerHeight - 240, // 优化高度计算，与页面布局更协调
        500 // 确保最小高度，避免内容过少时的不良体验
      )
    : 500;

  return (
    <div ref={containerRef} className='w-full'>
      {totalItemCount === 0 ? (
        <div className='flex justify-center items-center h-40'>
          {isLoading ? (
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-green-500'></div>
          ) : (
            <div className='text-center text-gray-500 py-8 dark:text-gray-400'>
              未找到相关结果
            </div>
          )}
        </div>
      ) : containerWidth <= 100 ? (
        <div className='flex justify-center items-center h-40'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-green-500'></div>
          <span className='ml-2 text-sm text-gray-500'>
            初始化虚拟滑动... ({Math.round(containerWidth)}px)
          </span>
        </div>
      ) : (
        <Grid
          key={`grid-${containerWidth}-${columnCount}`}
          gridRef={gridRef}
          cellComponent={CellComponent}
          cellProps={{}}
          columnCount={columnCount}
          columnWidth={itemWidth + 16}
          rowCount={rowCount}
          rowHeight={itemHeight + 16}
          overscanCount={5}
          // 添加ARIA支持提升无障碍体验
          role="grid"
          aria-label={`搜索结果列表 "${searchQuery}"，共${displayItemCount}个结果，当前视图：${viewMode === 'agg' ? '聚合视图' : '全部结果'}`}
          aria-rowcount={rowCount}
          aria-colcount={columnCount}
          style={{
            width: containerWidth,
            height: gridHeight,
            overflowX: 'hidden',
            overflowY: 'auto',
            // 确保不创建新的stacking context，让菜单能正确显示在最顶层
            isolation: 'auto',
            // 平滑滚动优化
            scrollBehavior: 'smooth',
            // 优化滚动性能
            willChange: 'transform',
            // 优化滚动条样式
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(156, 163, 175, 0.5) transparent',
          }}
          onCellsRendered={({ rowStopIndex }: { rowStopIndex: number }) => {
            // 当可见区域接近底部时，加载更多
            if (
              rowStopIndex >= rowCount - LOAD_MORE_THRESHOLD &&
              hasNextPage &&
              !isLoadingMore
            ) {
              loadMoreItems();
            }
          }}
        />
      )}

      {/* 加载更多指示器 - 显示 transition 状态 */}
      {containerWidth > 100 && (
        <div className='flex justify-center items-center py-4'>
          {(isLoadingMore || isPending) && (
            <>
              <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-green-500'></div>
              <span className='ml-2 text-sm text-gray-500 dark:text-gray-400'>
                加载更多...
              </span>
            </>
          )}
        </div>
      )}

      {/* 已加载完所有内容的提示 */}
      {containerWidth > 100 &&
        !hasNextPage &&
        displayItemCount > INITIAL_BATCH_SIZE && (
          <div className='text-center py-4 text-sm text-gray-500 dark:text-gray-400'>
            已显示全部 {displayItemCount} 个结果
          </div>
        )}
    </div>
  );
});

VirtualSearchGrid.displayName = 'VirtualSearchGrid';

export default VirtualSearchGrid;
