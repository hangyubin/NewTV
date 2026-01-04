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
const INITIAL_BATCH_SIZE = 20; // 增加初始加载量，减少初始加载次数
const LOAD_MORE_BATCH_SIZE = 15; // 增加每次加载量，减少加载次数
const LOAD_MORE_THRESHOLD = 300; // 使用像素阈值，更直观且在不同屏幕尺寸下表现一致

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

  // 优化的CellComponent，减少不必要的props和计算
  // react-window Grid组件的cellComponent不支持data属性，所以我们需要使用闭包来传递数据
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
      
      // 从缓存中获取统计信息，避免重复计算
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
        <div style={{ ...style, padding: '8px' }}>
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
              searchQuery.trim() !== title ? searchQuery.trim() : ''
            }
            type={type}
          />
        </div>
      );
    } else {
      const searchItem = item as SearchResult;
      return (
        <div style={{ ...style, padding: '8px' }}>
          <VideoCard
            id={searchItem.id}
            title={searchItem.title}
            poster={searchItem.poster}
            episodes={searchItem.episodes.length}
            source={searchItem.source}
            source_name={searchItem.source_name}
            douban_id={searchItem.douban_id}
            query={
              searchQuery.trim() !== searchItem.title
                ? searchQuery.trim()
                : ''
            }
            year={searchItem.year}
            from='search'
            type={searchItem.episodes.length > 1 ? 'tv' : 'movie'}
          />
        </div>
      );
    }
  };

  // 计算网格高度 - 更合理的高度计算，确保足够的可视区域
  const gridHeight = typeof window !== 'undefined' 
    ? Math.max(window.innerHeight - 250, 600) // 确保最小高度
    : 600;

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
          cellProps={{}}
          columnCount={columnCount}
          columnWidth={itemWidth + 16}
          defaultHeight={gridHeight}
          defaultWidth={containerWidth}
          rowCount={rowCount}
          rowHeight={itemHeight + 16}
          overscanCount={2} // 增加overscanCount，减少滚动时的白屏现象
          style={{
            overflowX: 'hidden',
            overflowY: 'auto',
            // 确保不创建新的stacking context，让菜单能正确显示在最顶层
            isolation: 'auto',
          }}
          // react-window Grid组件不支持onScroll事件，移除该属性
          // 使用onCellsRendered替代来实现无限滚动
          onCellsRendered={({ rowStopIndex }) => {
            // 当可见区域接近底部时，加载更多
            if (
              rowStopIndex >= rowCount - 1 &&
              hasNextPage &&
              !isLoadingMore
            ) {
              loadMoreItems();
            }
          }}
        />
      )}

      {/* 加载更多指示器 */}
      {containerWidth > 100 && isLoadingMore && (
        <div className='flex justify-center items-center py-4'>
          <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-green-500'></div>
          <span className='ml-2 text-sm text-gray-500 dark:text-gray-400'>
            加载更多...
          </span>
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
