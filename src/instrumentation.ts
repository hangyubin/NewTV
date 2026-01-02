/**
 * Next.js 14 服务器端性能监控
 * 用于收集关键性能指标
 */

export function register() {
  if (process.env.NODE_ENV === 'production') {
    // 注册全局错误处理
    process.on('uncaughtException', (error, origin) => {
      console.error('未捕获异常:', {
        error: error.message,
        stack: error.stack,
        origin,
        timestamp: new Date().toISOString(),
      });
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('未处理的Promise拒绝:', {
        reason: reason instanceof Error ? reason.message : String(reason),
        timestamp: new Date().toISOString(),
      });
    });
  }
}
