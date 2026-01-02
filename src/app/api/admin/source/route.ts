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
  originalKey?: string; // 原始key，用于转换后的追踪
}

// 为了导出操作，创建一个包含 originalKey 的类型
interface VideoSourceForExport extends VideoSource {
  originalKey?: string;
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

// 验证URL格式
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    // 对于可能不完整的URL（如相对路径），进行更宽松的检查
    if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
      return true;
    }
    // 检查是否是有效的网络路径
    if (/^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(url)) {
      return true;
    }
    return false;
  }
}

// 转换旧格式数据为新格式
function convertLegacyToNewFormat(data: any): VideoSource[] {
  const sources: VideoSource[] = [];
  
  if (!data || typeof data !== 'object' || !data.api_site) return sources;
  
  Object.entries(data.api_site).forEach(([originalKey, source]: [string, any]) => {
    if (!source || typeof source !== 'object') return;
    
    const apiValue = source.api || source.url || source.link || '';
    const nameValue = source.name || source.title || originalKey;
    
    if (!apiValue || !nameValue) return;
    
    sources.push({
      key: generateSafeKey(originalKey),
      name: nameValue,
      api: apiValue,
      detail: source.detail || source.desc || '',
      from: 'custom',
      disabled: false,
      originalKey,
    });
  });
  
  return sources;
}

// 解析不同格式的数据 - 改进版，更灵活的格式检测
function parseSourceData(data: any): { sources: VideoSource[], format: 'array' | 'legacy' | 'single' | 'unknown', error?: string } {
  // 如果数据是 null 或 undefined
  if (data == null) {
    return {
      sources: [],
      format: 'unknown',
      error: '数据为空'
    };
  }

  // 尝试多种格式解析
  const sources: VideoSource[] = [];
  
  // 1. 如果已经是 VideoSource 数组
  if (Array.isArray(data)) {
    for (const item of data) {
      if (item && typeof item === 'object') {
        // 检查是否是有效的视频源对象
        if (item.key && item.name && item.api) {
          sources.push({
            key: item.key,
            name: item.name,
            api: item.api,
            detail: item.detail || '',
            from: item.from || 'custom',
            disabled: item.disabled || false,
            originalKey: item.originalKey || item.key,
          });
        }
        // 检查是否是旧格式包装的数组
        else if (item.api_site) {
          const legacySources = convertLegacyToNewFormat(item);
          sources.push(...legacySources);
        }
        // 尝试从其他字段解析
        else if (item.name && item.api) {
          // 如果没有key，从name生成
          const key = generateSafeKey(item.key || item.name);
          sources.push({
            key,
            name: item.name,
            api: item.api,
            detail: item.detail || '',
            from: 'custom',
            disabled: false,
            originalKey: item.name,
          });
        }
      }
    }
    
    if (sources.length > 0) {
      return {
        sources,
        format: 'array',
      };
    }
  }
  
  // 2. 如果是旧格式对象（包含 api_site）
  if (data && typeof data === 'object') {
    // 检查是否包含 api_site
    if (data.api_site && typeof data.api_site === 'object') {
      const legacySources = convertLegacyToNewFormat(data);
      if (legacySources.length > 0) {
        return {
          sources: legacySources,
          format: 'legacy',
        };
      }
    }
    
    // 3. 检查是否可能是包装的数组格式
    const possibleArrayFields = ['sources', 'data', 'items', 'list', 'sites', 'videoSources', 'video_sources'];
    for (const field of possibleArrayFields) {
      if (Array.isArray(data[field])) {
        const arrayData = data[field];
        const validSources: VideoSource[] = [];
        
        for (const item of arrayData) {
          if (item && typeof item === 'object') {
            if (item.key && item.name && item.api) {
              validSources.push({
                key: item.key,
                name: item.name,
                api: item.api,
                detail: item.detail || '',
                from: item.from || 'custom',
                disabled: item.disabled || false,
                originalKey: item.originalKey || item.key,
              });
            } else if (item.name && item.api) {
              // 如果没有key，从name生成
              const key = generateSafeKey(item.key || item.name);
              validSources.push({
                key,
                name: item.name,
                api: item.api,
                detail: item.detail || '',
                from: 'custom',
                disabled: false,
                originalKey: item.name,
              });
            }
          }
        }
        
        if (validSources.length > 0) {
          return {
            sources: validSources,
            format: 'array',
          };
        }
      }
    }
    
    // 4. 检查是否可能是单个视频源对象
    if (data.key && data.name && data.api) {
      return {
        sources: [{
          key: data.key,
          name: data.name,
          api: data.api,
          detail: data.detail || '',
          from: data.from || 'custom',
          disabled: data.disabled || false,
          originalKey: data.originalKey || data.key,
        }],
        format: 'single',
      };
    }
    
    // 5. 检查是否有 name 和 api 但没有 key
    if (data.name && data.api) {
      const key = generateSafeKey(data.key || data.name);
      return {
        sources: [{
          key,
          name: data.name,
          api: data.api,
          detail: data.detail || '',
          from: 'custom',
          disabled: false,
          originalKey: data.name,
        }],
        format: 'single',
      };
    }
  }
  
  return {
    sources: [],
    format: 'unknown',
    error: `不支持的数据格式。支持格式：
1. 数组格式: [{key: "...", name: "...", api: "..."}, ...]
2. 旧格式: {api_site: {"site1": {api: "...", name: "...", detail: "..."}, ...}}
3. 单个对象: {key: "...", name: "...", api: "..."}
4. 包装格式: {sources: [...]} 或 {data: [...]}`
  };
}

