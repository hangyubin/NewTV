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

      // 响应式列数计算 - 增加列数，使卡片更小，与首页保持一致
      if (containerWidth >= 1280) columnCount = 8; // 2xl
      else if (containerWidth >= 1024) columnCount = 6; // lg
      else if (containerWidth >= 768) columnCount = 5; // md
      else if (containerWidth >= 640) columnCount = 4; // sm
      else columnCount = 2; // xs and mobile

      // 计算项目尺寸 - 减小卡片大小，与首页保持一致
      // 每个项目的固定内边距
      const itemPadding = 8;
      // 卡片之间的间距
      const gap = 8;

      // 计算实际可用宽度（减去左右内边距和总间距）
      const availableWidth = containerWidth - itemPadding * 2 - gap * (columnCount - 1);

      // 计算项目宽度 - 使卡片更小
      const itemWidth = Math.floor(availableWidth / columnCount);

      // 根据海报比例计算高度 (2:3) + 标题和来源信息高度，调整比例使卡片更小
      const posterHeight = Math.floor(itemWidth * 1.35); // 减小海报高度比例
      const textHeight = 32; // 减小文字区域高度
      const itemHeight = posterHeight + textHeight + gap; // 包含行间距

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
