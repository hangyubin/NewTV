import { useCallback, useLayoutEffect, useState } from 'react';

interface GridDimensions {
  columnCount: number;
  itemWidth: number;
  itemHeight: number;
  containerWidth: number;
}

export const useResponsiveGrid = (
  containerRef?: React.RefObject<HTMLElement>
): GridDimensions => {
  const [dimensions, setDimensions] = useState<GridDimensions>({
    columnCount: 3,
    itemWidth: 150,
    itemHeight: 280,
    containerWidth: 450,
  });

  const calculateDimensions = useCallback(
    (width?: number) => {
      let containerWidth: number;

      if (width !== undefined) {
        // ResizeObserver提供的宽度
        containerWidth = width;
      } else if (containerRef?.current?.offsetWidth) {
        // 容器已渲染，使用实际宽度
        containerWidth = containerRef.current.offsetWidth;
      } else if (typeof window !== 'undefined') {
        // 容器未准备好，使用窗口宽度减去预估padding
        containerWidth = window.innerWidth - 80;
      } else {
        // SSR或无窗口环境
        containerWidth = 450;
      }

      let columnCount: number;

      // 响应式列数计算 - 与传统搜索列表网格布局保持一致
      if (containerWidth >= 1024) columnCount = 6; // lg
      else if (containerWidth >= 768) columnCount = 5; // md
      else if (containerWidth >= 640) columnCount = 4; // sm
      else columnCount = 2; // xs and mobile

      // 计算项目尺寸 - 简化计算，移除动态gap，使用固定padding
      // 每个项目的固定内边距
      const itemPadding = 8;

      // 计算实际可用宽度（减去左右内边距）
      const availableWidth = containerWidth - itemPadding * 2;

      // 计算项目宽度 - 不考虑gap，因为react-window Grid组件会处理间距
      const itemWidth = Math.floor(availableWidth / columnCount);

      // 根据海报比例计算高度 (2:3) + 标题和来源信息高度，与首页保持一致
      const posterHeight = Math.floor(itemWidth * 1.5);
      const textHeight = 40; // 标题 + 来源信息，调整为与LunaTV一致
      const itemHeight = posterHeight + textHeight;

      setDimensions({
        columnCount,
        itemWidth,
        itemHeight,
        containerWidth,
      });
    },
    [containerRef]
  );

  useLayoutEffect(() => {
    // 使用更高效的初始化方式，减少不必要的重试
    let resizeObserver: ResizeObserver | null = null;

    const setupObserver = () => {
      if (!containerRef?.current) {
        // 容器未准备好，使用默认值初始化
        calculateDimensions();
        return;
      }

      const element = containerRef.current;

      // 使用getBoundingClientRect获取更精确的宽度
      const rect = element.getBoundingClientRect();
      const initialWidth =
        rect.width || element.offsetWidth || element.clientWidth;

      calculateDimensions(initialWidth);

      // 使用ResizeObserver监听尺寸变化
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width } = entry.contentRect;
          calculateDimensions(width);
        }
      });

      resizeObserver.observe(element);

      // 窗口resize处理
      const handleResize = () => {
        const currentRect = element.getBoundingClientRect();
        calculateDimensions(
          currentRect.width || element.offsetWidth || element.clientWidth
        );
      };
      window.addEventListener('resize', handleResize);

      // 设置清理函数
      return () => {
        resizeObserver?.disconnect();
        window.removeEventListener('resize', handleResize);
      };
    };

    // 立即开始尝试，使用requestAnimationFrame确保DOM已渲染
    const cleanup = requestAnimationFrame(() => {
      setupObserver();
    });

    return () => {
      cancelAnimationFrame(cleanup);
      resizeObserver?.disconnect();
    };
  }, [containerRef, calculateDimensions]);

  return dimensions;
};

export default useResponsiveGrid;