// 清理和标准化 key
function sanitizeKey(key: string): string {
  if (!key) return '';
  return key
    .trim()
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

// 验证视频源对象
function validateVideoSource(source: any): { valid: boolean; errors?: string[]; normalizedSource?: VideoSource } {
  const errors: string[] = [];
  
  // 必须有 name 和 api，key可以自动生成
  if (!source.name && !source.api) {
    errors.push('缺少必要的字段: name, api');
    return { valid: false, errors };
  }
  
  const key = sanitizeKey(source.key || source.name || '');
  const name = (source.name || '').trim();
  const api = (source.api || '').trim();
  
  if (!name) errors.push('name 不能为空');
  if (!api) errors.push('api 不能为空');
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  if (!key) {
    errors.push('无法生成有效的 key');
    return { valid: false, errors };
  }
  
  // 验证 key 格式
  if (!/^[a-zA-Z0-9-_]+$/.test(key)) {
    errors.push('key只能包含字母、数字、连字符(-)和下划线(_)');
  }
  
  // 验证 URL（放宽要求）
  if (api && !isValidUrl(api)) {
    errors.push('API URL格式可能无效');
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  return {
    valid: true,
    normalizedSource: {
      key,
      name,
      api,
      detail: (source.detail || '').trim(),
      from: source.from || 'custom',
      disabled: !!source.disabled,
      originalKey: source.originalKey || source.key || source.name,
    }
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
      case 'import': {
        // 专门用于导入的操作，支持多种格式
        const { data, type = 'auto', strategy = 'skip', validate = true } = body as {
          data?: any;
          type?: 'auto' | 'array' | 'legacy' | 'single';
          strategy?: 'skip' | 'overwrite' | 'merge';
          validate?: boolean;
        };
        
        // 支持多种方式提供数据
        let importData = data;
        if (!importData) {
          // 如果没有 data 参数，尝试从其他常见字段获取
          const possibleFields = ['sources', 'items', 'list', 'sites', 'api_site'];
          for (const field of possibleFields) {
            if (body[field] !== undefined) {
              importData = body[field];
              break;
            }
          }
        }
        
        if (!importData) {
          return NextResponse.json({ 
            error: '缺少数据参数',
            hint: '请提供以下格式之一的参数：data, sources, items, list, sites 或 api_site'
          }, { status: 400 });
        }
        
        // 根据指定的类型或自动检测类型来解析数据
        let parsedResult;
        if (type === 'array') {
          // 如果是数组类型，确保是数组格式
          if (Array.isArray(importData)) {
            parsedResult = parseSourceData(importData);
          } else {
            // 如果不是数组，尝试包装成数组
            parsedResult = parseSourceData([importData]);
          }
        } else if (type === 'legacy') {
          // 如果是旧格式，包装成旧格式结构
          const legacyData = importData.api_site ? importData : { api_site: importData };
          parsedResult = parseSourceData(legacyData);
        } else if (type === 'single') {
          // 单个对象格式
          parsedResult = parseSourceData(importData);
        } else {
          // auto: 让 parseSourceData 自动检测格式
          parsedResult = parseSourceData(importData);
        }
        
        if (parsedResult.error) {
          return NextResponse.json({ 
            error: '数据解析失败',
            details: parsedResult.error,
            receivedFormat: parsedResult.format
          }, { status: 400 });
        }
        
        const { sources, format } = parsedResult;
        
        if (sources.length === 0) {
          return NextResponse.json({ 
            error: '未找到有效的视频源数据',
            hint: '请确保数据包含有效的视频源（至少包含 name 和 api 字段）',
            detectedFormat: format
          }, { status: 400 });
        }
        
        // 验证数据
        if (validate) {
          const validationResults = {
            invalidUrls: [] as Array<{ key: string; api: string; reason: string }>,
            missingFields: [] as Array<{ key: string; missing: string[] }>,
            invalidKeys: [] as Array<{ key: string; reason: string }>,
            warnings: [] as Array<{ key: string; warning: string }>,
          };
          
          const validSources: VideoSource[] = [];
          
          sources.forEach(source => {
            const validation = validateVideoSource(source);
            
            if (!validation.valid) {
              // 记录错误
              if (validation.errors) {
                const errorKey = source.key || source.name || 'unknown';
                validation.errors.forEach(error => {
                  if (error.includes('key')) {
                    validationResults.invalidKeys.push({
                      key: errorKey,
                      reason: error,
                    });
                  } else if (error.includes('URL')) {
                    validationResults.invalidUrls.push({
                      key: errorKey,
                      api: source.api || '',
                      reason: error,
                    });
                  } else {
                    validationResults.missingFields.push({
                      key: errorKey,
                      missing: error.includes('不能为空') ? [error.split(' ')[0]] : ['未知字段'],
                    });
                  }
                });
              }
              return;
            }
            
            if (validation.normalizedSource) {
              validSources.push(validation.normalizedSource);
              
              // 检查是否自动生成了key
              if (source.key !== validation.normalizedSource.key) {
                validationResults.warnings.push({
                  key: validation.normalizedSource.key,
                  warning: `自动生成 key: ${validation.normalizedSource.key} (原始: ${source.key || '无'})`
                });
              }
            }
          });
          
          const hasCriticalErrors = validationResults.invalidUrls.length > 0 || 
                                   validationResults.missingFields.length > 0 || 
                                   validationResults.invalidKeys.length > 0;
          
          if (hasCriticalErrors && validSources.length === 0) {
            return NextResponse.json({
              error: '数据验证失败',
              validationResults,
              totalSources: sources.length,
              validSources: 0,
              warnings: validationResults.warnings,
            }, { status: 400 });
          }
          
          // 如果有有效的源，继续处理，只是记录警告
          if (validSources.length > 0) {
            // 执行导入
            const importStats = {
              imported: 0,
              updated: 0,
              skipped: 0,
              duplicates: 0,
            };
            
            const existingSources = new Map(adminConfig.SourceConfig.map(s => [s.key, s]));
            
            validSources.forEach(source => {
              const existing = existingSources.get(source.key);
              
              if (existing) {
                // 已存在的处理逻辑
                importStats.duplicates++;
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
                format: format,
                total: sources.length,
                valid: validSources.length,
                ...importStats,
              },
              sourcesImported: importStats.imported,
              sourcesUpdated: importStats.updated,
              warnings: validationResults.warnings.length > 0 ? validationResults.warnings : undefined,
            });
          }
        } else {
          // 不验证，直接导入
          const importStats = {
            imported: 0,
            updated: 0,
            skipped: 0,
            duplicates: 0,
          };
          
          const existingSources = new Map(adminConfig.SourceConfig.map(s => [s.key, s]));
          
          sources.forEach(source => {
            // 验证并标准化源
            const validation = validateVideoSource(source);
            const normalizedSource = validation.normalizedSource || {
              key: sanitizeKey(source.key || source.name || ''),
              name: source.name || '',
              api: source.api || '',
              detail: source.detail || '',
              from: 'custom',
              disabled: false,
              originalKey: source.originalKey || source.key || source.name,
            };
            
            const existing = existingSources.get(normalizedSource.key);
            
            if (existing) {
              importStats.duplicates++;
              if (strategy === 'overwrite') {
                Object.assign(existing, normalizedSource);
                existing.from = 'custom';
                importStats.updated++;
              } else if (strategy === 'merge') {
                if (existing.from !== 'config') {
                  Object.assign(existing, normalizedSource);
                  importStats.updated++;
                } else {
                  importStats.skipped++;
                }
              } else {
                importStats.skipped++;
              }
            } else {
              adminConfig.SourceConfig.push(normalizedSource);
              importStats.imported++;
            }
          });
          
          await db.saveAdminConfig(adminConfig);
          
          return NextResponse.json({
            ok: true,
            import: {
              format: format,
              total: sources.length,
              ...importStats,
            },
            sourcesImported: importStats.imported,
            sourcesUpdated: importStats.updated,
          });
        }
        break;
      }

      case 'add': {
        const { key, name, api, detail } = body as {
          key?: string;
          name?: string;
          api?: string;
          detail?: string;
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
              tag.enabledApis = tag.enabledApis.filter(apiKey => apiKey !== key);
            }
          });
        }

        // 清理用户权限
        adminConfig.UserConfig.Users.forEach(user => {
          if (user.enabledApis) {
            user.enabledApis = user.enabledApis.filter(apiKey => apiKey !== key);
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
                tag.enabledApis = tag.enabledApis.filter(apiKey => !keysToDelete.includes(apiKey));
              }
            });
          }

          // 清理用户权限
          adminConfig.UserConfig.Users.forEach(user => {
            if (user.enabledApis) {
              user.enabledApis = user.enabledApis.filter(apiKey => !keysToDelete.includes(apiKey));
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
          if (!isValidUrl(source.api)) {
            problems.push('API URL格式无效');
          }

          if (problems.length > 0) {
            issues.push({
              key: source.key,
              name: source.name,
              issue: problems.join(', '),
            });
          }
        });

        return NextResponse.json({
          ok: true,
          issues,
          fixed: 0,
          needManualFix: issues.length,
        });
      }

      case 'export': {
        const { 
          format = 'new',  // 'new' 或 'legacy'
          includeDisabled = false,
        } = body as {
          format?: 'new' | 'legacy';
          includeDisabled?: boolean;
        };

        // 使用类型断言确保 sourcesToExport 包含 originalKey
        let sourcesToExport = adminConfig.SourceConfig as VideoSourceForExport[];

        // 应用过滤器
        if (!includeDisabled) {
          sourcesToExport = sourcesToExport.filter(s => !s.disabled);
        }

        let exportData: any;
        
        if (format === 'legacy') {
          // 导出为旧格式
          const api_site: Record<string, any> = {};
          sourcesToExport.forEach(source => {
            // 这里 source 已经是 VideoSourceForExport 类型，包含 originalKey
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
            from: source.from,
            originalKey: source.originalKey,
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
