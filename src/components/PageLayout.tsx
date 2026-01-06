import MobileBottomNav from './MobileBottomNav';
import MobileHeader from './MobileHeader';
import Sidebar from './Sidebar';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

interface PageLayoutProps {
  children: React.ReactNode;
  activePath?: string;
  defaultSidebarCollapsed?: boolean;
}

const PageLayout = ({  children,  activePath,  defaultSidebarCollapsed,}: PageLayoutProps) => {
  return (
    <div className='w-full min-h-screen bg-pattern'>
      {/* 移动端头部 - 添加玻璃态效果 */}
      <MobileHeader showBackButton={false} className='glass-nav' />

      {/* 主要布局容器 */}
      <div className='flex md:grid md:grid-cols-[auto_1fr] w-full min-h-screen md:min-h-auto'>
        {/* 侧边栏 - 桌面端显示，移动端隐藏 */}
        <div className='hidden md:block'>
          <Sidebar defaultCollapsed={defaultSidebarCollapsed} />
        </div>

        {/* 主内容区域 */}
        <div className='relative min-w-0 flex-1 transition-all duration-300 overflow-hidden'>
          {/* 桌面端顶部按钮 - 增强玻璃态效果 */}
          <div className='absolute top-2 right-4 z-20 hidden md:flex items-center gap-3 p-2 rounded-xl glass-strong backdrop-blur-md'>
            <ThemeToggle className='hover-lift' />
            <UserMenu className='hover-lift' />
          </div>

          {/* 主内容 - 添加渐变背景和玻璃态效果 */}
          <main
            className='flex-1 md:min-h-0 mb-14 md:mb-0 md:mt-0 mt-12 p-4 md:p-6'
            style={{
              paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom))',
            }}
          >
            <div className='w-full max-w-[1400px] mx-auto px-2 sm:px-0'>
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* 移动端底部导航 - 添加玻璃态效果 */}
      <div className='md:hidden'>
        <MobileBottomNav activePath={activePath} className='glass-nav' />
      </div>
    </div>
  );
};

export default PageLayout;
