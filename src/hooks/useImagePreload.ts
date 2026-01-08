import { useEffect, useRef } from 'react';

/**
 * 图片预加载 Hook，用于预加载即将显示的图片，减少滚动时的加载延迟
 */
export function useImagePreload(urls: string[], enabled = true) {
  const preloadedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled || urls.length === 0) return;

    // 只预加载未加载过的图片
    const urlsToPreload = urls.filter((url) => !preloadedRef.current.has(url));
    if (urlsToPreload.length === 0) return;

    // 批量预加载图片
    const preloadPromises = urlsToPreload.map((url) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          preloadedRef.current.add(url);
          resolve();
        };
        img.onerror = () => {
          // 忽略加载失败的图片
          resolve();
        };
        img.src = url;
      });
    });

    // 并行预加载，但限制最大并发数为 6
    const maxConcurrent = 6;
    let currentIndex = 0;
    let activeCount = 0;

    function loadNext() {
      if (currentIndex >= preloadPromises.length) return;

      while (
        activeCount < maxConcurrent &&
        currentIndex < preloadPromises.length
      ) {
        activeCount++;
        preloadPromises[currentIndex++].finally(() => {
          activeCount--;
          loadNext();
        });
      }
    }

    loadNext();
  }, [urls, enabled]);
}
