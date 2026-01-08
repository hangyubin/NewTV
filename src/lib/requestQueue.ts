/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * 请求优先级枚举
 */
export enum RequestPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3,
}

/**
 * 请求选项接口
 */
export interface RequestOptions {
  url: string;
  priority?: RequestPriority;
  timeout?: number;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
}

/**
 * 请求任务接口
 */
interface RequestTask {
  id: string;
  options: RequestOptions;
  resolve: (value: Response) => void;
  reject: (reason: any) => void;
  startTime: number;
}

/**
 * 请求队列管理器
 * 用于限制并行请求数量并实现请求优先级
 */
export class RequestQueue {
  private queue: RequestTask[] = [];
  private activeRequests: Set<string> = new Set();
  private maxParallel: number;
  private timeout: number;
  private requestMap: Map<string, RequestTask> = new Map();

  /**
   * 构造函数
   * @param maxParallel 最大并行请求数，默认4
   * @param timeout 默认超时时间，默认10秒
   */
  constructor(maxParallel = 4, timeout = 10000) {
    this.maxParallel = maxParallel;
    this.timeout = timeout;
  }

  /**
   * 生成唯一请求ID
   */
  private generateId(options: RequestOptions): string {
    const bodyStr = options.body ? JSON.stringify(options.body) : '';
    return `${options.method || 'GET'}:${options.url}:${bodyStr}`;
  }

  /**
   * 添加请求到队列
   */
  private addToQueue(task: RequestTask): void {
    // 按优先级排序插入
    let inserted = false;
    for (let i = 0; i < this.queue.length; i++) {
      const queuePriority =
        this.queue[i].options.priority || RequestPriority.NORMAL;
      const taskPriority = task.options.priority || RequestPriority.NORMAL;
      if (queuePriority < taskPriority) {
        this.queue.splice(i, 0, task);
        inserted = true;
        break;
      }
    }
    if (!inserted) {
      this.queue.push(task);
    }

    this.requestMap.set(task.id, task);
  }

  /**
   * 执行下一个请求
   */
  private executeNext(): void {
    if (
      this.activeRequests.size >= this.maxParallel ||
      this.queue.length === 0
    ) {
      return;
    }

    // 获取优先级最高的请求
    const task = this.queue.shift();
    if (!task) return;

    this.activeRequests.add(task.id);
    this.requestMap.delete(task.id);

    const { options, resolve, reject } = task;
    const timeoutId = setTimeout(() => {
      this.activeRequests.delete(task.id);
      reject(new Error(`Request timed out: ${options.url}`));
      this.executeNext();
    }, options.timeout || this.timeout);

    fetch(options.url, {
      method: options.method || 'GET',
      headers: options.headers || {
        'Content-Type': 'application/json',
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    })
      .then((response) => {
        clearTimeout(timeoutId);
        this.activeRequests.delete(task.id);
        resolve(response);
        this.executeNext();
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        this.activeRequests.delete(task.id);
        reject(error);
        this.executeNext();
      });
  }

  /**
   * 发起请求
   */
  async fetch(options: RequestOptions): Promise<Response> {
    const id = this.generateId(options);
    const priority = options.priority || RequestPriority.NORMAL;

    // 如果请求已在队列或活跃中，直接返回现有请求
    if (this.requestMap.has(id)) {
      const existingTask = this.requestMap.get(id);
      if (!existingTask) {
        throw new Error(`Request not found in queue: ${id}`);
      }
      return new Promise((resolve, reject) => {
        // 替换resolve和reject，以便返回相同的结果
        const originalResolve = existingTask.resolve;
        const originalReject = existingTask.reject;
        existingTask.resolve = (value: Response) => {
          originalResolve(value);
          resolve(value);
        };
        existingTask.reject = (reason: any) => {
          originalReject(reason);
          reject(reason);
        };
      });
    }

    if (this.activeRequests.has(id)) {
      // 如果请求正在执行，等待其完成
      return new Promise((resolve, reject) => {
        const checkActive = () => {
          if (!this.activeRequests.has(id)) {
            // 重新发起请求
            this.fetch(options).then(resolve).catch(reject);
          }
        };
        setInterval(checkActive, 100);
      });
    }

    return new Promise((resolve, reject) => {
      const task: RequestTask = {
        id,
        options: { ...options, priority },
        resolve,
        reject,
        startTime: Date.now(),
      };

      this.addToQueue(task);
      this.executeNext();
    });
  }

  /**
   * 取消请求
   */
  cancel(requestId: string): boolean {
    // 从队列中移除
    const queueIndex = this.queue.findIndex((task) => task.id === requestId);
    if (queueIndex > -1) {
      this.queue.splice(queueIndex, 1);
      this.requestMap.delete(requestId);
      return true;
    }
    return false;
  }

  /**
   * 清空队列
   */
  clear(): void {
    this.queue.length = 0;
    this.requestMap.clear();
  }

  /**
   * 获取队列状态
   */
  getStatus(): {
    active: number;
    queued: number;
    maxParallel: number;
  } {
    return {
      active: this.activeRequests.size,
      queued: this.queue.length,
      maxParallel: this.maxParallel,
    };
  }
}

// 创建全局请求队列实例
export const requestQueue = new RequestQueue(3, 10000); // 限制为3个并行请求，10秒超时

/**
 * 使用请求队列的fetch包装函数
 */
export async function queuedFetch(
  url: string,
  options?: Omit<RequestOptions, 'url'>
): Promise<Response> {
  return requestQueue.fetch({
    url,
    ...options,
  });
}
