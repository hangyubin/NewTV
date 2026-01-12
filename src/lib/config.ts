/* eslint-disable @typescript-eslint/no-explicit-any, no-console, @typescript-eslint/no-non-null-assertion */

import { db } from '@/lib/db';

import { AdminConfig } from './admin.types';
import { logger } from './logger';

export interface ApiSite {
  key: string;
  api: string;
  name: string;
  detail?: string;
  priority?: number; // 优先级，范围1-10，数值越大优先级越高
  disabled?: boolean; // 是否禁用
  from?: string; // 来源，config或custom
  health?: boolean; // 健康状态
  lastChecked?: number; // 上次检查时间
  responseTime?: number; // 响应时间
}

export interface LiveCfg {
  name: string;
  url: string;
  ua?: string;
  epg?: string; // 节目单
}

interface ConfigFileStruct {
  cache_time?: number;
  api_site?: {
    [key: string]: {
      api: string;
      name: string;
      detail?: string;
    };
  };
  custom_category?: {
    name?: string;
    type: 'movie' | 'tv';
    query: string;
  }[];
  lives?: {
    [key: string]: LiveCfg;
  };
}

// API配置
const API_CONFIG = {
  search: {
    path: '?ac=videolist&wd=',
    pagePath: '?ac=videolist&wd={query}&pg={page}',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: 'application/json',
    },
  },
  detail: {
    path: '?ac=videolist&ids=',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: 'application/json',
    },
  },
};

export { API_CONFIG };

// 集中管理所有配置，包括环境变量配置
class ConfigManager {
  // API配置
  public static readonly API_CONFIG = API_CONFIG;

  // 环境变量配置
  public static readonly ENV_CONFIG = {
    STORAGE_TYPE: process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage',
    SITE_NAME: process.env.NEXT_PUBLIC_SITE_NAME || 'NewTV',
    ANNOUNCEMENT:
      process.env.ANNOUNCEMENT ||
      '本网站仅提供影视信息搜索服务，所有内容均来自第三方网站。本站不存储任何视频资源，不对任何内容的准确性、合法性、完整性负责。',
    SEARCH_MAX_PAGE: Number(process.env.NEXT_PUBLIC_SEARCH_MAX_PAGE) || 5,
    DOUBAN_PROXY_TYPE:
      process.env.NEXT_PUBLIC_DOUBAN_PROXY_TYPE || 'cmliussss-cdn-tencent',
    DOUBAN_PROXY: process.env.NEXT_PUBLIC_DOUBAN_PROXY || '',
    DOUBAN_IMAGE_PROXY_TYPE:
      process.env.NEXT_PUBLIC_DOUBAN_IMAGE_PROXY_TYPE ||
      'cmliussss-cdn-tencent',
    DOUBAN_IMAGE_PROXY: process.env.NEXT_PUBLIC_DOUBAN_IMAGE_PROXY || '',
    DISABLE_YELLOW_FILTER:
      process.env.NEXT_PUBLIC_DISABLE_YELLOW_FILTER === 'true',
    FLUID_SEARCH: process.env.NEXT_PUBLIC_FLUID_SEARCH !== 'false',
    USERNAME: process.env.USERNAME || 'admin',
    PASSWORD: process.env.PASSWORD || '',
    JWT_SECRET: process.env.JWT_SECRET || '',
    REDIS_URL: process.env.REDIS_URL || '',
    KVROCKS_URL: process.env.KVROCKS_URL || '',
    UPSTASH_URL: process.env.UPSTASH_URL || '',
    UPSTASH_TOKEN: process.env.UPSTASH_TOKEN || '',
  };

  // 默认配置
  public static readonly DEFAULT_CONFIG = {
    api_site: {
      tyyszy: {
        name: 'TYYSZY API',
        api: 'https://tyyszy.com/api.php/provide/vod',
        detail: 'TYYSZY API',
      },
      iqiyizyapi: {
        name: 'IQIYI ZY API',
        api: 'https://iqiyizyapi.com/api.php/provide/vod',
        detail: 'IQIYI ZY API',
      },
      caiji_dbzy5: {
        name: 'Caiji DBZY5',
        api: 'https://caiji.dbzy5.com/api.php/provide/vod',
        detail: 'Caiji DBZY5 API',
      },
    },
    cache_time: 7200,
    custom_category: [],
    lives: {},
  };

