/**
 * 日志管理模块
 * 提供统一的日志记录功能，支持不同日志级别和环境
 */

// 日志级别枚举
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

// 日志配置接口
interface LoggerConfig {
  level: LogLevel;
  enableFileLogging: boolean;
  enableConsoleLogging: boolean;
  environment: 'development' | 'production';
}

// 日志条目接口
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  error?: Error;
  stack?: string;
}

// 日志管理类
export class Logger {
  private static instance: Logger;
  private config: LoggerConfig;
  private logQueue: LogEntry[] = [];
  private maxQueueSize = 1000;

  // 构造函数
  private constructor() {
    this.config = {
      level: (process.env.LOG_LEVEL as LogLevel) || LogLevel.INFO,
      enableFileLogging: process.env.ENABLE_FILE_LOGGING === 'true',
      enableConsoleLogging: process.env.ENABLE_CONSOLE_LOGGING !== 'false',
      environment:
        (process.env.NODE_ENV as 'development' | 'production') || 'development',
    };
  }

  // 获取单例实例
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  // 获取日志级别权重
  private getLevelWeight(level: LogLevel): number {
    const weights = {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 1,
      [LogLevel.WARN]: 2,
      [LogLevel.ERROR]: 3,
      [LogLevel.FATAL]: 4,
    };
    return weights[level];
  }

  // 检查是否应该记录该级别的日志
  private shouldLog(level: LogLevel): boolean {
    return this.getLevelWeight(level) >= this.getLevelWeight(this.config.level);
  }

  // 格式化日志条目
  private formatLogEntry(entry: LogEntry): string {
    const { timestamp, level, message, data, error } = entry;
    let logString = `${timestamp} [${level.toUpperCase()}] ${message}`;

    if (data) {
      logString += ` - ${JSON.stringify(data)}`;
    }

    if (error) {
      logString += ` - Error: ${error.message}`;
      if (error.stack) {
        logString += `\n${error.stack}`;
      }
    }

    return logString;
  }

  // 记录日志
  private log(
    level: LogLevel,
    message: string,
    data?: any,
    error?: Error
  ): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      error,
      stack: error?.stack,
    };

    // 添加到日志队列
    this.logQueue.push(entry);

    // 如果队列超过最大大小，移除最旧的日志
    if (this.logQueue.length > this.maxQueueSize) {
      this.logQueue.shift();
    }

    // 控制台日志
    if (this.config.enableConsoleLogging) {
      const logString = this.formatLogEntry(entry);
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(logString);
          break;
        case LogLevel.INFO:
          console.info(logString);
          break;
        case LogLevel.WARN:
          console.warn(logString);
          break;
        case LogLevel.ERROR:
          console.error(logString);
          break;
        case LogLevel.FATAL:
          console.error(logString);
          break;
      }
    }

    // 文件日志（目前仅在Node.js环境中支持）
    if (this.config.enableFileLogging && typeof window === 'undefined') {
      // 在实际应用中，这里可以实现文件日志记录
      // 例如使用 winston 或 bunyan 库
      // 由于当前环境限制，暂时不实现
    }
  }

  // 调试日志
  public debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  // 信息日志
  public info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  // 警告日志
  public warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  // 错误日志
  public error(message: string, error?: Error, data?: any): void {
    this.log(LogLevel.ERROR, message, data, error);
  }

  // 致命错误日志
  public fatal(message: string, error?: Error, data?: any): void {
    this.log(LogLevel.FATAL, message, data, error);
    // 在生产环境中，可以在这里添加告警逻辑
  }

  // 获取最近的日志
  public getRecentLogs(count = 100): LogEntry[] {
    return this.logQueue.slice(-count);
  }

  // 清除日志
  public clearLogs(): void {
    this.logQueue = [];
  }

  // 更新日志配置
  public updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// 导出单例实例
export const logger = Logger.getInstance();
