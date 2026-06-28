# 个人情报官 - 前端

## 项目介绍

个人情报官前端管理后台，基于 Vue 3 + TypeScript + Vite。

## 技术栈

- Vue 3 (Composition API)
- TypeScript
- Vite
- Pinia (状态管理)
- Vue Router
- Axios

## 开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build
```

## 页面

- `/login` - 登录页
- `/register` - 注册页
- `/dashboard` - 仪表盘
- `/subscriptions` - 订阅管理
- `/routes` - 路由浏览
- `/settings` - 设置

## API代理

开发环境下，Vite 代理 `/api` 请求到 `http://localhost:3000`。

## 环境变量

无需配置，使用 Vite 代理解决跨域问题。
