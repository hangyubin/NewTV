'use client';

import React from 'react';
import PageLayout from '../components/PageLayout';

const ShortDramaPage = () => {
  return (
    <PageLayout>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <h1 className='text-3xl font-bold text-gray-900 dark:text-white mb-6'>
          热门短剧
        </h1>
        <div className='text-gray-600 dark:text-gray-400'>
          <p>短剧内容正在开发中，敬请期待！</p>
        </div>
      </div>
    </PageLayout>
  );
};

export default ShortDramaPage;