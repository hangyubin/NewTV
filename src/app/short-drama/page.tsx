'use client';

import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

import { getShortDramaData, shortDramaTypeOptions, shortDramaRegionOptions } from '@/lib/short-drama.client';
import { ShortDramaItem } from '@/lib/types';

import PageLayout from '@/components/PageLayout';
import VideoCard from '@/components/VideoCard';
import ScrollableRow from '@/components/ScrollableRow';
import FilterSection from '@/components/FilterSection';

function ShortDramaPage() {
  const [shortDramas, setShortDramas] = useState<ShortDramaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: 'all',
    region: 'all',
    year: 'all',
    page: 1,
    limit: 20,
  });

  useEffect(() => {
    const fetchShortDramaData = async () => {
      try {
        setLoading(true);
        const data = await getShortDramaData(filters);
        setShortDramas(data.results);
      } catch (error) {
        console.error('获取短剧数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchShortDramaData();
  }, [filters]);

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: 1, // 重置到第一页
    }));
  };

  return (
    <PageLayout>
      <div className='px-2 sm:px-10 py-4 sm:py-8 overflow-visible'>
        <div className='max-w-[95%] mx-auto'>
          {/* 页面标题 */}
          <section className='mb-8'>
            <div className='mb-4 flex items-center justify-between'>
              <h1 className='text-2xl font-bold text-gray-800 dark:text-gray-200'>
                热门短剧
              </h1>
              <Link
                href='/'
                className='flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              >
                返回首页
                <ChevronRight className='w-4 h-4 ml-1' />
              </Link>
            </div>
          </section>

          {/* 筛选器 */}
          <section className='mb-8'>
            <FilterSection
              typeOptions={shortDramaTypeOptions}
              regionOptions={shortDramaRegionOptions}
              yearOptions={[]} // 短剧暂时不需要年份筛选
              selectedType={filters.type}
              selectedRegion={filters.region}
              selectedYear={filters.year}
              onFilterChange={handleFilterChange}
            />
          </section>

          {/* 短剧列表 */}
          <section className='mb-8'>
            {loading ? (
              // 加载状态显示灰色占位数据
              <div className='grid grid-cols-2 gap-x-4 gap-y-14 sm:gap-y-20 px-0 sm:px-2 sm:grid-cols-[repeat(auto-fill,_minmax(11rem,_1fr))] sm:gap-x-8'>
                {Array.from({ length: 10 }).map((_, index) => (
                  <div key={index} className='w-full'>
                    <div className='relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-gray-200 animate-pulse dark:bg-gray-800'>
                      <div className='absolute inset-0 bg-gray-300 dark:bg-gray-700'></div>
                    </div>
                    <div className='mt-2 h-4 bg-gray-200 rounded animate-pulse dark:bg-gray-800'></div>
                  </div>
                ))}
              </div>
            ) : shortDramas.length > 0 ? (
              // 显示短剧列表
              <div className='grid grid-cols-2 gap-x-4 gap-y-14 sm:gap-y-20 px-0 sm:px-2 sm:grid-cols-[repeat(auto-fill,_minmax(11rem,_1fr))] sm:gap-x-8'>
                {shortDramas.map((drama, index) => (
                  <div key={drama.id || index} className='w-full'>
                    <VideoCard
                      from='short-drama'
                      title={drama.name}
                      poster={drama.pic}
                      id={drama.id}
                      source_name={drama.source_name}
                      type='tv'
                    />
                  </div>
                ))}
              </div>
            ) : (
              // 无数据状态
              <div className='col-span-full text-center text-gray-500 py-16 dark:text-gray-400'>
                暂无短剧数据
              </div>
            )}
          </section>
        </div>
      </div>
    </PageLayout>
  );
}

export default ShortDramaPage;