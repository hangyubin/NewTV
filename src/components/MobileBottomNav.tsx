/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';

import { Cat, Clapperboard, Clover, Ellipsis, Film, Home, Radio, Star, Tv } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface MobileBottomNavProps {
  /**
   * 主动指定当前激活的路径。当未提供时，自动使用 usePathname() 获取的路径。
   */
  activePath?: string;
}

const MobileBottomNav = ({ activePath }: MobileBottomNavProps) => {
  const pathname = usePathname();
  const [currentActive, setCurrentActive] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);

  // 监听路径变化，确保状态同步
  useEffect(() => {
    const newActive = activePath ?? pathname;
    if (newActive) {
      setCurrentActive(newActive);
      setIsInitialized(true);
    }
  }, [activePath, pathname]);

  // 初始化时设置当前路径
  useEffect(() => {
    if (!isInitialized && pathname) {
      const initialActive = activePath ?? pathname;
      setCurrentActive(initialActive);
      setIsInitialized(true);
    }
  }, [pathname, activePath, isInitialized]);

  const [navItems, setNavItems] = useState([
    { icon: Home, label: '首页', href: '/' },
    { icon: Film, label: '电影', href: '/douban?type=movie' },
    { icon: Tv, label: '剧集', href: '/douban?type=tv' },
    { icon: Radio, label: '直播', href: '/live' },
    { icon: Ellipsis, label: '更多', href: '#more' },
  ]);

  const [showMore, setShowMore] = useState(false);
  const [hasCustom, setHasCustom] = useState(false);

  useEffect(() => {
    const runtimeConfig = (window as any).RUNTIME_CONFIG;
    setHasCustom(!!(runtimeConfig?.CUSTOM_CATEGORIES?.length > 0));
  }, []);

  const isActive = (href: string) => {
    // 如果组件未初始化或currentActive为空，不激活任何项
    if (!isInitialized || !currentActive) {
      return false;
    }

    // 解码URL以进行正确的比较
    const decodedActive = decodeURIComponent(currentActive);

    // 首页严格匹配 - 只有完全是根路径时才激活
    if (href === '/') {
      return decodedActive === '/';
    }

    // 直播页面匹配
    if (href === '/live') {
      return decodedActive === '/live' || decodedActive.startsWith('/live/');
    }



    // 处理豆瓣类型页面的匹配
    if (href.startsWith('/douban?type=')) {
      // 提取导航项的type参数
      const hrefTypeMatch = href.match(/type=([^&]+)/)?.[1];

      if (hrefTypeMatch && decodedActive.startsWith('/douban')) {
        // 解析当前URL的查询参数
        const [, queryString] = decodedActive.split('?');
        if (queryString) {
          const params = new URLSearchParams(queryString);
          const currentType = params.get('type');
          // 严格匹配type参数
          return currentType === hrefTypeMatch;
        }
        // 如果豆瓣页面没有type参数，不匹配任何导航项
        return false;
      }
      return false;
    }

    return false;
  };

  const moreActive = isInitialized && currentActive ? (
    currentActive.includes('type=anime') ||
    currentActive.includes('type=show') ||
    currentActive.includes('type=short-drama') ||
    currentActive.includes('type=custom')
  ) : false;

  return (
    <nav
      className='md:hidden fixed left-0 right-0 z-[600] overflow-visible backdrop-blur-lg bg-white/80 dark:bg-gray-900/80 border-t border-white/30 dark:border-gray-800/50 shadow-lg shadow-black/5 dark:shadow-black/20 transition-all duration-300'
      style={{
        /* 紧贴视口底部，同时在内部留出安全区高度 */
        bottom: 0,
        paddingBottom: 'env(safe-area-inset-bottom)',
        minHeight: 'calc(3.5rem + env(safe-area-inset-bottom))',
      }}
    >
      <ul className='grid grid-cols-6 w-full'>
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <li
              key={item.href}
              className='flex justify-center items-center'
            >
              {item.label !== '更多' ? (
                <Link
                  href={item.href}
                  className='flex flex-col items-center justify-center w-full h-14 gap-1 text-xs transition-all duration-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg relative group'
                >
                  {/* 激活状态的背景指示器 */}
                  {active && (
                    <div className='absolute inset-0 bg-blue-100 dark:bg-blue-900/30 rounded-lg opacity-70' />
                  )}
                  <item.icon
                    className={`h-6 w-6 transition-all duration-300 ${active
                      ? 'text-blue-600 dark:text-blue-400 scale-110 drop-shadow-[0_0_4px_rgba(59,130,246,0.5)]'
                      : 'text-gray-500 dark:text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400'
                      }`}
                  />
                  <span
                    className={`transition-all duration-300 font-medium ${active
                      ? 'text-blue-700 dark:text-blue-300 scale-105'
                      : 'text-gray-600 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                      } ${item.label === 'YouTube' ? 'text-[10px]' : 'text-xs'}`}
                  >
                    {item.label}
                  </span>
                </Link>
              ) : (
                <button
                  type='button'
                  onClick={() => setShowMore((v) => !v)}
                  className='flex flex-col items-center justify-center w-full h-14 gap-1 text-xs transition-all duration-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg relative group'
                >
                  {/* 激活状态的背景指示器 */}
                  {moreActive && (
                    <div className='absolute inset-0 bg-blue-100 dark:bg-blue-900/30 rounded-lg opacity-70' />
                  )}
                  <item.icon
                    className={`h-6 w-6 transition-all duration-300 ${moreActive
                      ? 'text-blue-600 dark:text-blue-400 scale-110 drop-shadow-[0_0_4px_rgba(59,130,246,0.5)]'
                      : 'text-gray-500 dark:text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400'
                      }`}
                  />
                  <span className={`transition-all duration-300 font-medium ${moreActive ? 'text-blue-700 dark:text-blue-300 scale-105' : 'text-gray-600 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400'} text-xs`}>
                    更多
                  </span>
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {showMore && (
        <div className='absolute bottom-[calc(3.5rem+env(safe-area-inset-bottom)+0.5rem)] left-0 right-0 z-[650] px-4 animate-fade-in-up'>
          <div className='mx-auto max-w-sm backdrop-blur-lg bg-white/90 dark:bg-gray-900/90 border border-white/30 dark:border-gray-800/50 shadow-xl shadow-black/10 dark:shadow-black/30 rounded-2xl overflow-hidden transform transition-all duration-300 hover:shadow-2xl'>
            <div className='flex divide-x divide-gray-200/60 dark:divide-gray-700/60'>
              <Link
                href='/douban?type=short-drama'
                className='flex-1 px-3 py-4 flex items-center justify-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-300 group'
                onClick={() => setShowMore(false)}
              >
                <Clapperboard className='h-5 w-5 transition-colors duration-300 group-hover:text-blue-600 dark:group-hover:text-blue-400' /> 短剧
              </Link>
              <Link
                href='/douban?type=anime'
                className='flex-1 px-3 py-4 flex items-center justify-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-300 group'
                onClick={() => setShowMore(false)}
              >
                <Cat className='h-5 w-5 transition-colors duration-300 group-hover:text-blue-600 dark:group-hover:text-blue-400' /> 动漫
              </Link>
              <Link
                href='/douban?type=show'
                className='flex-1 px-3 py-4 flex items-center justify-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-300 group'
                onClick={() => setShowMore(false)}
              >
                <Clover className='h-5 w-5 transition-colors duration-300 group-hover:text-blue-600 dark:group-hover:text-blue-400' /> 综艺
              </Link>
              {hasCustom && (
                <Link
                  href='/douban?type=custom'
                  className='flex-1 px-3 py-4 flex items-center justify-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-300 group'
                  onClick={() => setShowMore(false)}
                >
                  <Star className='h-5 w-5 transition-colors duration-300 group-hover:text-blue-600 dark:group-hover:text-blue-400' /> 纪录
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default MobileBottomNav;
