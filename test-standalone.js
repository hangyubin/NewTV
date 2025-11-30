#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 检查 standalone 输出结构
console.log('Checking standalone output structure...');

const standaloneDir = path.join(__dirname, '.next', 'standalone');
console.log(`Standalone directory: ${standaloneDir}`);

// 检查 server.js 是否存在
const serverJsPath = path.join(standaloneDir, 'server.js');
console.log(`Server.js path: ${serverJsPath}`);
console.log(`Server.js exists: ${fs.existsSync(serverJsPath)}`);

// 检查其他重要文件
const filesToCheck = ['package.json', 'node_modules', '.next/static', 'public'];
filesToCheck.forEach(file => {
  const filePath = path.join(standaloneDir, file);
  console.log(`${file} exists: ${fs.existsSync(filePath)}`);
});

// 检查 start.js 中的 server.js 路径
console.log('\nChecking start.js server.js path...');
const startJsContent = fs.readFileSync(path.join(__dirname, 'start.js'), 'utf8');
console.log('start.js content:');
console.log(startJsContent);
