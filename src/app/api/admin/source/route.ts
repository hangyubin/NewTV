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
  from: 'config' | 'custom';
  originalKey?: string;
}

// 为了导出操作，创建一个包含 originalKey 的类型
interface VideoSourceForExport extends VideoSource {
  originalKey?: string;
}

// 生成安全的key
function generateSafeKey(originalKey: string): string {
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
    if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
      return true;
    }
    if (/^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(url)) {
      return true;
    }
    return false;
  }
}

// 检查是否是默认示例API
function isDefaultExampleSource(source: any): boolean {
  if (!source) return false;
  
  const key = (source.key || '').toLowerCase();
  const api = (source.api || '').toLowerCase();
  const name = (source.name || '').toLowerCase();
  
  // 精确匹配默认示例API
  if ((key === 'default' || name.includes('default')) && api.includes('example.com')) {
    return true;
  }
  
  if (key === 'example' && api.includes('example.com')) {
    return true;
  }
  
  if (key === 'demo' && (api.includes('demo.') || api.includes('example.com'))) {
    return true;
  }
  
  if (api.includes('api.example.com') || api.includes('example.com/api')) {
    return true;
  }
  
  return false;
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
      from: 'custom', // 导入的数据都是 custom
      disabled: false,
      originalKey,
    });
  });
  
  return sources;
}

