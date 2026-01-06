/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import dynamic from 'next/dynamic';
import React, { useCallback, useEffect, useRef, useState } from 'react';

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
import { useResponsiveGrid } from '@/hooks/useResponsiveGrid';

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
const INITIAL_BATCH_SIZE = 16; // 优化初始加载量，平衡性能和首屏体验
const LOAD_MORE_BATCH_SIZE = 12; // 优化每次加载量，减少单次渲染压力
const LOAD_MORE_THRESHOLD = 3; // 优化触发阈值，更早开始加载，减少滚动白屏

export const VirtualSearchGrid: React.FC<VirtualSearchGridProps> = ({
  allResults,
  filteredResults,
  aggregatedResults,
  filteredAggResults,
  viewMode,
  searchQuery,
  isLoading,
  groupRefs,
  groupStatsRef,
  getGroupRef,
  computeGroupStats,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { columnCount, itemWidth, itemHeight, containerWidth } =
    useResponsiveGrid(containerRef);

  // 渐进式加载状态
  const [visibleItemCount, setVisibleItemCount] = useState(INITIAL_BATCH_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // 选择当前显示的数据
  const currentData = viewMode === 'agg' ? filteredAggResults : filteredResults;
  const totalItemCount = currentData.length;

  // 实际显示的项目数量（考虑渐进式加载）
  const displayItemCount = Math.min(visibleItemCount, totalItemCount);
  const displayData = currentData.slice(0, displayItemCount);

  // 重置可见项目数量（当搜索或过滤变化时）
  useEffect(() => {
    setVisibleItemCount(INITIAL_BATCH_SIZE);
    setIsLoadingMore(false);
  }, [currentData, viewMode]);

  // 强制重新计算容器尺寸的useEffect
  useEffect(() => {
    const checkContainer = () => {
      const element = containerRef.current;
      const actualWidth = element?.offsetWidth || 0;

      console.log('VirtualSearchGrid container debug:', {
        actualWidth,
        containerWidth,
        offsetWidth: element?.offsetWidth,
        clientWidth: element?.clientWidth,
        scrollWidth: element?.scrollWidth,
        element: !!element,
      });
    };

    checkContainer();
  }, [containerWidth]);

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

  // 网格行数计算
  const rowCount = Math.ceil(displayItemCount / columnCount);

  // CellComponent - 优化实现
  // 注意：react-window v2.2.3不支持cellProps.data，所以直接从外部作用域访问数据
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

    // 如果超出显示范围，返回空div
    if (index >= displayItemCount || index >= displayData.length) {
      return <div style={style} />;
    }

    const item = displayData[index];
    if (!item) {
      return <div style={style} />;
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
        <div style={style} className="p-1">
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
        <div style={style} className="p-1">
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
          cellComponent={CellComponent}
          cellProps={{}} // react-window v2.2.3要求必须提供cellProps
          columnCount={columnCount}
          columnWidth={itemWidth}
          defaultHeight={gridHeight}
          defaultWidth={containerWidth}
          rowCount={rowCount}
          rowHeight={itemHeight}
          overscanCount={4} // 优化overscanCount，平衡性能和滚动体验
          style={{
            width: containerWidth,
            height: gridHeight,
            overflowX: 'hidden',
            overflowY: 'auto',
            isolation: 'auto',
            // 确保Grid组件有明确的尺寸，能够正确计算单元格位置
            position: 'relative',
            // 优化滚动体验
            scrollBehavior: 'smooth',
            // 优化滚动性能
            willChange: 'transform',
            // 优化滚动条样式
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(156, 163, 175, 0.5) transparent',
          }}
          // react-window Grid组件不支持onScroll事件，移除该属性
          // 使用onCellsRendered替代来实现无限滚动
          onCellsRendered={({ rowStopIndex }) => {
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

      {/* 加载更多指示器 */}
      {containerWidth > 100 && (
        <div className='flex justify-center items-center py-4'>
          {isLoadingMore && (
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
};

export default VirtualSearchGrid;
