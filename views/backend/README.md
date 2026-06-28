# 个人情报官 - 后端

## 项目介绍

个人情报官后端服务，基于 Express + TypeScript + SQLite。

## 技术栈

- Node.js + TypeScript
- Express
- SQLite (better-sqlite3)
- JWT (jsonwebtoken)
- bcrypt

## 开发

```bash
# 安装依赖
pnpm install

# 初始化数据库
pnpm db:init

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build
```

## 环境变量

复制 `.env.example` 为 `.env`，配置以下变量：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| PORT | 服务端口 | 3000 |
| JWT_SECRET | JWT密钥 | dev-secret-key-2026 |
| JWT_EXPIRES_IN | Token有效期 | 7d |
| DATABASE_PATH | 数据库路径 | ../../data/database.db |

## API接口

### 认证 `/api/auth`
- `POST /api/auth/register` - 注册
- `POST /api/auth/login` - 登录
- `GET /api/auth/me` - 获取当前用户

### 订阅 `/api/subscriptions`
- `GET /api/subscriptions` - 获取订阅列表
- `POST /api/subscriptions` - 创建订阅
- `PUT /api/subscriptions/:id` - 更新订阅
- `DELETE /api/subscriptions/:id` - 删除订阅

### 分类 `/api/categories`
- `GET /api/categories` - 获取分类列表
- `POST /api/categories` - 创建分类
- `PUT /api/categories/:id` - 更新分类
- `DELETE /api/categories/:id` - 删除分类

### 健康检查 `/api/health`
- `GET /api/health` - 健康检查
