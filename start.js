#!/usr/bin/env node

/* eslint-disable no-console,@typescript-eslint/no-var-requires */
const http = require('http');
const path = require('path');
const fs = require('fs');

// 调用 generate-manifest.js 生成 manifest.json
function generateManifest() {
  console.log('Generating manifest.json for Docker deployment...');

  try {
    // 检查不同位置的 generate-manifest.js
    const possiblePaths = [
      path.join(__dirname, 'scripts', 'generate-manifest.js'),
      path.join(__dirname, 'public', 'scripts', 'generate-manifest.js'),
      path.join(__dirname, '../scripts/generate-manifest.js'),
    ];

    let generateManifestScript = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        generateManifestScript = p;
        break;
      }
    }

    if (generateManifestScript) {
      require(generateManifestScript);
    } else {
      console.warn(
        'generate-manifest.js not found, skipping manifest generation'
      );
    }
  } catch (error) {
    console.error('❌ Error calling generate-manifest.js:', error);
    // 非致命错误，继续执行
  }
}

// 安全地执行 manifest 生成
try {
  generateManifest();
} catch (error) {
  console.warn(
    '⚠️  Manifest generation failed, but continuing with server startup:',
    error.message
  );
}

// 查找 server.js 的可能路径
const serverPaths = [
  './server.js',
  './standalone/server.js',
  './.next/standalone/server.js',
];

let serverPath = null;
for (const p of serverPaths) {
  const fullPath = path.join(__dirname, p);
  if (fs.existsSync(fullPath)) {
    serverPath = fullPath;
    break;
  }
}

if (!serverPath) {
  // 如果找不到 server.js，检查是否是开发环境
  console.warn('⚠️  server.js not found, trying to start with next start...');
  const { spawn } = require('child_process');

  // 使用 next start 启动开发服务器
  const nextStart = spawn(
    'npx',
    [
      'next',
      'start',
      '-H',
      process.env.HOSTNAME || '0.0.0.0',
      '-p',
      process.env.PORT || '3000',
    ],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'production',
      },
    }
  );

  nextStart.on('exit', (code) => {
    process.exit(code || 0);
  });

  nextStart.on('error', (error) => {
    console.error('❌ Failed to start next server:', error);
    process.exit(1);
  });

  // 不需要继续执行下面的代码
  process.exit(0);
}

// 直接在当前进程中启动 standalone Server
console.log(`Starting server from: ${serverPath}`);
try {
  require(serverPath);
} catch (error) {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
}

// 每 5 秒轮询一次，直到请求成功（最多尝试 5 次）
const TARGET_URL = `http://${process.env.HOSTNAME || 'localhost'}:${
  process.env.PORT || 3000
}/login`;

let pollCount = 0;
const MAX_POLL_ATTEMPTS = 5;

const intervalId = setInterval(() => {
  pollCount++;

  if (pollCount > MAX_POLL_ATTEMPTS) {
    console.warn('⚠️  Max poll attempts reached, stopping polling.');
    clearInterval(intervalId);
    return;
  }

  console.log(
    `Fetching ${TARGET_URL} ... (Attempt ${pollCount}/${MAX_POLL_ATTEMPTS})`
  );

  const req = http.get(TARGET_URL, (res) => {
    // 当返回 2xx 状态码时认为成功，然后停止轮询
    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
      console.log('✅ Server is up, stop polling.');
      clearInterval(intervalId);

      // 执行 cron 任务的函数
      function executeCronJob() {
        const cronUrl = `http://${process.env.HOSTNAME || 'localhost'}:${
          process.env.PORT || 3000
        }/api/cron`;

        console.log(`Executing cron job: ${cronUrl}`);

        const req = http.get(cronUrl, (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            if (
              res.statusCode &&
              res.statusCode >= 200 &&
              res.statusCode < 300
            ) {
              console.log('✅ Cron job executed successfully:', data);
            } else {
              console.error('❌ Cron job failed:', res.statusCode, data);
            }
          });
        });

        req.on('error', (err) => {
          console.error('❌ Error executing cron job:', err);
        });

        req.setTimeout(30000, () => {
          console.error('❌ Cron job timeout');
          req.destroy();
        });
      }

      setTimeout(() => {
        // 服务器启动后，立即执行一次 cron 任务
        try {
          executeCronJob();
        } catch (error) {
          console.error('❌ Cron job execution failed:', error);
        }
      }, 3000);

      // 然后设置每小时执行一次 cron 任务
      setInterval(() => {
        try {
          executeCronJob();
        } catch (error) {
          console.error('❌ Cron job execution failed:', error);
        }
      }, 60 * 60 * 1000); // 每小时执行一次
    }
  });

  req.on('error', (err) => {
    console.warn(`⚠️  Polling error: ${err.message}`);
  });

  req.setTimeout(5000, () => {
    req.destroy();
  });
}, 5000);
