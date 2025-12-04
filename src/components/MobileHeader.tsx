'use client';

import Link from 'next/link';

import { BackButton } from './BackButton';
import { useSite } from './SiteProvider';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

interface MobileHeaderProps {
  showBackButton?: boolean;
}

const MobileHeader = ({ showBackButton = false }: MobileHeaderProps) => {
  const { siteName } = useSite();
  return (
    <header className='md:hidden fixed top-0 left-0 right-0 z-[999] w-full backdrop-blur-lg bg-white/90 dark:bg-gray-900/90 border-b border-white/30 dark:border-gray-800/50 shadow-lg shadow-black/5 dark:shadow-black/20 transition-all duration-300'>
      <div className='h-14 flex items-center justify-between px-4 pt-1'>
        {/* 左侧：搜索按钮、AI推荐按钮、返回按钮和设置按钮 */}
        <div className='flex items-center gap-2'>
          <Link
            href='/search'
            className='w-10 h-10 p-2 rounded-full flex items-center justify-center text-gray-600 hover:bg-blue-50 dark:text-gray-300 dark:hover:bg-blue-900/20 transition-all duration-300 group'
          >
            <svg
              className='w-full h-full transition-all duration-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:scale-110'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
              xmlns='http://www.w3.org/2000/svg'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
              />
            </svg>
          </Link>
          {showBackButton && <BackButton />}
        </div>

        {/* 右侧按钮 */}
        <div className='flex items-center gap-2'>
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>

      {/* 中间：Logo（绝对居中） */}
      <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'>
        <Link
          href='/'
          className='text-2xl font-bold text-gray-900 dark:text-white tracking-tight hover:opacity-90 transition-all duration-300 hover:scale-105 drop-shadow-sm'
        >
          {siteName}
        </Link>
      </div>
    </header>
  );
};

export default MobileHeader;
