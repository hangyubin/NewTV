/* eslint-disable @typescript-eslint/no-explicit-any,no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

// 支持的操作类型
type Action = 'add' | 'disable' | 'enable' | 'delete' | 'sort' | 'batch_disable' | 'batch_enable' | 'batch_delete' | 'batch' | 'import' | 'validate_and_fix' | 'export';

interface BaseBody {
  action?: Action;
}

// 视频源接口定义
interface VideoSource {
  key: string;
  name: string;
  api: string;
  detail?: string;
  disabled?: boolean;
  from?: 'config' | 'custom';
  category?: string;
  originalKey?: string; // 原始key，用于转换后的追踪
}

// 旧格式配置接口
interface LegacySourceConfig {
  cache_time?: number;
  api_site: Record<string, {
    api: string;
    name: string;
    detail?: string;
  }>;
}

// 生成安全的key
function generateSafeKey(originalKey: string): string {
  // 移除特殊字符，只保留字母数字和连字符
  return originalKey
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

// 检测源分类
function detectSourceCategory(name: string): string {
  if (!name) return 'other';
  
  const lowerName = name.toLowerCase();
  if (lowerName.includes('tv-') || name.includes('🎬')) return 'tv';
  if (lowerName.includes('av-') || name.includes('🔞')) return 'adult';
  if (lowerName.includes('动漫') || lowerName.includes('anime')) return 'anime';
  if (lowerName.includes('短剧') || lowerName.includes('short')) return 'short_drama';
  return 'other';
}

// 验证URL格式
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// 转换旧格式数据为新格式
function convertLegacyToNewFormat(data: LegacySourceConfig): VideoSource[] {
  const sources: VideoSource[] = [];
  
  if (!data.api_site) return sources;
  
  Object.entries(data.api_site).forEach(([originalKey, source]) => {
    if (!source.api || !source.name) return;
    
    sources.push({
      key: generateSafeKey(originalKey),
      name: source.name,
      api: source.api,
      detail: source.detail || '',
      from: 'custom',
      disabled: false,
      category: detectSourceCategory(source.name),
      originalKey,
    });
  });
  
  return sources;
}

// 解析不同格式的数据
function parseSourceData(data: any): { sources: VideoSource[], format: 'array' | 'legacy' | 'unknown', error?: string } {
  // 如果是数组格式（新格式）
  if (Array.isArray(data)) {
    const sources: VideoSource[] = data
      .filter((item: any) => item.key && item.name && item.api)
      .map((item: any) => ({
        key: item.key,
        name: item.name,
        api: item.api,
        detail: item.detail || '',
        from: item.from || 'custom',
        disabled: item.disabled || false,
        category: item.category || detectSourceCategory(item.name),
      }));
    
    return {
      sources,
      format: 'array',
    };
  }
  
  // 如果是旧格式（嵌套对象）
  if (data.api_site && typeof data.api_site === 'object') {
    const sources = convertLegacyToNewFormat(data);
    return {
      sources,
      format: 'legacy',
    };
  }
  
  // 如果数据本身就是一个视频源对象
  if (data.key && data.name && data.api) {
    return {
      sources: [{
        key: data.key,
        name: data.name,
        api: data.api,
        detail: data.detail || '',
        from: data.from || 'custom',
        disabled: data.disabled || false,
        category: data.category || detectSourceCategory(data.name),
      }],
      format: 'array',
    };
  }
  
  return {
    sources: [],
    format: 'unknown',
    error: '不支持的数据格式'
  };
}

export async function POST(request: NextRequest) {
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
  if (storageType === 'localstorage') {
    return NextResponse.json(
      {
        error: '不支持本地存储进行管理员配置',
      },
      { status: 400 }
    );
  }

  try {
    const body = (await request.json()) as BaseBody & Record<string, any>;
    const { action } = body;

    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const username = authInfo.username;

    // 基础校验
    const ACTIONS: Action[] = ['add', 'disable', 'enable', 'delete', 'sort', 'batch_disable', 'batch_enable', 'batch_delete', 'batch', 'import', 'validate_and_fix', 'export'];
    if (!username || !action || !ACTIONS.includes(action)) {
      return NextResponse.json({ error: '参数格式错误' }, { status: 400 });
    }

    // 获取配置与存储
    const adminConfig = await getConfig();

    // 权限与身份校验
    if (username !== process.env.USERNAME) {
      const userEntry = adminConfig.UserConfig.Users.find(
        (u) => u.username === username
      );
      if (!userEntry || userEntry.role !== 'admin' || userEntry.banned) {
        return NextResponse.json({ error: '权限不足' }, { status: 401 });
      }
    }

    switch (action) {
      case 'batch': {
        // 支持两种格式的批量导入
        const { sources, data, format, overwrite = false, merge = false } = body as {
          sources?: any[];
          data?: any;
          format?: 'array' | 'legacy';
          overwrite?: boolean;
          merge?: boolean;
        };
        
        let parsedSources: VideoSource[] = [];
        let parsedFormat = format;
        
        // 优先使用解析后的sources
        if (sources && Array.isArray(sources)) {
          parsedSources = sources
            .filter(item => item.key && item.name && item.api)
            .map(item => ({
              key: item.key,
              name: item.name,
              api: item.api,
              detail: item.detail || '',
              from: item.from || 'custom',
              disabled: item.disabled || false,
              category: item.category || detectSourceCategory(item.name),
            }));
          parsedFormat = 'array';
        } 
        // 否则尝试解析data
        else if (data) {
          const result = parseSourceData(data);
          if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 400 });
          }
          parsedSources = result.sources;
          parsedFormat = result.format as 'array' | 'legacy';
        } else {
          return NextResponse.json({ error: '缺少 sources 或 data 参数' }, { status: 400 });
        }
        
        if (parsedSources.length === 0) {
          return NextResponse.json({ error: '未找到有效的视频源数据' }, { status: 400 });
        }
        
        // 验证所有源的URL格式
        const invalidSources = parsedSources.filter(source => !isValidUrl(source.api));
        if (invalidSources.length > 0) {
          return NextResponse.json({
            error: '部分源的API URL格式无效',
            invalidSources: invalidSources.map(s => ({ key: s.key, name: s.name, api: s.api })),
          }, { status: 400 });
        }
        
        // 检查重复key（在待导入的数据中）
        const importKeyCounts: Record<string, number> = {};
        parsedSources.forEach(source => {
          importKeyCounts[source.key] = (importKeyCounts[source.key] || 0) + 1;
        });
        
        const duplicateKeys = Object.entries(importKeyCounts)
          .filter(([_, count]) => count > 1)
          .map(([key]) => key);
          
        if (duplicateKeys.length > 0) {
          return NextResponse.json({
            error: '导入数据中存在重复的key',
            duplicateKeys,
          }, { status: 400 });
        }
        
        // 执行导入操作
        const results = {
          imported: 0,
          updated: 0,
          skipped: 0,
          failed: 0,
          errors: [] as Array<{ key: string; error: string }>,
        };
        
        const existingKeys = new Set(adminConfig.SourceConfig.map(s => s.key));
        const existingSources = new Map(adminConfig.SourceConfig.map(s => [s.key, s]));
        
        parsedSources.forEach(source => {
          try {
            const existing = existingSources.get(source.key);
            
            if (existing) {
              // 源已存在
              if (overwrite) {
                // 覆盖现有源
                Object.assign(existing, source);
                existing.from = 'custom';
                results.updated++;
              } else if (merge) {
                // 合并更新，但不覆盖from为'config'的源
                if (existing.from !== 'config') {
                  Object.assign(existing, source);
                  results.updated++;
                } else {
                  results.skipped++;
                }
              } else {
                results.skipped++;
              }
            } else {
              // 新源
              adminConfig.SourceConfig.push({
                ...source,
                from: source.from || 'custom',
                disabled: source.disabled || false,
              });
              results.imported++;
            }
          } catch (error) {
            results.failed++;
            results.errors.push({
              key: source.key,
              error: error instanceof Error ? error.message : '未知错误',
            });
          }
        });
        
        await db.saveAdminConfig(adminConfig);
        
        return NextResponse.json({
          ok: true,
          summary: {
            format: parsedFormat,
            total: parsedSources.length,
            ...results,
          },
          errors: results.errors,
        });
      }
      
      case 'import': {
        // 专门用于导入的操作，提供更多选项
        const { data, type = 'auto', strategy = 'skip', validate = true } = body as {
          data: any;
          type?: 'auto' | 'array' | 'legacy';
          strategy?: 'skip' | 'overwrite' | 'merge';
          validate?: boolean;
        };
        
        if (!data) {
          return NextResponse.json({ error: '缺少 data 参数' }, { status: 400 });
        }
        
        // 解析数据
        let parsedResult;
        if (type === 'array') {
          parsedResult = parseSourceData(Array.isArray(data) ? data : [data]);
        } else if (type === 'legacy') {
          parsedResult = parseSourceData({ api_site: data.api_site || data });
        } else {
          parsedResult = parseSourceData(data);
        }
        
        if (parsedResult.error) {
          return NextResponse.json({ error: parsedResult.error }, { status: 400 });
        }
        
        const { sources, format } = parsedResult;
        
        if (sources.length === 0) {
          return NextResponse.json({ error: '未找到有效的视频源数据' }, { status: 400 });
        }
        
        // 验证数据
        if (validate) {
          const validationResults = {
            invalidUrls: [] as Array<{ key: string; api: string }>,
            missingFields: [] as Array<{ key: string; missing: string[] }>,
          };
          
          sources.forEach(source => {
            const missingFields = [];
            if (!source.key) missingFields.push('key');
            if (!source.name) missingFields.push('name');
            if (!source.api) missingFields.push('api');
            
            if (missingFields.length > 0) {
              validationResults.missingFields.push({
                key: source.key || 'unknown',
                missing: missingFields,
              });
            }
            
            if (source.api && !isValidUrl(source.api)) {
              validationResults.invalidUrls.push({
                key: source.key,
                api: source.api,
              });
            }
          });
          
          if (validationResults.invalidUrls.length > 0 || validationResults.missingFields.length > 0) {
            return NextResponse.json({
              error: '数据验证失败',
              validationResults,
            }, { status: 400 });
          }
        }
        
        // 执行导入
        const importStats = {
          imported: 0,
          updated: 0,
          skipped: 0,
          duplicates: 0,
        };
        
        const existingSources = new Map(adminConfig.SourceConfig.map(s => [s.key, s]));
        
        sources.forEach(source => {
          const existing = existingSources.get(source.key);
          
          if (existing) {
            // 已存在的处理逻辑
            if (strategy === 'overwrite') {
              // 覆盖现有源
              Object.assign(existing, source);
              existing.from = 'custom';
              importStats.updated++;
            } else if (strategy === 'merge') {
              // 合并，但不覆盖from为'config'的源
              if (existing.from !== 'config') {
                Object.assign(existing, source);
                importStats.updated++;
              } else {
                importStats.skipped++;
              }
            } else {
              // skip策略
              importStats.skipped++;
            }
          } else {
            // 新源
            adminConfig.SourceConfig.push({
              ...source,
              from: 'custom',
              disabled: source.disabled || false,
            });
            importStats.imported++;
          }
        });
        
        await db.saveAdminConfig(adminConfig);
        
        return NextResponse.json({
          ok: true,
          import: {
            format,
            total: sources.length,
            ...importStats,
          },
        });
      }

      case 'add': {
        const { key, name, api, detail, category } = body as {
          key?: string;
          name?: string;
          api?: string;
          detail?: string;
          category?: string;
        };
        if (!key || !name || !api) {
          return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
        }
        if (adminConfig.SourceConfig.some((s) => s.key === key)) {
          return NextResponse.json({ error: '该源已存在' }, { status: 400 });
        }
        if (!isValidUrl(api)) {
          return NextResponse.json({ error: 'API URL格式无效' }, { status: 400 });
        }
        adminConfig.SourceConfig.push({
          key,
          name,
          api,
          detail: detail || '',
          from: 'custom',
          disabled: false,
          category: category || detectSourceCategory(name),
        });
        break;
      }

      case 'disable': {
        const { key } = body as { key?: string };
        if (!key)
          return NextResponse.json({ error: '缺少 key 参数' }, { status: 400 });
        const entry = adminConfig.SourceConfig.find((s) => s.key === key);
        if (!entry)
          return NextResponse.json({ error: '源不存在' }, { status: 404 });
        entry.disabled = true;
        break;
      }

      case 'enable': {
        const { key } = body as { key?: string };
        if (!key)
          return NextResponse.json({ error: '缺少 key 参数' }, { status: 400 });
        const entry = adminConfig.SourceConfig.find((s) => s.key === key);
        if (!entry)
          return NextResponse.json({ error: '源不存在' }, { status: 404 });
        entry.disabled = false;
        break;
      }

      case 'delete': {
        const { key } = body as { key?: string };
        if (!key)
          return NextResponse.json({ error: '缺少 key 参数' }, { status: 400 });
        const idx = adminConfig.SourceConfig.findIndex((s) => s.key === key);
        if (idx === -1)
          return NextResponse.json({ error: '源不存在' }, { status: 404 });
        const entry = adminConfig.SourceConfig[idx];
        if (entry.from === 'config') {
          return NextResponse.json({ error: '该源不可删除' }, { status: 400 });
        }
        adminConfig.SourceConfig.splice(idx, 1);

        // 检查并清理用户组和用户的权限数组
        // 清理用户组权限
        if (adminConfig.UserConfig.Tags) {
          adminConfig.UserConfig.Tags.forEach(tag => {
            if (tag.enabledApis) {
              tag.enabledApis = tag.enabledApis.filter(api => api !== key);
            }
          });
        }

        // 清理用户权限
        adminConfig.UserConfig.Users.forEach(user => {
          if (user.enabledApis) {
            user.enabledApis = user.enabledApis.filter(api => api !== key);
          }
        });
        break;
      }

      case 'batch_disable': {
        const { keys } = body as { keys?: string[] };
        if (!Array.isArray(keys) || keys.length === 0) {
          return NextResponse.json({ error: '缺少 keys 参数或为空' }, { status: 400 });
        }
        keys.forEach(key => {
          const entry = adminConfig.SourceConfig.find((s) => s.key === key);
          if (entry) {
            entry.disabled = true;
          }
        });
        break;
      }

      case 'batch_enable': {
        const { keys } = body as { keys?: string[] };
        if (!Array.isArray(keys) || keys.length === 0) {
          return NextResponse.json({ error: '缺少 keys 参数或为空' }, { status: 400 });
        }
        keys.forEach(key => {
          const entry = adminConfig.SourceConfig.find((s) => s.key === key);
          if (entry) {
            entry.disabled = false;
          }
        });
        break;
      }

      case 'batch_delete': {
        const { keys } = body as { keys?: string[] };
        if (!Array.isArray(keys) || keys.length === 0) {
          return NextResponse.json({ error: '缺少 keys 参数或为空' }, { status: 400 });
        }
        // 过滤掉 from=config 的源，但不报错
        const keysToDelete = keys.filter(key => {
          const entry = adminConfig.SourceConfig.find((s) => s.key === key);
          return entry && entry.from !== 'config';
        });

        // 批量删除
        keysToDelete.forEach(key => {
          const idx = adminConfig.SourceConfig.findIndex((s) => s.key === key);
          if (idx !== -1) {
            adminConfig.SourceConfig.splice(idx, 1);
          }
        });

        // 检查并清理用户组和用户的权限数组
        if (keysToDelete.length > 0) {
          // 清理用户组权限
          if (adminConfig.UserConfig.Tags) {
            adminConfig.UserConfig.Tags.forEach(tag => {
              if (tag.enabledApis) {
                tag.enabledApis = tag.enabledApis.filter(api => !keysToDelete.includes(api));
              }
            });
          }

          // 清理用户权限
          adminConfig.UserConfig.Users.forEach(user => {
            if (user.enabledApis) {
              user.enabledApis = user.enabledApis.filter(api => !keysToDelete.includes(api));
            }
          });
        }
        break;
      }

      case 'sort': {
        const { order } = body as { order?: string[] };
        if (!Array.isArray(order)) {
          return NextResponse.json(
            { error: '排序列表格式错误' },
            { status: 400 }
          );
        }
        const map = new Map(adminConfig.SourceConfig.map((s) => [s.key, s]));
        const newList: typeof adminConfig.SourceConfig = [];
        order.forEach((k) => {
          const item = map.get(k);
          if (item) {
            newList.push(item);
            map.delete(k);
          }
        });
        // 未在 order 中的保持原顺序
        adminConfig.SourceConfig.forEach((item) => {
          if (map.has(item.key)) newList.push(item);
        });
        adminConfig.SourceConfig = newList;
        break;
      }

      case 'validate_and_fix': {
        const issues: Array<{
          key: string;
          name: string;
          issue: string;
          fix?: string;
        }> = [];

        // 检查重复key
        const keyCounts: Record<string, number> = {};
        adminConfig.SourceConfig.forEach(source => {
          keyCounts[source.key] = (keyCounts[source.key] || 0) + 1;
        });

        // 检查无效的URL
        adminConfig.SourceConfig.forEach(source => {
          const problems: string[] = [];

          // 检查重复
          if (keyCounts[source.key] > 1) {
            problems.push(`key重复 (${keyCounts[source.key]}次)`);
          }

          // 检查URL格式
          try {
            new URL(source.api);
          } catch {
            problems.push('API URL格式无效');
          }

          // 检查分类
          if (!source.category) {
            problems.push('未设置分类');
          }

          if (problems.length > 0) {
            issues.push({
              key: source.key,
              name: source.name,
              issue: problems.join(', '),
              fix: source.category ? undefined : '自动分类',
            });
          }
        });

        // 自动修复可以修复的问题
        let fixedCount = 0;
        issues.forEach(issue => {
          if (issue.fix === '自动分类') {
            const source = adminConfig.SourceConfig.find(s => s.key === issue.key);
            if (source) {
              source.category = detectSourceCategory(source.name);
              fixedCount++;
            }
          }
        });

        if (fixedCount > 0) {
          await db.saveAdminConfig(adminConfig);
        }

        return NextResponse.json({
          ok: true,
          issues,
          fixed: fixedCount,
          needManualFix: issues.length - fixedCount,
        });
      }

      case 'export': {
        const { 
          format = 'new',  // 'new' 或 'legacy'
          includeDisabled = false,
          category 
        } = body as {
          format?: 'new' | 'legacy';
          includeDisabled?: boolean;
          category?: string;
        };

        let sourcesToExport = adminConfig.SourceConfig;

        // 应用过滤器
        if (!includeDisabled) {
          sourcesToExport = sourcesToExport.filter(s => !s.disabled);
        }

        if (category) {
          sourcesToExport = sourcesToExport.filter(s => s.category === category);
        }

        let exportData: any;
        
        if (format === 'legacy') {
          // 导出为旧格式
          const api_site: Record<string, any> = {};
          sourcesToExport.forEach(source => {
            const legacyKey = source.originalKey || source.key;
            api_site[legacyKey] = {
              api: source.api,
              name: source.name,
              detail: source.detail || '',
            };
          });

          exportData = {
            cache_time: 7200,
            api_site,
          };
        } else {
          // 导出为新格式
          exportData = sourcesToExport.map(source => ({
            key: source.key,
            name: source.name,
            api: source.api,
            detail: source.detail,
            disabled: source.disabled,
            category: source.category,
            from: source.from,
          }));
        }

        return new NextResponse(JSON.stringify(exportData, null, 2), {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="video-sources-${new Date().toISOString().split('T')[0]}.json"`,
          },
        });
      }

      default:
        return NextResponse.json({ error: '未知操作' }, { status: 400 });
    }

    // 持久化到存储
    await db.saveAdminConfig(adminConfig);

    return NextResponse.json(
      { ok: true },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('视频源管理操作失败:', error);
    return NextResponse.json(
      {
        error: '视频源管理操作失败',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

// 导入数组格式数据
const importArrayFormat = async () => {
  const response = await fetch('/api/admin/sources', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'batch',
      sources: [
        {
          key: 'iqiyizyapi.com',
          name: '🎬-爱奇艺-',
          api: 'https://iqiyizyapi.com/api.php/provide/vod',
          detail: 'https://iqiyizyapi.com',
          disabled: false,
        }
      ],
      overwrite: false,
      merge: true,
    }),
  });
  return await response.json();
};

// 导入旧格式数据
const importLegacyFormat = async () => {
  const legacyData = {
    cache_time: 7200,
    api_site: {
      aqyzy: {
        api: 'https://iqiyizyapi.com/api.php/provide/vod',
        name: 'TV-爱奇艺',
        detail: 'https://iqiyizyapi.com'
      }
    }
  };
  
  const response = await fetch('/api/admin/sources', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'import',
      data: legacyData,
      type: 'legacy',
      strategy: 'skip',
      validate: true,
    }),
  });
  return await response.json();
};
