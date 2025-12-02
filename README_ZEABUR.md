# NewTV 部署到 Zeabur 指南

## 项目介绍

NewTV 是一个二次开发的跨平台影视聚合播放站，支持多种视频源和直播功能。

## 项目根目录

项目的根目录为 `NewTV/`，包含以下主要文件和目录：

- `src/`: 源代码目录
- `public/`: 静态资源目录
- `scripts/`: 脚本文件目录
- `package.json`: 项目依赖和脚本配置
- `next.config.js`: Next.js 配置文件
- `Dockerfile`: Docker 构建文件
- `zeabur.json`: Zeabur 部署配置文件
- `.env.example`: 环境变量示例文件

## 部署步骤

### 1. 登录 Zeabur 控制台

访问 [Zeabur 控制台](https://console.zeabur.com/) 并登录您的账户。

### 2. 创建新项目

点击 "创建项目" 按钮，输入项目名称，然后点击 "创建"。

### 3. 添加服务

在项目页面中，点击 "添加服务" 按钮，选择 "从 GitHub 导入"。

### 4. 选择仓库

选择 `hangyubin/NewTV` 仓库，或者您自己的 fork 仓库。

### 5. 配置构建选项

Zeabur 支持 Docker 部署，项目已包含 Dockerfile。Zeabur 会自动检测 Dockerfile 并使用 Docker 方式构建。

如果需要手动配置，可以参考以下设置：

- **构建类型**: `Docker`
- **Dockerfile 路径**: `Dockerfile`
- **端口**: `3000`

### 6. 配置环境变量

根据需要配置以下环境变量：

| 环境变量名                 | 描述                                      | 默认值                   |
| -------------------------- | ----------------------------------------- | ------------------------ |
| `NODE_ENV`                 | 运行环境                                  | `production`             |
| `PORT`                     | 服务端口                                  | `3000`                   |
| `HOSTNAME`                 | 主机名                                    | `0.0.0.0`                |
| `USERNAME`                 | 管理员用户名（必填）                      | -                        |
| `YOUTUBE_API_KEY`          | YouTube API 密钥                          | -                        |
| `NEXT_PUBLIC_STORAGE_TYPE` | 存储类型（支持：redis、kvrocks、upstash） | `redis`                  |
| `REDIS_URL`                | Redis 连接 URL                            | `redis://localhost:6379` |
| `KVROCKS_URL`              | KVRocks 连接 URL                          | `redis://localhost:6666` |
| `UPSTASH_URL`              | Upstash Redis 连接 URL                    | -                        |
| `UPSTASH_TOKEN`            | Upstash Redis 令牌                        | -                        |
| `CACHE_TTL`                | 缓存过期时间（秒）                        | `3600`                   |
| `NEXT_PUBLIC_SITE_NAME`    | 站点名称                                  | `NewTV`                  |
| `ANNOUNCEMENT`             | 站点公告                                  | -                        |

### 7. 部署服务

点击 "部署" 按钮，Zeabur 会开始构建和部署您的服务。

### 8. 访问服务

部署完成后，您可以通过 Zeabur 提供的域名访问您的 NewTV 服务。

## 高级配置

### 配置 KVRocks 服务

如果您在 Zeabur 上已有 KVRocks 服务，或者想要创建一个新的 KVRocks 服务，可以按照以下步骤配置：

1. **创建或选择 KVRocks 服务**：

   - 在项目页面中，点击 "添加服务" 按钮
   - 选择 "KVRocks" 服务
   - 配置 KVRocks 服务的名称和规格
   - 点击 "创建" 按钮

2. **关联 KVRocks 服务**：

   - 在 NewTV 服务页面中，点击 "服务关联" 标签页
   - 点击 "添加关联" 按钮
   - 选择您创建的 KVRocks 服务
   - 点击 "关联" 按钮

3. **配置环境变量**：

   - 在 NewTV 服务页面中，点击 "环境变量" 标签页
   - 更新以下环境变量：
     - `NEXT_PUBLIC_STORAGE_TYPE`: 设置为 `kvrocks`
     - `KVROCKS_URL`: 设置为 KVRocks 服务的连接 URL（格式：`redis://<host>:<port>`）

4. **重启服务**：
   - 在 NewTV 服务页面中，点击 "重启" 按钮
   - 等待服务重启完成

### 自定义域名

1. 在服务页面中，点击 "域名" 标签页。
2. 点击 "添加域名" 按钮，输入您的自定义域名。
3. 按照提示在您的域名服务商处配置 DNS 记录。

### 环境变量管理

您可以在服务页面的 "环境变量" 标签页中添加、编辑或删除环境变量。

### 日志查看

在服务页面的 "日志" 标签页中，您可以查看服务的运行日志。

## 注意事项

1. 确保您的仓库有正确的 `package.json` 和 `pnpm-lock.yaml` 文件。
2. 构建过程可能需要一些时间，请耐心等待。
3. 如果构建失败，请检查日志并根据错误信息进行修复。
4. 建议使用 Node.js 20 版本进行部署。

## 常见问题

### 1. 构建失败，提示依赖安装错误

**解决方案**：

- 确保 `pnpm-lock.yaml` 文件存在且与 `package.json` 匹配。
- 尝试清除缓存后重新构建。

### 2. 服务启动后无法访问

**解决方案**：

- 检查服务是否在正确的端口上运行。
- 检查防火墙设置，确保端口已开放。
- 查看日志，寻找错误信息。

### 3. 视频播放出现问题

**解决方案**：

- 检查视频源配置是否正确。
- 确保网络连接稳定。
- 清除浏览器缓存后重试。

## 联系我们

如果您在部署过程中遇到问题，可以通过以下方式联系我们：

- GitHub Issues: [https://github.com/hangyubin/NewTV/issues](https://github.com/hangyubin/NewTV/issues)
- 项目文档: [README.md](README.md)

## 更新日志

### v1.0.0

- 初始版本，支持基本的 Zeabur 部署配置

---

祝您部署顺利！