  // 获取环境变量配置
  public static getEnvConfig() {
    return this.ENV_CONFIG;
  }

  // 获取API配置
  public static getApiConfig() {
    return this.API_CONFIG;
  }

  // 获取默认配置
  public static getDefaultConfig() {
    return this.DEFAULT_CONFIG;
  }

  // 验证配置
  public static validateConfig(config: any) {
    const errors: string[] = [];

    // 检查必要的配置项
    if (!config.UserConfig) {
      errors.push('缺少 UserConfig 配置');
    } else {
      if (!Array.isArray(config.UserConfig.Users)) {
        errors.push('UserConfig.Users 必须是数组');
      }
    }

    if (!Array.isArray(config.SourceConfig)) {
      errors.push('SourceConfig 必须是数组');
    }

    if (!Array.isArray(config.CustomCategories)) {
      errors.push('CustomCategories 必须是数组');
    }

    if (!Array.isArray(config.LiveConfig)) {
      errors.push('LiveConfig 必须是数组');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// 导出配置管理器
export const configManager = ConfigManager;

// 配置版本控制
let configVersion = 0;

// 在模块加载时根据环境决定配置来源
let cachedConfig: AdminConfig;

// 从配置文件补充管理员配置
export function refineConfig(adminConfig: AdminConfig): AdminConfig {
  let fileConfig: ConfigFileStruct;
  try {
    fileConfig = JSON.parse(adminConfig.ConfigFile) as ConfigFileStruct;
    // 如果没有API站点配置，使用默认配置
    if (!fileConfig.api_site || Object.keys(fileConfig.api_site).length === 0) {
      fileConfig.api_site = ConfigManager.DEFAULT_CONFIG.api_site;
    }
  } catch (e) {
    // 解析失败，使用默认配置
    fileConfig = ConfigManager.DEFAULT_CONFIG as ConfigFileStruct;
  }

  // 合并文件中的源信息
  const apiSitesFromFile = Object.entries(fileConfig.api_site || []);
  const currentApiSites = new Map(
    (adminConfig.SourceConfig || []).map((s) => [s.key, s])
  );

  apiSitesFromFile.forEach(([key, site]) => {
    const existingSource = currentApiSites.get(key);
    if (existingSource) {
      // 如果已存在，只覆盖 name、api、detail 和 from
      existingSource.name = site.name;
      existingSource.api = site.api;
      existingSource.detail = site.detail;
      existingSource.from = 'config';
    } else {
      // 如果不存在，创建新条目
      currentApiSites.set(key, {
        key,
        name: site.name,
        api: site.api,
        detail: site.detail,
        from: 'config',
        disabled: false,
      });
    }
  });

  // 检查现有源是否在 fileConfig.api_site 中，
  // 如果不在，标记为 custom 类型
  // 只有配置文件里填写的源才是 config 类型
  const apiSitesFromFileKey = new Set(apiSitesFromFile.map(([key]) => key));
  currentApiSites.forEach((source) => {
    if (!apiSitesFromFileKey.has(source.key)) {
      // 不在配置文件中的源，标记为 custom 类型
      source.from = 'custom';
    } else {
      // 在配置文件中的源，确保标记为 config 类型
      source.from = 'config';
    }
  });

  // 将 Map 转换回数组
  adminConfig.SourceConfig = Array.from(currentApiSites.values());

  // 覆盖 CustomCategories
  const customCategoriesFromFile = fileConfig.custom_category || [];
  const currentCustomCategories = new Map(
    (adminConfig.CustomCategories || []).map((c) => [c.query + c.type, c])
  );

  customCategoriesFromFile.forEach((category) => {
    const key = category.query + category.type;
    const existedCategory = currentCustomCategories.get(key);
    if (existedCategory) {
      existedCategory.name = category.name;
      existedCategory.query = category.query;
      existedCategory.type = category.type;
      existedCategory.from = 'config';
    } else {
      currentCustomCategories.set(key, {
        name: category.name,
        type: category.type,
        query: category.query,
        from: 'config',
        disabled: false,
      });
    }
  });

  // 检查现有 CustomCategories 是否在 fileConfig.custom_category 中，如果不在则标记为 custom
  const customCategoriesFromFileKeys = new Set(
    customCategoriesFromFile.map((c) => c.query + c.type)
  );
  currentCustomCategories.forEach((category) => {
    if (!customCategoriesFromFileKeys.has(category.query + category.type)) {
      category.from = 'custom';
    }
  });

  // 将 Map 转换回数组
  adminConfig.CustomCategories = Array.from(currentCustomCategories.values());

  const livesFromFile = Object.entries(fileConfig.lives || []);
  const currentLives = new Map(
    (adminConfig.LiveConfig || []).map((l) => [l.key, l])
  );
  livesFromFile.forEach(([key, site]) => {
    const existingLive = currentLives.get(key);
    if (existingLive) {
      existingLive.name = site.name;
      existingLive.url = site.url;
      existingLive.ua = site.ua;
      existingLive.epg = site.epg;
    } else {
      // 如果不存在，创建新条目
      currentLives.set(key, {
        key,
        name: site.name,
        url: site.url,
        ua: site.ua,
        epg: site.epg,
        channelNumber: 0,
        from: 'config',
        disabled: false,
      });
    }
  });

  // 检查现有 LiveConfig 是否在 fileConfig.lives 中，如果不在则标记为 custom
  const livesFromFileKeys = new Set(livesFromFile.map(([key]) => key));
  currentLives.forEach((live) => {
    if (!livesFromFileKeys.has(live.key)) {
      live.from = 'custom';
    }
  });

  // 将 Map 转换回数组
  adminConfig.LiveConfig = Array.from(currentLives.values());

  return adminConfig;
}

async function getInitConfig(
  configFile: string,
  subConfig: {
    URL: string;
    AutoUpdate: boolean;
    LastCheck: string;
  } = {
    URL: '',
    AutoUpdate: false,
    LastCheck: '',
  }
): Promise<AdminConfig> {
  let cfgFile: ConfigFileStruct;
  try {
    // 检查configFile是否为空字符串，避免JSON.parse('')抛出错误
    if (!configFile || configFile.trim() === '') {
      cfgFile = ConfigManager.DEFAULT_CONFIG as ConfigFileStruct;
    } else {
      cfgFile = JSON.parse(configFile) as ConfigFileStruct;
      // 如果没有API站点配置，使用默认配置
      if (!cfgFile.api_site || Object.keys(cfgFile.api_site).length === 0) {
        cfgFile.api_site = ConfigManager.DEFAULT_CONFIG.api_site;
      }
    }
  } catch (e) {
    // 解析失败，使用默认配置
    cfgFile = ConfigManager.DEFAULT_CONFIG as ConfigFileStruct;
  }

  // 在初始化之前，先获取旧的配置（目前未使用，保留以备后续扩展）
  // const oldConfig = await db.getAdminConfig();

  const adminConfig: AdminConfig = {
    ConfigFile: configFile,
    ConfigSubscribtion: subConfig,
    SiteConfig: {
      SiteName: process.env.NEXT_PUBLIC_SITE_NAME || 'NewTV',
      Announcement:
        process.env.ANNOUNCEMENT ||
        '本网站仅提供影视信息搜索服务，所有内容均来自第三方网站。本站不存储任何视频资源，不对任何内容的准确性、合法性、完整性负责。',
      SearchDownstreamMaxPage:
        Number(process.env.NEXT_PUBLIC_SEARCH_MAX_PAGE) || 5,
      SiteInterfaceCacheTime: cfgFile.cache_time || 7200,
      DoubanProxyType:
        process.env.NEXT_PUBLIC_DOUBAN_PROXY_TYPE || 'cmliussss-cdn-tencent',
      DoubanProxy: process.env.NEXT_PUBLIC_DOUBAN_PROXY || '',
      DoubanImageProxyType:
        process.env.NEXT_PUBLIC_DOUBAN_IMAGE_PROXY_TYPE ||
        'cmliussss-cdn-tencent',
      DoubanImageProxy: process.env.NEXT_PUBLIC_DOUBAN_IMAGE_PROXY || '',
      DisableYellowFilter:
        process.env.NEXT_PUBLIC_DISABLE_YELLOW_FILTER === 'true',
      FluidSearch: process.env.NEXT_PUBLIC_FLUID_SEARCH !== 'false',
    },
    UserConfig: {
      AllowRegister: true, // 默认允许注册
      RequireApproval: false,
      PendingUsers: [],
      Users: [],
    },
    SourceConfig: [],
    CustomCategories: [],
    LiveConfig: [],
  };

  // 补充用户信息
  let userNames: string[] = [];
  try {
    userNames = await db.getAllUsers();
  } catch (e) {
    logger.error('获取用户列表失败:', e as Error);
  }
  const allUsers = userNames
    .filter((u) => u !== process.env.USERNAME)
    .map((u) => ({
      username: u,
      role: 'user',
      banned: false,
    }));
  allUsers.unshift({
    username: process.env.USERNAME!,
    role: 'owner',
    banned: false,
  });
  adminConfig.UserConfig.Users = allUsers as any;

  // 从配置文件中补充源信息
  Object.entries(cfgFile.api_site || []).forEach(([key, site]) => {
    adminConfig.SourceConfig.push({
      key: key,
      name: site.name,
      api: site.api,
      detail: site.detail,
      from: 'config',
      disabled: false,
    });
  });

  // 添加默认API站点配置，确保在部署环境中也能获取到数据
  if (adminConfig.SourceConfig.length === 0) {
    adminConfig.SourceConfig.push({
      key: 'default',
      name: '默认API',
      api: 'https://api.example.com',
      detail: '默认API站点',
      from: 'config',
      disabled: false,
    });
  }

  // 从配置文件中补充自定义分类信息
  cfgFile.custom_category?.forEach((category) => {
    adminConfig.CustomCategories.push({
      name: category.name || category.query,
      type: category.type,
      query: category.query,
      from: 'config',
      disabled: false,
    });
  });

  // 从配置文件中补充直播源信息
  Object.entries(cfgFile.lives || []).forEach(([key, live]) => {
    if (!adminConfig.LiveConfig) {
      adminConfig.LiveConfig = [];
    }
    adminConfig.LiveConfig.push({
      key,
      name: live.name,
      url: live.url,
      ua: live.ua,
      epg: live.epg,
      channelNumber: 0,
      from: 'config',
      disabled: false,
    });
  });

  return adminConfig;
}

export async function getConfig(): Promise<AdminConfig> {
  // 直接使用内存缓存
  if (cachedConfig) {
    return cachedConfig;
  }

  // 读 db
  let adminConfig: AdminConfig | null = null;
  try {
    adminConfig = await db.getAdminConfig();
  } catch (e) {
    logger.error('获取管理员配置失败:', e as Error);
  }

  // db 中无配置，执行一次初始化
  if (!adminConfig) {
    adminConfig = await getInitConfig('');
    adminConfig = configSelfCheck(adminConfig);
    // 只有在初始化时才保存
    await db.saveAdminConfig(adminConfig);
  } else {
    // 对现有配置进行检查，但不立即保存
    adminConfig = configSelfCheck(adminConfig);
  }

  cachedConfig = adminConfig;
  return cachedConfig;
}



export function configSelfCheck(adminConfig: AdminConfig): AdminConfig {
  // 确保必要的属性存在和初始化
  if (!adminConfig.UserConfig) {
    adminConfig.UserConfig = {
      AllowRegister: true,
      RequireApproval: false,
      PendingUsers: [],
      Users: [],
    } as any;
  }
  if (
    !adminConfig.UserConfig.Users ||
    !Array.isArray(adminConfig.UserConfig.Users)
  ) {
    adminConfig.UserConfig.Users = [];
  }
  // 确保 AllowRegister 有默认值
  if (adminConfig.UserConfig.AllowRegister === undefined) {
    adminConfig.UserConfig.AllowRegister = true;
  }
  // 新增：审核相关默认值
  if ((adminConfig.UserConfig as any).RequireApproval === undefined) {
    (adminConfig.UserConfig as any).RequireApproval = false;
  }
  if (!(adminConfig.UserConfig as any).PendingUsers) {
    (adminConfig.UserConfig as any).PendingUsers = [];
  }
  if (!adminConfig.SourceConfig || !Array.isArray(adminConfig.SourceConfig)) {
    adminConfig.SourceConfig = [];
  }
  if (
    !adminConfig.CustomCategories ||
    !Array.isArray(adminConfig.CustomCategories)
  ) {
    adminConfig.CustomCategories = [];
  }
  if (!adminConfig.LiveConfig || !Array.isArray(adminConfig.LiveConfig)) {
    adminConfig.LiveConfig = [];
  }

  // 站长变更自检
  const ownerUser = process.env.USERNAME;

  // 去重
  const seenUsernames = new Set<string>();
  adminConfig.UserConfig.Users = adminConfig.UserConfig.Users.filter((user) => {
    if (seenUsernames.has(user.username)) {
      return false;
    }
    seenUsernames.add(user.username);
    return true;
  });
  // 过滤站长
  const originOwnerCfg = adminConfig.UserConfig.Users.find(
    (u) => u.username === ownerUser
  );
  adminConfig.UserConfig.Users = adminConfig.UserConfig.Users.filter(
    (user) => user.username !== ownerUser
  );
  // 其他用户不得拥有 owner 权限
  adminConfig.UserConfig.Users.forEach((user) => {
    if (user.role === 'owner') {
      user.role = 'user';
    }
  });
  // 重新添加回站长
  adminConfig.UserConfig.Users.unshift({
    username: ownerUser!,
    role: 'owner',
    banned: false,
    enabledApis: originOwnerCfg?.enabledApis || undefined,
    tags: originOwnerCfg?.tags || undefined,
  });

  // 采集源去重
  const seenSourceKeys = new Set<string>();
  adminConfig.SourceConfig = adminConfig.SourceConfig.filter((source) => {
    if (seenSourceKeys.has(source.key)) {
      return false;
    }
    seenSourceKeys.add(source.key);
    return true;
  });

  // 为所有源添加 from 字段默认值
  // 配置文件里填写的源和导入的源都应该是 config 类型
  // 只有真正手动添加的源才是 custom 类型
  adminConfig.SourceConfig.forEach((source) => {
    if (
      !source.from ||
      (source.from !== 'config' && source.from !== 'custom')
    ) {
      // 默认值为 config，因为只有手动添加的源才是 custom
      source.from = 'config';
    }
  });

  // 自定义分类去重
  const seenCustomCategoryKeys = new Set<string>();
  adminConfig.CustomCategories = adminConfig.CustomCategories.filter(
    (category) => {
      if (seenCustomCategoryKeys.has(category.query + category.type)) {
        return false;
      }
      seenCustomCategoryKeys.add(category.query + category.type);
      return true;
    }
  );

  // 直播源去重
  const seenLiveKeys = new Set<string>();
  adminConfig.LiveConfig = adminConfig.LiveConfig.filter((live) => {
    if (seenLiveKeys.has(live.key)) {
      return false;
    }
    seenLiveKeys.add(live.key);
    return true;
  });

  // 确保至少有一个API站点可用
  if (adminConfig.SourceConfig.length === 0) {
    logger.warn('没有可用的API站点，添加默认API站点');
    adminConfig.SourceConfig.push({
      key: 'default',
      name: '默认API',
      api: 'https://api.example.com',
      detail: '默认API站点',
      from: 'config',
      disabled: false,
    });
  }

  return adminConfig;
}

export async function resetConfig() {
  let originConfig: AdminConfig | null = null;
  try {
    originConfig = await db.getAdminConfig();
  } catch (e) {
    logger.error('获取管理员配置失败:', e as Error);
  }
  if (!originConfig) {
    originConfig = {} as AdminConfig;
  }
  const adminConfig = await getInitConfig(
    originConfig.ConfigFile,
    originConfig.ConfigSubscribtion
  );
  cachedConfig = adminConfig;
  await db.saveAdminConfig(adminConfig);

  return;
}

export async function getCacheTime(): Promise<number> {
  const config = await getConfig();
  return config.SiteConfig.SiteInterfaceCacheTime || 7200;
}

// API源健康状态缓存
const apiHealthCache = new Map<
  string,
  {
    isHealthy: boolean;
    lastChecked: number;
    responseTime: number;
  }
>();

// 健康检查间隔：5分钟
const HEALTH_CHECK_INTERVAL = 5 * 60 * 1000;

// 健康检查超时时间：3秒
const HEALTH_CHECK_TIMEOUT = 3000;

/**
 * 检查单个API源的健康状态
 */
async function checkApiHealth(site: any): Promise<boolean> {
  try {
    const startTime = Date.now();

    // 发送一个简单的请求来检查API是否可用
    const response = await Promise.race([
      fetch(`${site.api}/api/search?q=test`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }),
      new Promise<Response>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), HEALTH_CHECK_TIMEOUT)
      ),
    ]);

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // 更新健康状态缓存
    apiHealthCache.set(site.key, {
      isHealthy: response.ok,
      lastChecked: endTime,
      responseTime,
    });

