/* eslint-disable react-hooks/exhaustive-deps, @typescript-eslint/no-explicit-any,@typescript-eslint/no-non-null-assertion,no-empty */
'use client';

import { ChevronUp, Search, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, {
  startTransition,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  addSearchHistory,
  clearSearchHistory,
  deleteSearchHistory,
  getSearchHistory,
  subscribeToDataUpdates,
} from '@/lib/db.client';
import { SearchResult } from '@/lib/types';

import PageLayout from '@/components/PageLayout';
import SearchResultFilter, {
  SearchFilterCategory,
} from '@/components/SearchResultFilter';
import SearchSuggestions from '@/components/SearchSuggestions';
import VideoCard, { VideoCardHandle } from '@/components/VideoCard';
import VirtualSearchGrid from '@/components/VirtualSearchGrid';

function SearchPageClient() {
  // 搜索历史
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  // 返回顶部按钮显示状态
  const [showBackToTop, setShowBackToTop] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const currentQueryRef = useRef<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const [totalSources, setTotalSources] = useState(0);
  const [completedSources, setCompletedSources] = useState(0);
  const pendingResultsRef = useRef<SearchResult[]>([]);
  const flushTimerRef = useRef<number | null>(null);
  const [useFluidSearch, setUseFluidSearch] = useState(true);
  // 虚拟化开关状态
  const [useVirtualization, setUseVirtualization] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('useVirtualization');
      return saved !== null ? JSON.parse(saved) : false; // 默认禁用
    }
    return false;
  });
  // 聚合卡片 refs 与聚合统计缓存
  const groupRefs = useRef<Map<string, React.RefObject<VideoCardHandle>>>(
    new Map()
  );
  const groupStatsRef = useRef<
    Map<
      string,
      { douban_id?: number; episodes?: number; source_names: string[] }
    >
  >(new Map());
  
  // 搜索结果缓存 - 使用 LRU 策略
  const searchCacheRef = useRef<Map<string, {
    results: SearchResult[];
    timestamp: number;
    totalSources: number;
  }>>(new Map());
  const CACHE_SIZE = 10; // 最大缓存10个搜索结果
  const CACHE_TTL = 30 * 60 * 1000; // 缓存有效期30分钟

  const getGroupRef = (key: string) => {
    let ref = groupRefs.current.get(key);
    if (!ref) {
      ref = React.createRef<VideoCardHandle>();
      groupRefs.current.set(key, ref);
    }
    return ref;
  };

  // 优化的计算统计函数，减少不必要的计算和内存分配
  const computeGroupStats = (group: SearchResult[]) => {
    // 计算集数 - 只需要遍历一次并记录最大值
    let maxEpisodeCount = 0;
    let maxEpisodeCountFreq = 0;
    const episodeMap = new Map<number, number>();
    
    // 计算源名称 - 直接使用 Set 收集
    const sourceNamesSet = new Set<string>();
    
    // 计算豆瓣ID - 遍历一次并记录出现次数最多的ID
    let maxDoubanId = 0;
    let maxDoubanIdFreq = 0;
    const doubanIdMap = new Map<number, number>();
    
    // 单次遍历完成所有计算
    for (const g of group) {
      // 处理集数
      const len = g.episodes?.length || 0;
      if (len > 0) {
        const freq = (episodeMap.get(len) || 0) + 1;
        episodeMap.set(len, freq);
        if (freq > maxEpisodeCountFreq) {
          maxEpisodeCountFreq = freq;
          maxEpisodeCount = len;
        } else if (freq === maxEpisodeCountFreq && len > maxEpisodeCount) {
          // 如果频率相同，选择较大的集数
          maxEpisodeCount = len;
        }
      }
      
      // 处理源名称
      if (g.source_name) {
        sourceNamesSet.add(g.source_name);
      }
      
      // 处理豆瓣ID
      if (g.douban_id && g.douban_id > 0) {
        const freq = (doubanIdMap.get(g.douban_id) || 0) + 1;
        doubanIdMap.set(g.douban_id, freq);
        if (freq > maxDoubanIdFreq) {
          maxDoubanIdFreq = freq;
          maxDoubanId = g.douban_id;
        }
      }
    }
    
    return {
      episodes: maxEpisodeCount,
      source_names: Array.from(sourceNamesSet),
      douban_id: maxDoubanId || undefined
    };
  };
  // 过滤器：非聚合与聚合
  const [filterAll, setFilterAll] = useState<{
    source: string;
    title: string;
    year: string;
    yearOrder: 'none' | 'asc' | 'desc';
  }>({
    source: 'all',
    title: 'all',
    year: 'all',
    yearOrder: 'none',
  });
  const [filterAgg, setFilterAgg] = useState<{
    source: string;
    title: string;
    year: string;
    yearOrder: 'none' | 'asc' | 'desc';
  }>({
    source: 'all',
    title: 'all',
    year: 'all',
    yearOrder: 'none',
  });

  // 获取默认聚合设置：只读取用户本地设置，默认为 true
  const getDefaultAggregate = () => {
    if (typeof window !== 'undefined') {
      const userSetting = localStorage.getItem('defaultAggregateSearch');
      if (userSetting !== null) {
        return JSON.parse(userSetting);
      }
    }
    return true; // 默认启用聚合
  };

  const [viewMode, setViewMode] = useState<'agg' | 'all'>(() => {
    return getDefaultAggregate() ? 'agg' : 'all';
  });

  // 保存虚拟化设置
  const toggleVirtualization = () => {
    const newValue = !useVirtualization;
    setUseVirtualization(newValue);
    if (typeof window !== 'undefined') {
      localStorage.setItem('useVirtualization', JSON.stringify(newValue));
    }
  };

  // 在“无排序”场景用于每个源批次的预排序：完全匹配标题优先，其次年份倒序，未知年份最后
  const sortBatchForNoOrder = (items: SearchResult[]) => {
    const q = currentQueryRef.current.trim();
    return items.slice().sort((a, b) => {
      const aExact = (a.title || '').trim() === q;
      const bExact = (b.title || '').trim() === q;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      const aNum = Number.parseInt(a.year as any, 10);
      const bNum = Number.parseInt(b.year as any, 10);
      const aValid = !Number.isNaN(aNum);
      const bValid = !Number.isNaN(bNum);
      if (aValid && !bValid) return -1;
      if (!aValid && bValid) return 1;
      if (aValid && bValid) return bNum - aNum; // 年份倒序
      return 0;
    });
  };

  // 简化的年份排序：unknown/空值始终在最后
  const compareYear = (
    aYear: string,
    bYear: string,
    order: 'none' | 'asc' | 'desc'
  ) => {
    // 如果是无排序状态，返回0（保持原顺序）
    if (order === 'none') return 0;

    // 处理空值和unknown
    const aIsEmpty = !aYear || aYear === 'unknown';
    const bIsEmpty = !bYear || bYear === 'unknown';

    if (aIsEmpty && bIsEmpty) return 0;
    if (aIsEmpty) return 1; // a 在后
    if (bIsEmpty) return -1; // b 在后

    // 都是有效年份，按数字比较
    const aNum = parseInt(aYear, 10);
    const bNum = parseInt(bYear, 10);

    return order === 'asc' ? aNum - bNum : bNum - aNum;
  };

  // 定义评分项目类型
  interface ScoredItem {
    item: SearchResult;
    score: number;
  }
  
  // 优化的搜索结果去重和排序
  const enhancedSearchResults = useMemo(() => {
    if (!searchResults.length) return searchResults;
    
    // 1. 首先进行初步去重：根据标题、年份和类型
    const preliminaryMap = new Map<string, SearchResult[]>();
    
    for (const item of searchResults) {
      const type = item.episodes.length === 1 ? 'movie' : 'tv';
      const key = `${item.title.replace(/\s+/g, '')}-${item.year || 'unknown'}-${type}`;
      const arr = preliminaryMap.get(key) || [];
      arr.push(item);
      preliminaryMap.set(key, arr);
    }
    
    // 2. 对每个分组进行质量评估，选择最佳结果
    const bestResults: SearchResult[] = [];
    
    // 修复：使用显式类型声明
    const mapValues = Array.from(preliminaryMap.values());
    for (const items of mapValues) {
      // 对每个分组的结果进行质量评分
      const scoredItems: ScoredItem[] = items.map((item: SearchResult) => {
        let score = 0;
        
        // 评分规则：
        // 1. 有评分的结果优先
        if (item.score && typeof item.score === 'number') {
          score += item.score * 10;
        }
        
        // 2. 有海报的结果优先
        if (item.poster && item.poster !== 'N/A') {
          score += 5;
        }
        
        // 3. 集数完整的结果优先
        if (item.episodes && item.episodes.length > 0) {
          score += item.episodes.length;
        }
        
        // 4. 来源可靠性评分（可以根据实际情况调整）
        const sourceScores: Record<string, number> = {
          'dbzy_tv': 10,
          'other_source': 5
        };
        score += sourceScores[item.source] || 3;
        
        // 5. 有豆瓣ID的结果优先
        if (item.douban_id && item.douban_id > 0) {
          score += 8;
        }
        
        return { item, score };
      });
      
      // 选择评分最高的结果
      scoredItems.sort((a: ScoredItem, b: ScoredItem) => b.score - a.score);
      bestResults.push(scoredItems[0].item);
    }
    
    // 3. 最终排序：根据相关性和质量
    const queryLower = searchQuery.toLowerCase();
    
    return bestResults.sort((a, b) => {
      // 计算标题匹配度
      const aTitleLower = a.title.toLowerCase();
      const bTitleLower = b.title.toLowerCase();
      
      const aExactMatch = aTitleLower === queryLower;
      const bExactMatch = bTitleLower === queryLower;
      
      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;
      
      const aStartsWith = aTitleLower.startsWith(queryLower);
      const bStartsWith = bTitleLower.startsWith(queryLower);
      
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      
      // 计算包含匹配度（查询词在标题中的位置越靠前，排名越靠前）
      const aIndex = aTitleLower.indexOf(queryLower);
      const bIndex = bTitleLower.indexOf(queryLower);
      
      if (aIndex !== -1 && bIndex !== -1) {
        if (aIndex < bIndex) return -1;
        if (aIndex > bIndex) return 1;
      }
      
      // 有评分的结果优先
      const aHasScore = typeof a.score === 'number';
      const bHasScore = typeof b.score === 'number';
      
      if (aHasScore && bHasScore && a.score !== undefined && b.score !== undefined) {
        return b.score - a.score;
      } else if (aHasScore) {
        return -1;
      } else if (bHasScore) {
        return 1;
      }
      
      // 最后按年份排序，最新的在前
      const aYear = parseInt(a.year || '0', 10);
      const bYear = parseInt(b.year || '0', 10);
      
      return bYear - aYear;
    });
  }, [searchResults, searchQuery]);
  
  // 聚合后的结果（按标题和年份分组）
  const aggregatedResults = useMemo(() => {
    const map = new Map<string, SearchResult[]>();
    const keyOrder: string[] = []; // 记录键出现的顺序

    enhancedSearchResults.forEach((item) => {
      // 优化键生成，使用更高效的字符串拼接
      const type = item.episodes.length === 1 ? 'movie' : 'tv';
      const key = `${item.title.replace(/\s+/g, '')}-${item.year || 'unknown'}-${type}`;
      const arr = map.get(key);
      
      if (arr) {
        arr.push(item);
      } else {
        map.set(key, [item]);
        keyOrder.push(key);
      }
    });

    // 按出现顺序返回聚合结果
    return keyOrder.map((key) => [key, map.get(key)!] as [string, SearchResult[]]);
  }, [enhancedSearchResults]);

  // 当聚合结果变化时，如果某个聚合已存在，则调用其卡片 ref 的 set 方法增量更新
  useEffect(() => {
    aggregatedResults.forEach(([mapKey, group]) => {
      const stats = computeGroupStats(group);
      const prev = groupStatsRef.current.get(mapKey);
      if (!prev) {
        // 第一次出现，记录初始值，不调用 ref（由初始 props 渲染）
        groupStatsRef.current.set(mapKey, stats);
        return;
      }
      // 对比变化并调用对应的 set 方法
      const ref = groupRefs.current.get(mapKey);
      if (ref && ref.current) {
        if (prev.episodes !== stats.episodes) {
          ref.current.setEpisodes(stats.episodes);
        }
        const prevNames = (prev.source_names || []).join('|');
        const nextNames = (stats.source_names || []).join('|');
        if (prevNames !== nextNames) {
          ref.current.setSourceNames(stats.source_names);
        }
        if (prev.douban_id !== stats.douban_id) {
          ref.current.setDoubanId(stats.douban_id);
        }
        groupStatsRef.current.set(mapKey, stats);
      }
    });
  }, [aggregatedResults]);

  // 构建筛选选项 - 优化版
  const filterOptions = useMemo(() => {
    // 使用 Set 收集数据，避免重复
    const sourcesSet = new Map<string, string>();
    const titlesSet = new Set<string>();
    const yearsSet = new Set<string>();

    // 单次遍历收集所有数据
    for (const item of searchResults) {
      if (item.source && item.source_name) {
        sourcesSet.set(item.source, item.source_name);
      }
      if (item.title) {
        titlesSet.add(item.title);
      }
      if (item.year) {
        yearsSet.add(item.year);
      }
    }

    // 优化：对于大量结果，限制显示的选项数量，避免下拉菜单过长
    const MAX_OPTIONS = 20;
    
    // 来源选项 - 排序并限制数量
    const sourceEntries = Array.from(sourcesSet.entries());
    if (sourceEntries.length > MAX_OPTIONS) {
      // 对于大量来源，按名称排序并只显示前N个
      sourceEntries.sort((a, b) => a[1].localeCompare(b[1]));
    }
    const sourceOptions = [
      { label: '全部来源', value: 'all' },
      ...sourceEntries.slice(0, MAX_OPTIONS).map(([value, label]) => ({ label, value })),
    ];

    // 标题选项 - 只在有少量结果时显示，否则只显示"全部"
    const titleOptions = titlesSet.size <= MAX_OPTIONS ? [
      { label: '全部标题', value: 'all' },
      ...Array.from(titlesSet.values())
        .sort((a, b) => a.localeCompare(b))
        .map((t) => ({ label: t, value: t })),
    ] : [
      { label: '全部标题', value: 'all' },
    ];

    // 年份选项 - 优化排序和处理
    const years = Array.from(yearsSet.values());
    const knownYears = years
      .filter((y) => y !== 'unknown')
      .sort((a, b) => parseInt(b, 10) - parseInt(a, 10)); // 倒序排列，最新的年份在前
    const hasUnknown = years.includes('unknown');
    
    const yearOptions = [
      { label: '全部年份', value: 'all' },
      ...knownYears.map((y) => ({ label: y, value: y })),
      ...(hasUnknown ? [{ label: '未知', value: 'unknown' }] : []),
    ];

    // 复用相同的选项数组，避免重复创建
    const categoriesAll: SearchFilterCategory[] = [
      { key: 'source', label: '来源', options: sourceOptions },
      { key: 'title', label: '标题', options: titleOptions },
      { key: 'year', label: '年份', options: yearOptions },
    ];

    const categoriesAgg: SearchFilterCategory[] = [
      { key: 'source', label: '来源', options: sourceOptions },
      { key: 'title', label: '标题', options: titleOptions },
      { key: 'year', label: '年份', options: yearOptions },
    ];

    return { categoriesAll, categoriesAgg };
  }, [searchResults]);

  // 非聚合：应用筛选与排序
  const filteredAllResults = useMemo(() => {
    const { source, title, year, yearOrder } = filterAll;
    const filtered = enhancedSearchResults.filter((item) => {
      if (source !== 'all' && item.source !== source) return false;
      if (title !== 'all' && item.title !== title) return false;
      if (year !== 'all' && item.year !== year) return false;
      return true;
    });

    // 如果是无排序状态，直接返回过滤后的原始顺序（已优化）
    if (yearOrder === 'none') {
      return filtered;
    }

    // 进一步排序：1. 年份排序，2. 年份相同时精确匹配在前，3. 标题排序
    return filtered.sort((a, b) => {
      // 首先按年份排序
      const yearComp = compareYear(a.year, b.year, yearOrder);
      if (yearComp !== 0) return yearComp;

      // 年份相同时，精确匹配在前
      const aExactMatch = a.title === searchQuery.trim();
      const bExactMatch = b.title === searchQuery.trim();
      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;

      // 最后按标题排序，正序时字母序，倒序时反字母序
      return yearOrder === 'asc'
        ? a.title.localeCompare(b.title)
        : b.title.localeCompare(a.title);
    });
  }, [enhancedSearchResults, filterAll, searchQuery]);

  // 聚合：应用筛选与排序
  const filteredAggResults = useMemo(() => {
    const { source, title, year, yearOrder } = filterAgg as any;
    const filtered = aggregatedResults.filter(([_, group]) => {
      const gTitle = group[0]?.title ?? '';
      const gYear = group[0]?.year ?? 'unknown';
      const hasSource = 
        source === 'all' ? true : group.some((item) => item.source === source);
      if (!hasSource) return false;
      if (title !== 'all' && gTitle !== title) return false;
      if (year !== 'all' && gYear !== year) return false;
      return true;
    });

    // 如果是无排序状态，保持按关键字+年份+类型出现的原始顺序
    if (yearOrder === 'none') {
      return filtered;
    }

    // 简化排序：1. 年份排序，2. 年份相同时精确匹配在前，3. 标题排序
    return filtered.sort((a, b) => {
      // 首先按年份排序
      const aYear = a[1][0].year;
      const bYear = b[1][0].year;
      const yearComp = compareYear(aYear, bYear, yearOrder);
      if (yearComp !== 0) return yearComp;

      // 年份相同时，精确匹配在前
      const aExactMatch = a[1][0].title === searchQuery.trim();
      const bExactMatch = b[1][0].title === searchQuery.trim();
      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;

      // 最后按标题排序，正序时字母序，倒序时反字母序
      const aTitle = a[1][0].title;
      const bTitle = b[1][0].title;
      return yearOrder === 'asc'
        ? aTitle.localeCompare(bTitle)
        : bTitle.localeCompare(aTitle);
    });
  }, [aggregatedResults, filterAgg, searchQuery]);

  useEffect(() => {
    // 无搜索参数时聚焦搜索框
    !searchParams.get('q') && document.getElementById('searchInput')?.focus();

    // 初始加载搜索历史
    getSearchHistory().then(setSearchHistory);

    // 读取流式搜索设置
    if (typeof window !== 'undefined') {
      const savedFluidSearch = localStorage.getItem('fluidSearch');
      const defaultFluidSearch =
        (window as any).RUNTIME_CONFIG?.FLUID_SEARCH !== false;
      if (savedFluidSearch !== null) {
        setUseFluidSearch(JSON.parse(savedFluidSearch));
      } else if (defaultFluidSearch !== undefined) {
        setUseFluidSearch(defaultFluidSearch);
      }
    }

    // 监听搜索历史更新事件
    const unsubscribe = subscribeToDataUpdates(
      'searchHistoryUpdated',
      (newHistory: string[]) => {
        setSearchHistory(newHistory);
      }
    );

    // 获取滚动位置的函数 - 专门针对 body 滚动
    const getScrollTop = () => {
      return document.body.scrollTop || 0;
    };

    // 使用 requestAnimationFrame 持续检测滚动位置
    let isRunning = false;
    const checkScrollPosition = () => {
      if (!isRunning) return;

      const scrollTop = getScrollTop();
      const shouldShow = scrollTop > 300;
      setShowBackToTop(shouldShow);

      requestAnimationFrame(checkScrollPosition);
    };

    // 启动持续检测
    isRunning = true;
    checkScrollPosition();

    // 监听 body 元素的滚动事件
    const handleScroll = () => {
      const scrollTop = getScrollTop();
      setShowBackToTop(scrollTop > 300);
    };

    document.body.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      unsubscribe();
      isRunning = false; // 停止 requestAnimationFrame 循环

      // 移除 body 滚动事件监听器
      document.body.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    // 当搜索参数变化时更新搜索状态
    const query = searchParams.get('q') || '';
    currentQueryRef.current = query.trim();

    if (query) {
      setSearchQuery(query);
      // 新搜索：关闭旧连接并清空结果
      if (eventSourceRef.current) {
        try {
          eventSourceRef.current.close();
        } catch {} 
        eventSourceRef.current = null;
      }
      setTotalSources(0);
      setCompletedSources(0);
      // 清理缓冲
      pendingResultsRef.current = [];
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      setIsLoading(true);
      setShowResults(true);

      const trimmed = query.trim();
      
      // 检查缓存
      const cached = searchCacheRef.current.get(trimmed);
      const now = Date.now();
      
      if (cached && (now - cached.timestamp) < CACHE_TTL) {
        // 使用缓存结果
        setSearchResults(cached.results);
        setTotalSources(cached.totalSources);
        setCompletedSources(cached.totalSources);
        setIsLoading(false);
        setShowSuggestions(false);
        // 保存到搜索历史 (事件监听会自动更新界面)
        addSearchHistory(query);
        return;
      }

      // 每次搜索时重新读取设置，确保使用最新的配置
      let currentFluidSearch = useFluidSearch;
      if (typeof window !== 'undefined') {
        const savedFluidSearch = localStorage.getItem('fluidSearch');
        if (savedFluidSearch !== null) {
          currentFluidSearch = JSON.parse(savedFluidSearch);
        } else {
          const defaultFluidSearch =
            (window as any).RUNTIME_CONFIG?.FLUID_SEARCH !== false;
          currentFluidSearch = defaultFluidSearch;
        }
      }

      // 如果读取的配置与当前状态不同，更新状态
      if (currentFluidSearch !== useFluidSearch) {
        setUseFluidSearch(currentFluidSearch);
      }

      if (currentFluidSearch) {
        // 流式搜索：打开新的流式连接
        const es = new EventSource(
          `/api/search/ws?q=${encodeURIComponent(trimmed)}`
        );
        eventSourceRef.current = es;

        es.onmessage = (event) => {
          if (!event.data) return;
          try {
            const payload = JSON.parse(event.data);
            if (currentQueryRef.current !== trimmed) return;
            switch (payload.type) {
              case 'start':
                setTotalSources(payload.totalSources || 0);
                setCompletedSources(0);
                break;
              case 'source_result': {
                setCompletedSources((prev) => prev + 1);
                if (
                  Array.isArray(payload.results) &&
                  payload.results.length > 0
                ) {
                  // 缓冲新增结果，节流刷入，避免频繁重渲染导致闪烁
                  const activeYearOrder =
                    viewMode === 'agg'
                      ? filterAgg.yearOrder
                      : filterAll.yearOrder;
                  const incoming: SearchResult[] =
                    activeYearOrder === 'none'
                      ? sortBatchForNoOrder(payload.results as SearchResult[])
                      : (payload.results as SearchResult[]);
                  pendingResultsRef.current.push(...incoming);
                  if (!flushTimerRef.current) {
                    flushTimerRef.current = window.setTimeout(() => {
                      const toAppend = pendingResultsRef.current;
                      pendingResultsRef.current = [];
                      startTransition(() => {
                        setSearchResults((prev) => prev.concat(toAppend));
                      });
                      flushTimerRef.current = null;
                    }, 80);
                  }
                }
                break;
              }
              case 'source_error':
                setCompletedSources((prev) => prev + 1);
                break;
              case 'complete':
                setCompletedSources(payload.completedSources || totalSources);
                // 完成前确保将缓冲写入
                if (pendingResultsRef.current.length > 0) {
                  const toAppend = pendingResultsRef.current;
                  pendingResultsRef.current = [];
                  if (flushTimerRef.current) {
                    clearTimeout(flushTimerRef.current);
                    flushTimerRef.current = null;
                  }
                  startTransition(() => {
                    setSearchResults((prev) => {
                      const allResults = prev.concat(toAppend);
                      // 更新缓存
                      const cache = searchCacheRef.current;
                      cache.set(trimmed, {
                        results: allResults,
                        timestamp: Date.now(),
                        totalSources: payload.completedSources || totalSources
                      });
                      
                      // 维护缓存大小，使用 LRU 策略
                      if (cache.size > CACHE_SIZE) {
                        const oldestKey = cache.keys().next().value;
                        cache.delete(oldestKey);
                      }
                      
                      return allResults;
                    });
                  });
                } else {
                  // 如果没有缓冲，直接更新缓存
                  const cache = searchCacheRef.current;
                  cache.set(trimmed, {
                    results: searchResults,
                    timestamp: Date.now(),
                    totalSources: payload.completedSources || totalSources
                  });
                  
                  // 维护缓存大小，使用 LRU 策略
                  if (cache.size > CACHE_SIZE) {
                    const oldestKey = cache.keys().next().value;
                    cache.delete(oldestKey);
                  }
                }
                setIsLoading(false);
                try {
                  es.close();
                } catch {}
                if (eventSourceRef.current === es) {
                  eventSourceRef.current = null;
                }
                break;
            }
          } catch {}
        };

        es.onerror = () => {
          setIsLoading(false);
          // 错误时也清空缓冲
          if (pendingResultsRef.current.length > 0) {
            const toAppend = pendingResultsRef.current;
            pendingResultsRef.current = [];
            if (flushTimerRef.current) {
              clearTimeout(flushTimerRef.current);
              flushTimerRef.current = null;
            }
            startTransition(() => {
              setSearchResults((prev) => prev.concat(toAppend));
            });
          }
          try {
            es.close();
          } catch {}
          if (eventSourceRef.current === es) {
            eventSourceRef.current = null;
          }
        };
      } else {
        // 传统搜索：使用普通接口
        fetch(`/api/search?q=${encodeURIComponent(trimmed)}`)
          .then((response) => response.json())
          .then((data) => {
            if (currentQueryRef.current !== trimmed) return;

            if (data.results && Array.isArray(data.results)) {
              const activeYearOrder = 
                viewMode === 'agg' ? filterAgg.yearOrder : filterAll.yearOrder;
              const results: SearchResult[] = 
                activeYearOrder === 'none'
                  ? sortBatchForNoOrder(data.results as SearchResult[])
                  : (data.results as SearchResult[]);

              setSearchResults(results);
              setTotalSources(1);
              setCompletedSources(1);
              
              // 更新缓存
              const cache = searchCacheRef.current;
              cache.set(trimmed, {
                results,
                timestamp: Date.now(),
                totalSources: 1
              });
              
              // 维护缓存大小，使用 LRU 策略
              if (cache.size > CACHE_SIZE) {
                const oldestKey = cache.keys().next().value;
                cache.delete(oldestKey);
              }
            }
            setIsLoading(false);
          })
          .catch(() => {
            setIsLoading(false);
          });
      }
      setShowSuggestions(false);

      // 保存到搜索历史 (事件监听会自动更新界面)
      addSearchHistory(query);
    } else {
      setShowResults(false);
      setShowSuggestions(false);
    }
  }, [searchParams]);

  // 组件卸载时，关闭可能存在的连接
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        try {
          eventSourceRef.current.close();
        } catch {}
        eventSourceRef.current = null;
      }
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      pendingResultsRef.current = [];
    };
  }, []);

  // 搜索防抖：创建一个防抖函数
  const debounce = <T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): ((...args: Parameters<T>) => void) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  };
  
  // 防抖处理搜索建议请求
  const debouncedHandleInputChange = React.useMemo(
    () => 
      debounce((value: string) => {
        if (value.trim()) {
          setShowSuggestions(true);
        } else {
          setShowSuggestions(false);
        }
      }, 300), // 300ms延迟，平衡响应速度和API调用次数
    []
  );
  
  // 输入框内容变化时触发，显示搜索建议
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // 使用防抖函数处理搜索建议
    debouncedHandleInputChange(value);
  };

  // 搜索框聚焦时触发，显示搜索建议
  const handleInputFocus = () => {
    if (searchQuery.trim()) {
      setShowSuggestions(true);
    }
  };

  // 搜索表单提交时触发，处理搜索逻辑
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim().replace(/\s+/g, ' ');
    if (!trimmed) return;

    // 回显搜索框
    setSearchQuery(trimmed);
    setIsLoading(true);
    setShowResults(true);
    setShowSuggestions(false);

    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    // 其余由 searchParams 变化的 effect 处理
  };

  const handleSuggestionSelect = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);

    // 自动执行搜索
    setIsLoading(true);
    setShowResults(true);

    router.push(`/search?q=${encodeURIComponent(suggestion)}`);
    // 其余由 searchParams 变化的 effect 处理
  };

  // 返回顶部功能
  const scrollToTop = () => {
    try {
      // 根据调试结果，真正的滚动容器是 document.body
      document.body.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    } catch (error) {
      // 如果平滑滚动完全失败，使用立即滚动
      document.body.scrollTop = 0;
    }
  };

  return (
    <PageLayout>
      <div className='px-4 sm:px-10 py-4 sm:py-8 overflow-visible mb-10'>
        {/* 搜索框 */}
        <div className='mb-8'>
          <form onSubmit={handleSearch} className='max-w-2xl mx-auto'>
            <div className='relative'>
              <Search className='absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-gray-500' />
              <input
                id='searchInput'
                type='text'
                value={searchQuery}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                placeholder='搜索电影、电视剧...'
                autoComplete='off'
                className='w-full h-12 rounded-lg bg-gray-50/80 py-3 pl-10 pr-12 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white border border-gray-200/50 shadow-sm dark:bg-gray-800 dark:text-gray-300 dark:placeholder-gray-500 dark:focus:bg-gray-700 dark:border-gray-700'
              />

              {/* 清除按钮 */}
              {searchQuery && (
                <button
                  type='button'
                  onClick={() => {
                    setSearchQuery('');
                    setShowSuggestions(false);
                    document.getElementById('searchInput')?.focus();
                  }}
                  className='absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors dark:text-gray-500 dark:hover:text-gray-300'
                  aria-label='清除搜索内容'
                >
                  <X className='h-5 w-5' />
                </button>
              )}

              {/* 搜索建议 */}
              <SearchSuggestions
                query={searchQuery}
                isVisible={showSuggestions}
                onSelect={handleSuggestionSelect}
                onClose={() => setShowSuggestions(false)}
                onEnterKey={() => {
                  // 当用户按回车键时，使用搜索框的实际内容进行搜索
                  const trimmed = searchQuery.trim().replace(/\s+/g, ' ');
                  if (!trimmed) return;

                  // 回显搜索框
                  setSearchQuery(trimmed);
                  setIsLoading(true);
                  setShowResults(true);
                  setShowSuggestions(false);

                  router.push(`/search?q=${encodeURIComponent(trimmed)}`);
                }}
              />
            </div>
          </form>
        </div>

        {/* 搜索结果或搜索历史 */}
        <div className='max-w-[95%] mx-auto mt-12 overflow-visible'>
          {showResults ? (
            <section className='mb-12'>
              {/* 标题 */}
              <div className='mb-4'>
                <h2 className='text-xl font-bold text-gray-800 dark:text-gray-200'>
                  搜索结果
                  {totalSources > 0 && useFluidSearch && (
                    <span className='ml-2 text-sm font-normal text-gray-500 dark:text-gray-400'>
                      {completedSources}/{totalSources}
                    </span>
                  )}
                  {isLoading && useFluidSearch && (
                    <span className='ml-2 inline-block align-middle'>
                      <span className='inline-block h-3 w-3 border-2 border-gray-300 border-t-green-500 rounded-full animate-spin'></span>
                    </span>
                  )}
                </h2>
              </div>
              {/* 筛选器 + 开关控件 */}
              <div className='mb-8 space-y-4'>
                {/* 筛选器 */}
                <div className='flex-1 min-w-0'>
                  {viewMode === 'agg' ? (
                    <SearchResultFilter
                      categories={filterOptions.categoriesAgg}
                      values={filterAgg}
                      onChange={(v) => setFilterAgg(v as any)}
                    />
                  ) : (
                    <SearchResultFilter
                      categories={filterOptions.categoriesAll}
                      values={filterAll}
                      onChange={(v) => setFilterAll(v as any)}
                    />
                  )}
                </div>

                {/* 开关控件行 */}
                <div className='flex items-center justify-end gap-6'>
                  {/* 虚拟化开关 */}
                  <label className='flex items-center gap-2 cursor-pointer select-none shrink-0'>
                    <span className='text-xs sm:text-sm text-gray-700 dark:text-gray-300'>
                      虚拟滑动
                    </span>
                    <div className='relative'>
                      <input
                        type='checkbox'
                        className='sr-only peer'
                        checked={useVirtualization}
                        onChange={toggleVirtualization}
                      />
                      <div className='w-9 h-5 bg-gray-300 rounded-full peer-checked:bg-blue-500 transition-colors dark:bg-gray-600'></div>
                      <div className='absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4'></div>
                    </div>
                  </label>

                  {/* 聚合开关 */}
                  <label className='flex items-center gap-2 cursor-pointer select-none shrink-0'>
                    <span className='text-xs sm:text-sm text-gray-700 dark:text-gray-300'>
                      聚合
                    </span>
                    <div className='relative'>
                      <input
                        type='checkbox'
                        className='sr-only peer'
                        checked={viewMode === 'agg'}
                        onChange={() =>
                          setViewMode(viewMode === 'agg' ? 'all' : 'agg')
                        }
                      />
                      <div className='w-9 h-5 bg-gray-300 rounded-full peer-checked:bg-green-500 transition-colors dark:bg-gray-600'></div>
                      <div className='absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4'></div>
                    </div>
                  </label>
                </div>
              </div>
              {/* 条件渲染：虚拟化 vs 传统网格 */}
              {useVirtualization ? (
                <VirtualSearchGrid
                  allResults={searchResults}
                  filteredResults={filteredAllResults}
                  aggregatedResults={aggregatedResults}
                  filteredAggResults={filteredAggResults}
                  viewMode={viewMode}
                  searchQuery={searchQuery}
                  isLoading={isLoading}
                  groupRefs={groupRefs}
                  groupStatsRef={groupStatsRef}
                  getGroupRef={getGroupRef}
                  computeGroupStats={computeGroupStats}
                />
              ) : // 传统网格渲染（保持原有逻辑）
              searchResults.length === 0 ? (
                isLoading ? (
                  <div className='flex justify-center items-center h-40'>
                    <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-green-500'></div>
                  </div>
                ) : (
                  <div className='text-center text-gray-500 py-8 dark:text-gray-400'>
                    未找到相关结果
                  </div>
                )
              ) : (
                <div
                  key={`search-results-${viewMode}`}
                  className='justify-start grid grid-cols-2 gap-x-4 gap-y-14 sm:gap-y-20 px-0 sm:px-2 sm:grid-cols-[repeat(auto-fill,_minmax(11rem,_1fr))] sm:gap-x-8'
                >
                  {viewMode === 'agg'
                    ? filteredAggResults.map(([mapKey, group]) => {
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

                        return (
                          <div key={`agg-${mapKey}`} className='w-full'>
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
                    : filteredAllResults.map((item) => (
                        <div
                          key={`all-${item.source}-${item.id}`}
                          className='w-full'
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
                      ))}
                </div>
              )}
            </section>
          ) : searchHistory.length > 0 ? (
            // 搜索历史
            <section className='mb-12'>
              <h2 className='mb-4 text-xl font-bold text-gray-800 text-left dark:text-gray-200'>
                搜索历史
                {searchHistory.length > 0 && (
                  <button
                    onClick={() => {
                      clearSearchHistory(); // 事件监听会自动更新界面
                    }}
                    className='ml-3 text-sm text-gray-500 hover:text-red-500 transition-colors dark:text-gray-400 dark:hover:text-red-500'
                  >
                    清空
                  </button>
                )}
              </h2>
              <div className='flex flex-wrap gap-2'>
                {searchHistory.map((item) => (
                  <div key={item} className='relative group'>
                    <button
                      onClick={() => {
                        setSearchQuery(item);
                        router.push(
                          `/search?q=${encodeURIComponent(item.trim())}`
                        );
                      }}
                      className='px-4 py-2 bg-gray-500/10 hover:bg-gray-300 rounded-full text-sm text-gray-700 transition-colors duration-200 dark:bg-gray-700/50 dark:hover:bg-gray-600 dark:text-gray-300'
                    >
                      {item}
                    </button>
                    {/* 删除按钮 */}
                    <button
                      aria-label='删除搜索历史'
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        deleteSearchHistory(item); // 事件监听会自动更新界面
                      }}
                      className='absolute -top-1 -right-1 w-4 h-4 opacity-0 group-hover:opacity-100 bg-gray-400 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] transition-colors'
                    >
                      <X className='w-3 h-3' />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>

      {/* 返回顶部悬浮按钮 */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-20 md:bottom-6 right-6 z-[500] w-12 h-12 bg-green-500/90 hover:bg-green-500 text-white rounded-full shadow-lg backdrop-blur-sm transition-all duration-300 ease-in-out flex items-center justify-center group ${
          showBackToTop
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        aria-label='返回顶部'
      >
        <ChevronUp className='w-6 h-6 transition-transform group-hover:scale-110' />
      </button>
    </PageLayout>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageClient />
    </Suspense>
  );
}
