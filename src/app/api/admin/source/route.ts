/* eslint-disable @typescript-eslint/no-explicit-any,no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

// 支持的操作类型
type Action = 'add' | 'disable' | 'enable' | 'delete' | 'sort' | 'batch_disable' | 'batch_enable' | 'batch_delete' | 'batch' | 'import';

interface BaseBody {
  action?: Action;
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
    const ACTIONS: Action[] = ['add', 'disable', 'enable', 'delete', 'sort', 'batch_disable', 'batch_enable', 'batch_delete', 'batch', 'import'];
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
        const { sources } = body as { sources?: any[] };
        if (!Array.isArray(sources) || sources.length === 0) {
          return NextResponse.json({ error: '缺少 sources 参数或为空数组' }, { status: 400 });
        }
        
        // 批量添加视频源
        let addedCount = 0;
        let existingCount = 0;
        
        for (const source of sources) {
          if (!source.key || !source.name || !source.api) {
            continue; // 跳过缺少必要参数的源
          }
          
          // 检查是否已存在
          if (adminConfig.SourceConfig.some((s) => s.key === source.key)) {
            existingCount++;
            continue;
          }
          
          // 添加新源
          adminConfig.SourceConfig.push({
            key: source.key,
            name: source.name,
            api: source.api,
            detail: source.detail,
            from: 'custom' as const,
            disabled: source.disabled || false,
          });
          addedCount++;
        }
        
        break;
      }
      
      case 'import': {
        const { api_site, sources: bodySources, cache_time } = body as {
          api_site?: Record<string, any>;
          sources?: any[];
          cache_time?: number;
        };
        
        // 忽略未使用的 cache_time 变量
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _cache_time = cache_time;
        
        // 转换格式：从对象转换为数组
        let sources: any[] = [];
        
        if (api_site && typeof api_site === 'object') {
          // 转换格式：对象转数组
          sources = Object.entries(api_site).map(([key, value]) => {
            // 有些 key 可能以特殊字符开头，需要清理
            const cleanKey = key.replace(/^[./]+/, ''); // 移除开头的 . 或 /
            return {
              key: cleanKey,
              name: value.name || key,
              api: value.api || '',
              detail: value.detail || '',
              disabled: false
            };
          });
        } else if (Array.isArray(bodySources)) {
          sources = bodySources;
        } else {
          return NextResponse.json(
            { error: '数据格式错误：需要 api_site 对象或 sources 数组' },
            { status: 400 }
          );
        }
        
        // 验证数据
        if (sources.length === 0) {
          return NextResponse.json(
            { error: '没有找到可导入的视频源数据' },
            { status: 400 }
          );
        }
        
        console.log(`开始导入 ${sources.length} 个视频源`);
        
        // 验证每个视频源的基本字段
        const validSources: Array<{
          key: string;
          name: string;
          api: string;
          detail: string;
          from: 'custom';
          disabled: boolean;
        }> = [];
        const invalidSources: Array<{key?: string, name?: string, reason: string}> = [];
        const duplicateKeys = new Map<string, number>(); // 记录重复的键和出现次数
        const processedKeys = new Set<string>(); // 已处理的键名
        
        for (let index = 0; index < sources.length; index++) {
          const source = sources[index];
          // 基本字段验证
          if (
            !source ||
            typeof source.name !== 'string' || !source.name.trim() ||
            typeof source.key !== 'string' || !source.key.trim() ||
            typeof source.api !== 'string' || !source.api.trim()
          ) {
            invalidSources.push({
              key: source?.key,
              name: source?.name,
              reason: '缺少必要字段 (name, key, api) 或字段格式不正确'
            });
            continue;
          }
          
          const trimmedKey = source.key.trim();
          const trimmedName = source.name.trim();
          const trimmedApi = source.api.trim();
          const trimmedDetail = source.detail ? String(source.detail).trim() : '';
          
          // 特殊处理：如果 key 包含斜杠，取最后一部分
          const finalKey = trimmedKey.includes('/') 
            ? trimmedKey.split('/').pop() || trimmedKey
            : trimmedKey;
          
          // 检查是否已处理过相同的键
          if (processedKeys.has(finalKey)) {
            const count = duplicateKeys.get(finalKey) || 0;
            duplicateKeys.set(finalKey, count + 1);
            invalidSources.push({
              key: finalKey,
              name: trimmedName,
              reason: `Key "${finalKey}" 在导入列表中重复`
            });
            continue;
          }
          
          processedKeys.add(finalKey);
          
          // 检查是否已存在（包括内置源和自定义源）
          const existingSource = adminConfig.SourceConfig.find(s => s.key === finalKey);
          if (existingSource) {
            const count = duplicateKeys.get(finalKey) || 0;
            duplicateKeys.set(finalKey, count + 1);
            invalidSources.push({
              key: finalKey,
              name: trimmedName,
              reason: `Key "${finalKey}" 在系统中已存在`
            });
            continue;
          }
          
          // 验证 key 是否只包含字母、数字、下划线、连字符和点号
          if (!/^[a-zA-Z0-9._-]+$/.test(finalKey)) {
            invalidSources.push({
              key: finalKey,
              name: trimmedName,
              reason: `Key "${finalKey}" 包含非法字符，只能包含字母、数字、点号、下划线和连字符`
            });
            continue;
          }
          
          // 验证 API 地址格式（放宽要求）
          let isValidApi = false;
          let apiWarning = '';
          
          try {
            // 尝试解析为 URL
            if (trimmedApi.includes('://')) {
              new URL(trimmedApi);
              isValidApi = true;
            } else {
              // 如果没有协议，尝试添加 https:// 后解析
              try {
                new URL(`https://${trimmedApi}`);
                isValidApi = true;
                apiWarning = `API 地址 "${trimmedApi}" 缺少协议，已自动添加 https://`;
              } catch {
                // 如果仍然失败，检查是否为相对路径或简写形式
                if (trimmedApi.startsWith('/') || 
                    trimmedApi.startsWith('./') || 
                    trimmedApi.startsWith('../') ||
                    trimmedApi.includes('/api.php/provide/vod') ||
                    trimmedApi.includes('/api/json') ||
                    trimmedApi.includes('/inc/') ||
                    trimmedApi.includes('feifei')) {
                  isValidApi = true;
                  apiWarning = `API 地址 "${trimmedApi}" 可能是相对路径或简写形式`;
                }
              }
            }
          } catch (error) {
            // 最后尝试宽松验证
            if (trimmedApi.length > 5 && 
                (trimmedApi.includes('/') || trimmedApi.includes('.'))) {
              isValidApi = true;
              apiWarning = `API 地址 "${trimmedApi}" 格式非常规但被接受`;
            }
          }
          
          if (!isValidApi) {
            invalidSources.push({
              key: finalKey,
              name: trimmedName,
              reason: `API 地址格式无效: "${trimmedApi}"`
            });
            continue;
          }
          
          if (apiWarning) {
            console.warn(`[源 ${index + 1}/${sources.length}] ${apiWarning} (key: ${finalKey})`);
          }
          
          // 添加有效的源
          validSources.push({
            key: finalKey,
            name: trimmedName,
            api: trimmedApi,
            detail: trimmedDetail,
            from: 'custom' as const,
            disabled: source.disabled || false,
          });
        }
        
        console.log(`验证完成: ${validSources.length} 个有效, ${invalidSources.length} 个无效`);
        
        if (validSources.length === 0) {
          return NextResponse.json(
            { 
              error: '未找到有效的视频源数据',
              details: {
                total: sources.length,
                valid: 0,
                invalid: invalidSources.length,
                duplicates: Array.from(duplicateKeys.keys()),
                duplicateCounts: Object.fromEntries(duplicateKeys),
                invalidItems: invalidSources.slice(0, 20) // 返回前20个无效项以便调试
              }
            },
            { status: 400 }
          );
        }
        
        // 分离内置源和自定义源，保留内置源
        const builtInSources = adminConfig.SourceConfig.filter(s => s.from === 'config');
        
        // 创建新的源集合：内置源 + 导入的自定义源
        // 注意：import 动作会完全替换现有的自定义源
        adminConfig.SourceConfig = [
          ...builtInSources,
          ...validSources
        ];
        
        // 返回详细结果
        const responseData = {
          success: true,
          message: `成功导入 ${validSources.length} 个视频源，跳过 ${invalidSources.length} 个无效源`,
          details: {
            totalSources: sources.length,
            imported: validSources.length,
            invalid: invalidSources.length,
            duplicates: duplicateKeys.size,
            sampleImported: validSources.slice(0, 5).map(s => ({ key: s.key, name: s.name })),
            sampleSkipped: invalidSources.slice(0, 5).map(s => ({
              key: s.key,
              name: s.name,
              reason: s.reason
            }))
          }
        };
        
        // 持久化到存储
        await db.saveAdminConfig(adminConfig);
        
        console.log(`导入完成: 总共 ${adminConfig.SourceConfig.length} 个源 (${builtInSources.length} 内置 + ${validSources.length} 自定义)`);
        
        return NextResponse.json(
          responseData,
          {
            headers: {
              'Cache-Control': 'no-store',
            },
          }
        );
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
        adminConfig.SourceConfig.push({
          key,
          name,
          api,
          detail,
          from: 'custom' as const,
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