    return response.ok;
  } catch (error) {
    // 更新健康状态缓存为不健康
    apiHealthCache.set(site.key, {
      isHealthy: false,
      lastChecked: Date.now(),
      responseTime: HEALTH_CHECK_TIMEOUT,
    });

    return false;
  }
}

/**
 * 定期检查所有API源的健康状态
 */
async function periodicHealthCheck() {
  const config = await getConfig();
  const allApiSites = config.SourceConfig.filter((s: any) => !s.disabled);

  // 并行检查所有API源的健康状态
  const healthCheckPromises = allApiSites.map(checkApiHealth);
  await Promise.allSettled(healthCheckPromises);
}

// 启动定期健康检查
setInterval(periodicHealthCheck, HEALTH_CHECK_INTERVAL);

// 初始检查
periodicHealthCheck().catch(console.error);

/**
 * 获取API源的健康状态
 */
function getApiHealth(key: string): {
  isHealthy: boolean;
  lastChecked: number;
  responseTime: number;
} {
  const health = apiHealthCache.get(key);
  if (health) {
    // 如果上次检查时间超过10分钟，认为状态过期
    if (Date.now() - health.lastChecked > 10 * 60 * 1000) {
      return {
        isHealthy: true, // 过期状态默认视为健康
        lastChecked: Date.now(),
        responseTime: 0,
      };
    }
    return health;
  }

  // 未检查过的源默认视为健康
  return {
    isHealthy: true,
    lastChecked: Date.now(),
    responseTime: 0,
  };
}

