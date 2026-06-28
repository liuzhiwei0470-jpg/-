# 个人情报官 部署指南

## 架构概述

- **前端**: Vercel (免费静态部署)
- **后端**: Render (Node.js 服务)
- **数据库**: Turso (SQLite 云端版，免费9GB)

## 部署步骤

### 1. GitHub 仓库准备

1. 登录 GitHub，创建新仓库 `geren-qingbaoguan`
2. 将项目代码推送到 GitHub

```bash
cd 个人情报官
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/你的用户名/geren-qingbaoguan.git
git push -u origin main
```

### 2. 前端部署 (Vercel)

1. 访问 [vercel.com](https://vercel.com)，使用 GitHub 账号登录
2. 点击 "New Project"，选择 `geren-qingbaoguan` 仓库
3. 配置项目：
   - Framework Preset: `Vite`
   - Root Directory: `views/frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. 添加环境变量：
   - `VITE_API_BASE_URL`: 你的后端地址 (如 `https://geren-qingbaoguan-backend.onrender.com`)
5. 点击 Deploy

### 3. 后端部署 (Render)

1. 访问 [render.com](https://render.com)，使用 GitHub 账号登录
2. 点击 "New +" → "Web Service"
3. 连接 `geren-qingbaoguan` 仓库
4. 配置服务：
   - Name: `geren-qingbaoguan-backend`
   - Region: Singapore (离中国近)
   - Branch: `main`
   - Root Directory: `views/backend`
   - Runtime: `Node`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
5. 等待部署完成，获取后端 URL (如 `https://geren-qingbaoguan-backend.onrender.com`)

### 4. 数据库配置 (Turso)

1. 访问 [turso.tech](https://turso.tech)，注册账号
2. 创建数据库：
   ```bash
   # 安装 Turso CLI
   brew install tursodev/tap/turso

   # 登录
   turso auth login

   # 创建数据库
   turso db create geren-qingbaoguan

   # 获取数据库 URL
   turso db show geren-qingbaoguan --url
   ```
3. 在 Render 后端服务中添加环境变量：
   - `DATABASE_URL`: 你的 Turso 数据库 URL

### 5. 更新前端 API 配置

1. 在 Vercel 项目设置中更新环境变量：
   - `VITE_API_BASE_URL`: `https://geren-qingbaoguan-backend.onrender.com/api`

## 域名绑定 (可选)

Vercel 提供免费子域名 `your-project.vercel.app`，可直接使用。如需绑定自定义域名：
1. Vercel 项目 → Settings → Domains
2. 添加你的域名，按照提示配置 DNS

## 免费额度说明

| 服务 | 免费额度 | 说明 |
|------|---------|------|
| Vercel | 100GB 月流量 | 个人项目足够 |
| Render | 750小时/月 | 休眠后需重新启动，约 $0/项目 |
| Turso | 9GB 存储，10亿次读/月 | 初期完全够用 |

## 注意事项

1. **冷启动**: Render 免费层有休眠机制，30秒无请求会休眠，首次访问需等待5-10秒启动
2. **数据库迁移**: 首次部署需要手动初始化数据库表
3. **RSSHub**: 订阅功能依赖本地 RSSHub，需要另行部署在端口 1200

## 本地开发

```bash
# 前端
cd views/frontend
npm install
npm run dev

# 后端
cd views/backend
npm install
npm run dev

# RSSHub (需单独安装)
npm install -g RSSHub
rsshub
```