// 解析不同格式的数据
function parseSourceData(data: any): { sources: VideoSource[], format: 'array' | 'legacy' | 'single' | 'unknown', error?: string } {
  if (data == null) {
    return {
      sources: [],
      format: 'unknown',
      error: '数据为空'
    };
  }

  const sources: VideoSource[] = [];
  
  // 如果已经是数组
  if (Array.isArray(data)) {
    for (const item of data) {
      if (item && typeof item === 'object') {
        if (item.key && item.name && item.api) {
          sources.push({
            key: item.key,
            name: item.name,
            api: item.api,
            detail: item.detail || '',
            from: 'custom', // 导入的数据都是 custom
            disabled: item.disabled || false,
            originalKey: item.originalKey || item.key,
          });
        } else if (item.api_site) {
          const legacySources = convertLegacyToNewFormat(item);
          sources.push(...legacySources);
        } else if (item.name && item.api) {
          const key = generateSafeKey(item.key || item.name);
          sources.push({
            key,
            name: item.name,
            api: item.api,
            detail: item.detail || '',
            from: 'custom', // 导入的数据都是 custom
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
  
  // 如果是旧格式
  if (data && typeof data === 'object') {
    if (data.api_site && typeof data.api_site === 'object') {
      const legacySources = convertLegacyToNewFormat(data);
      if (legacySources.length > 0) {
        return {
          sources: legacySources,
          format: 'legacy',
        };
      }
    }
    
    // 检查包装格式
    const possibleArrayFields = ['sources', 'data', 'items', 'list', 'sites'];
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
                from: 'custom', // 导入的数据都是 custom
                disabled: item.disabled || false,
                originalKey: item.originalKey || item.key,
              });
            } else if (item.name && item.api) {
              const key = generateSafeKey(item.key || item.name);
              validSources.push({
                key,
                name: item.name,
                api: item.api,
                detail: item.detail || '',
                from: 'custom', // 导入的数据都是 custom
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
    
    // 单个对象
    if (data.key && data.name && data.api) {
      return {
        sources: [{
          key: data.key,
          name: data.name,
          api: data.api,
          detail: data.detail || '',
          from: 'custom', // 导入的数据都是 custom
          disabled: data.disabled || false,
          originalKey: data.originalKey || data.key,
        }],
        format: 'single',
      };
    }
    
    // 有name和api但没有key
    if (data.name && data.api) {
      const key = generateSafeKey(data.key || data.name);
      return {
        sources: [{
          key,
          name: data.name,
          api: data.api,
          detail: data.detail || '',
          from: 'custom', // 导入的数据都是 custom
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
    error: '不支持的数据格式'
  };
}

// 清理和标准化key
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
  
  if (!/^[a-zA-Z0-9-_]+$/.test(key)) {
    errors.push('key只能包含字母、数字、连字符(-)和下划线(_)');
  }
  
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
      from: 'custom' as const, // 这里修复：明确指定为字面量类型 'custom'
      disabled: !!source.disabled,
      originalKey: source.originalKey || source.key || source.name,
    }
  };
}

export async function POST(request: NextRequest) {
  console.log('=== 视频源管理API开始 ===');
  console.log('请求方法: POST');
  
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
  if (storageType === 'localstorage') {
    console.log('本地存储模式，允许管理员配置');
  }

  try {
    const body = (await request.json()) as BaseBody & Record<string, any>;
    const { action } = body;
    
    console.log('操作类型:', action);
    console.log('请求体:', JSON.stringify(body, null, 2).substring(0, 500));

    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      console.log('未授权访问');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const username = authInfo.username;
    console.log('操作用户:', username);

    // 基础校验
    const ACTIONS: Action[] = ['add', 'disable', 'enable', 'delete', 'sort', 'batch_disable', 'batch_enable', 'batch_delete', 'batch', 'import', 'validate_and_fix', 'export'];
    if (!username || !action || !ACTIONS.includes(action)) {
      console.log('参数格式错误:', { username, action });
      return NextResponse.json({ error: '参数格式错误' }, { status: 400 });
    }

    // 获取配置与存储
    console.log('获取管理员配置...');
    const adminConfig = await getConfig();
    if (!adminConfig) {
      console.error('获取管理员配置失败');
      return NextResponse.json({ error: '获取配置失败' }, { status: 500 });
    }
    
    console.log('当前配置中的源数量:', adminConfig.SourceConfig.length);
    console.log('源详情:', adminConfig.SourceConfig.map(s => ({
      key: s.key,
      name: s.name.substring(0, 20),
      from: s.from,
      api: s.api?.substring(0, 30)
    })));

    // 权限与身份校验
    if (username !== process.env.USERNAME) {
      const userEntry = adminConfig.UserConfig.Users.find(
        (u) => u.username === username
      );
      if (!userEntry || userEntry.role !== 'admin' || userEntry.banned) {
        console.log('权限不足:', username);
        return NextResponse.json({ error: '权限不足' }, { status: 401 });
      }
    }

    switch (action) {
      case 'import': {
        console.log('=== 导入操作开始 ===');
        const { data, type = 'auto', strategy = 'skip', validate = true } = body as {
          data?: any;
          type?: 'auto' | 'array' | 'legacy' | 'single';
          strategy?: 'skip' | 'overwrite' | 'merge';
          validate?: boolean;
        };
        
        // 支持多种方式提供数据
        let importData = data;
        if (!importData) {
          const possibleFields = ['sources', 'items', 'list', 'sites', 'api_site'];
          for (const field of possibleFields) {
            if (body[field] !== undefined) {
              importData = body[field];
              console.log('从字段获取数据:', field);
              break;
            }
          }
        }
        
        if (!importData) {
          console.log('缺少数据参数');
          return NextResponse.json({ 
            error: '缺少数据参数',
            hint: '请提供以下格式之一的参数：data, sources, items, list, sites 或 api_site'
          }, { status: 400 });
        }
        
        console.log('导入数据:', JSON.stringify(importData, null, 2).substring(0, 300));
        
        // 根据指定的类型或自动检测类型来解析数据
        let parsedResult;
        if (type === 'array') {
          if (Array.isArray(importData)) {
            parsedResult = parseSourceData(importData);
          } else {
            parsedResult = parseSourceData([importData]);
          }
        } else if (type === 'legacy') {
          const legacyData = importData.api_site ? importData : { api_site: importData };
          parsedResult = parseSourceData(legacyData);
        } else if (type === 'single') {
          parsedResult = parseSourceData(importData);
        } else {
          parsedResult = parseSourceData(importData);
        }
        
        if (parsedResult.error) {
          console.log('数据解析失败:', parsedResult.error);
          return NextResponse.json({ 
            error: '数据解析失败',
            details: parsedResult.error,
            receivedFormat: parsedResult.format
          }, { status: 400 });
        }
        
        const { sources, format } = parsedResult;
        
        if (sources.length === 0) {
          console.log('未找到有效的视频源数据');
          return NextResponse.json({ 
            error: '未找到有效的视频源数据',
            hint: '请确保数据包含有效的视频源（至少包含 name 和 api 字段）',
            detectedFormat: format
          }, { status: 400 });
        }
        
        console.log(`解析到 ${sources.length} 个视频源，格式: ${format}`);
        
        // 验证数据
        if (validate) {
          console.log('开始验证数据...');
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
            console.log('数据验证失败:', validationResults);
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
            console.log(`数据验证通过，有效源: ${validSources.length}/${sources.length}`);
            
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
                importStats.duplicates++;
                if (strategy === 'overwrite') {
                  Object.assign(existing, source);
                  importStats.updated++;
                } else if (strategy === 'merge') {
                  if (existing.from !== 'config') {
                    Object.assign(existing, source);
                    importStats.updated++;
                  } else {
                    importStats.skipped++;
                  }
                } else {
                  importStats.skipped++;
                }
              } else {
                adminConfig.SourceConfig.push(source);
                importStats.imported++;
              }
            });
            
            console.log('导入统计:', importStats);
            console.log('导入后源数量:', adminConfig.SourceConfig.length);
            
            // 保存配置
            try {
              console.log('开始保存导入后的配置...');
              await db.saveAdminConfig(adminConfig);
              console.log('导入配置保存成功');
            } catch (saveError) {
              console.error('导入配置保存失败:', saveError);
              return NextResponse.json({
                error: '导入配置保存失败',
                details: (saveError as Error).message
              }, { status: 500 });
            }
            
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
          console.log('跳过验证，直接导入');
          const importStats = {
            imported: 0,
            updated: 0,
            skipped: 0,
            duplicates: 0,
          };
          
          const existingSources = new Map(adminConfig.SourceConfig.map(s => [s.key, s]));
          
          sources.forEach(source => {
            const validation = validateVideoSource(source);
            const normalizedSource = validation.normalizedSource || {
              key: sanitizeKey(source.key || source.name || ''),
              name: source.name || '',
              api: source.api || '',
              detail: source.detail || '',
              from: 'custom' as const, // 这里修复：明确指定为字面量类型
              disabled: false,
              originalKey: source.originalKey || source.key || source.name,
            };
            
            const existing = existingSources.get(normalizedSource.key);
            
            if (existing) {
              importStats.duplicates++;
              if (strategy === 'overwrite') {
                Object.assign(existing, normalizedSource);
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
          
          console.log('导入统计:', importStats);
          
          // 保存配置
          try {
            console.log('开始保存导入后的配置...');
            await db.saveAdminConfig(adminConfig);
            console.log('导入配置保存成功');
          } catch (saveError) {
            console.error('导入配置保存失败:', saveError);
            return NextResponse.json({
              error: '导入配置保存失败',
              details: (saveError as Error).message
            }, { status: 500 });
          }
          
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
        console.log('=== 添加视频源 ===');
        const { key, name, api, detail } = body as {
          key?: string;
          name?: string;
          api?: string;
          detail?: string;
        };
        
        console.log('添加参数:', { key, name, api: api?.substring(0, 50), detail: detail?.substring(0, 50) });
        
        if (!key || !name || !api) {
          console.log('缺少必要参数');
          return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
        }
        
        if (adminConfig.SourceConfig.some((s) => s.key === key)) {
          console.log('源已存在:', key);
          return NextResponse.json({ error: '该源已存在' }, { status: 400 });
        }
        
        if (!isValidUrl(api)) {
          console.log('API URL格式无效:', api);
          return NextResponse.json({ error: 'API URL格式无效' }, { status: 400 });
        }
        
        // 配置文件手动添加的源：标记为 custom（可以删除）
        const newSource = {
          key,
          name,
          api,
          detail: detail || '',
          from: 'custom' as const, // 关键修复：明确指定为 'custom' 字面量类型
          disabled: false,
        };
        
        adminConfig.SourceConfig.push(newSource);
        
        console.log('添加成功:', newSource);
        console.log('添加后源数量:', adminConfig.SourceConfig.length);
        break;
      }

      case 'delete': {
        console.log('=== 删除视频源 ===');
        const { key } = body as { key?: string };
        if (!key) {
          console.log('缺少 key 参数');
          return NextResponse.json({ error: '缺少 key 参数' }, { status: 400 });
        }
        
        const idx = adminConfig.SourceConfig.findIndex((s) => s.key === key);
        if (idx === -1) {
          console.log('源不存在:', key);
          return NextResponse.json({ error: '源不存在' }, { status: 404 });
        }
        
        const entry = adminConfig.SourceConfig[idx];
        
        console.log('删除源检查:', {
          key: entry.key,
          from: entry.from,
          api: entry.api,
          name: entry.name
        });
        
        // 简化的删除逻辑：
        // 1. 所有 from: 'custom' 的源都可以删除
        // 2. from: 'config' 的默认示例API，如果有其他有效源，则可以删除
        // 3. 其他 from: 'config' 的源不能删除
        
        if (entry.from === 'custom') {
          // custom 来源都可以删除
          console.log('删除 custom 来源的源:', entry.key);
        } else if (entry.from === 'config') {
          // 检查是否是默认示例API
          const isDefaultExample = isDefaultExampleSource(entry);
          
          if (isDefaultExample) {
            // 默认示例API：检查是否有其他有效源
            const hasOtherValidSources = adminConfig.SourceConfig.some(source => 
              source.key !== entry.key && 
              !source.disabled
            );
            
            if (!hasOtherValidSources) {
              console.log('不能删除唯一的视频源');
              return NextResponse.json({ 
                error: '这是唯一的视频源，请先添加其他视频源后再删除此示例源' 
              }, { status: 400 });
            }
            
            console.log('删除 config 来源的默认示例API:', entry.key);
          } else {
            // 其他 config 来源的源不能删除
            console.log('不能删除系统配置源:', entry.key);
            return NextResponse.json({ 
              error: '该源为系统配置源，不可删除' 
            }, { status: 400 });
          }
        }
        
        // 执行删除
        adminConfig.SourceConfig.splice(idx, 1);
        console.log('源已删除，剩余数量:', adminConfig.SourceConfig.length);

        // 清理权限
        if (adminConfig.UserConfig.Tags) {
          adminConfig.UserConfig.Tags.forEach(tag => {
            if (tag.enabledApis) {
              tag.enabledApis = tag.enabledApis.filter(apiKey => apiKey !== key);
            }
          });
        }

        adminConfig.UserConfig.Users.forEach(user => {
          if (user.enabledApis) {
            user.enabledApis = user.enabledApis.filter(apiKey => apiKey !== key);
          }
        });
        
        console.log('权限清理完成');
        break;
      }

      case 'disable': {
        const { key } = body as { key?: string };
        if (!key) {
          console.log('缺少 key 参数');
          return NextResponse.json({ error: '缺少 key 参数' }, { status: 400 });
        }
        
        const entry = adminConfig.SourceConfig.find((s) => s.key === key);
        if (!entry) {
          console.log('源不存在:', key);
          return NextResponse.json({ error: '源不存在' }, { status: 404 });
        }
        
        entry.disabled = true;
        console.log('禁用源:', key);
        break;
      }

      case 'enable': {
        const { key } = body as { key?: string };
        if (!key) {
          console.log('缺少 key 参数');
          return NextResponse.json({ error: '缺少 key 参数' }, { status: 400 });
        }
        
        const entry = adminConfig.SourceConfig.find((s) => s.key === key);
        if (!entry) {
          console.log('源不存在:', key);
          return NextResponse.json({ error: '源不存在' }, { status: 404 });
        }
        
        entry.disabled = false;
        console.log('启用源:', key);
        break;
      }

      case 'batch_disable': {
        const { keys } = body as { keys?: string[] };
        if (!Array.isArray(keys) || keys.length === 0) {
          console.log('缺少 keys 参数或为空');
          return NextResponse.json({ error: '缺少 keys 参数或为空' }, { status: 400 });
        }
        
        console.log('批量禁用源:', keys);
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
          console.log('缺少 keys 参数或为空');
          return NextResponse.json({ error: '缺少 keys 参数或为空' }, { status: 400 });
        }
        
        console.log('批量启用源:', keys);
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
          console.log('缺少 keys 参数或为空');
          return NextResponse.json({ error: '缺少 keys 参数或为空' }, { status: 400 });
        }
        
        console.log('批量删除源:', keys);
        
        // 检查是否有不能删除的源
        const cannotDeleteKeys: string[] = [];
        const keysToDelete: string[] = [];
        
        keys.forEach(key => {
          const entry = adminConfig.SourceConfig.find((s) => s.key === key);
          if (!entry) return;
          
          if (entry.from === 'custom') {
            keysToDelete.push(key);
          } else if (entry.from === 'config') {
            const isDefaultExample = isDefaultExampleSource(entry);
            if (isDefaultExample) {
              // 默认示例API：检查是否有其他有效源
              const hasOtherValidSources = adminConfig.SourceConfig.some(source => 
                source.key !== key && 
                !source.disabled
              );
              
              if (hasOtherValidSources) {
                keysToDelete.push(key);
              } else {
                cannotDeleteKeys.push(key);
              }
            } else {
              cannotDeleteKeys.push(key);
            }
          }
        });
        
        if (cannotDeleteKeys.length > 0) {
          console.log('有不能删除的源:', cannotDeleteKeys);
        }
        
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
        
        console.log('批量删除完成，删除数量:', keysToDelete.length, '不能删除数量:', cannotDeleteKeys.length);
        break;
      }

      case 'sort': {
        const { order } = body as { order?: string[] };
        if (!Array.isArray(order)) {
          console.log('排序列表格式错误');
          return NextResponse.json(
            { error: '排序列表格式错误' },
            { status: 400 }
          );
        }
        
        console.log('排序列表:', order);
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
        
        console.log('排序完成，源数量:', adminConfig.SourceConfig.length);
        break;
      }

      case 'validate_and_fix': {
        console.log('验证和修复视频源');
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

        console.log('验证发现的问题数量:', issues.length);
        return NextResponse.json({
          ok: true,
          issues,
          fixed: 0,
          needManualFix: issues.length,
        });
      }

      case 'export': {
        console.log('导出视频源');
        const { 
          format = 'new',
          includeDisabled = false,
        } = body as {
          format?: 'new' | 'legacy';
          includeDisabled?: boolean;
        };

        console.log('导出参数:', { format, includeDisabled });

        let sourcesToExport = adminConfig.SourceConfig as VideoSourceForExport[];

        if (!includeDisabled) {
          sourcesToExport = sourcesToExport.filter(s => !s.disabled);
        }

        let exportData: any;
        
        if (format === 'legacy') {
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

        console.log('导出数据数量:', sourcesToExport.length);
        return new NextResponse(JSON.stringify(exportData, null, 2), {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="video-sources-${new Date().toISOString().split('T')[0]}.json"`,
          },
        });
      }

      default:
        console.log('未知操作:', action);
        return NextResponse.json({ error: '未知操作' }, { status: 400 });
    }

    // 持久化到存储
    console.log('开始保存管理员配置...');
    try {
      await db.saveAdminConfig(adminConfig);
      console.log('✅ 管理员配置保存成功');
    } catch (saveError) {
      console.error('❌ 保存管理员配置失败:', saveError);
      return NextResponse.json({
        ok: false,
        error: '保存配置失败',
        details: (saveError as Error).message
      }, { status: 500 });
    }

    console.log('=== 视频源管理API结束 ===');
    return NextResponse.json(
      { ok: true, message: '操作成功' },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('=== 视频源管理操作失败 ===:', error);
    return NextResponse.json(
      {
        error: '视频源管理操作失败',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