export async function getAvailableApiSites(user?: string): Promise<any[]> {
  const config = await getConfig();
  const allApiSites = config.SourceConfig.filter((s: any) => !s.disabled);

  if (!user) {
    return allApiSites;
  }

  const userConfig = config.UserConfig.Users.find(
    (u: any) => u.username === user
  );
  if (!userConfig) {
    return allApiSites;
  }

  // 优先根据用户自己的 enabledApis 配置查找
  let filteredSites = allApiSites;
  if (userConfig.enabledApis && userConfig.enabledApis.length > 0) {
    const userApiSitesSet = new Set(userConfig.enabledApis);
    filteredSites = allApiSites.filter((s: any) => userApiSitesSet.has(s.key));
  } else if (
    userConfig.tags &&
    userConfig.tags.length > 0 &&
    config.UserConfig.Tags
  ) {
    // 如果没有 enabledApis 配置，则根据 tags 查找
    const enabledApisFromTags = new Set<string>();

    // 遍历用户的所有 tags，收集对应的 enabledApis
    userConfig.tags.forEach((tagName: string) => {
      const tagConfig = config.UserConfig.Tags?.find(
        (t: any) => t.name === tagName
      );
      if (tagConfig && tagConfig.enabledApis) {
        tagConfig.enabledApis.forEach((apiKey: string) =>
          enabledApisFromTags.add(apiKey)
        );
      }
    });

    if (enabledApisFromTags.size > 0) {
      filteredSites = allApiSites.filter((s: any) =>
        enabledApisFromTags.has(s.key)
      );
    }
  }

  // 添加上下文信息，包括健康状态和优先级
  const sitesWithHealth = filteredSites.map((site: any) => {
    const health = getApiHealth(site.key);
    return {
      ...site,
      // 健康状态
      health: health.isHealthy,
      lastChecked: health.lastChecked,
      responseTime: health.responseTime,
      // 默认优先级为5，范围1-10，数值越大优先级越高
      priority: site.priority || 5,
    };
  });

  // 根据健康状态、优先级和响应时间排序
  const sortedSites = sitesWithHealth.sort((a: any, b: any) => {
    // 1. 健康状态优先：健康的源排在前面
    if (a.health !== b.health) {
      return a.health ? -1 : 1;
    }

    // 2. 然后按优先级排序：优先级高的排在前面
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }

    // 3. 最后按响应时间排序：响应时间短的排在前面
    return a.responseTime - b.responseTime;
  });

  // 返回排序后的API源
  return sortedSites;
}

export async function setCachedConfig(config: AdminConfig) {
  cachedConfig = config;
  // 更新配置版本
  configVersion++;
}

// 获取当前配置版本
export function getConfigVersion(): number {
  return configVersion;
}

// 清除配置缓存并更新版本
export function clearConfigCache(): void {
  cachedConfig = null as any;
  // 更新配置版本
  configVersion++;
}
