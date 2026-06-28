# 个人情报官

基于RSSHub扩展的RSS订阅管理平台。

## 项目简介

个人情报官是一个自建的RSS订阅服务平台，核心价值：

- **复用RSSHub 5000+路由**：覆盖社交媒体、新闻、博客、视频等各类网站
- **订阅管理**：保存、自定义分类、关键词过滤、更新频率控制
- **现代化后台**：提供订阅预览、数据统计、用户管理

## 快速开始

### 方式一：阅读文档

1. 查看 [项目文档索引](./docs/README.md)
2. 阅读 [需求文档](./docs/需求文档.md)
3. 阅读 [技术方案](./docs/技术方案.md)
4. 阅读 [开发规范](./docs/规范/开发规范.md)

### 方式二：直接开发

1. 克隆RSSHub代码库
2. 按照技术方案扩展用户系统和后台
3. 参考开发规范进行开发

## 文档目录

| 文档 | 说明 |
|------|------|
| [docs/README.md](./docs/README.md) | 项目文档索引 |
| [docs/需求文档.md](./docs/需求文档.md) | 产品需求 |
| [docs/技术方案.md](./docs/技术方案.md) | 技术架构 |
| [docs/开发日志/](./docs/开发日志/) | 开发记录 |

## 技术栈

- **后端**：Node.js + TypeScript + Express
- **数据库**：SQLite
- **前端**：Vue 3 + TypeScript + Vite
- **认证**：JWT
- **RSS解析**：rss-parser + cheerio

## 项目结构

```
个人情报官/
├── docs/                   # 项目文档
│   ├── README.md          # 文档索引
│   ├── 需求文档.md
│   ├── 技术方案.md
│   ├── 开发日志/           # 开发记录
│   └── 规范/               # 标准规范
├── lib/                    # RSSHub核心（待添加）
├── routes/                 # RSSHub路由（待添加）
└── views/                  # Web界面（待添加）
```

## 开发指南

### 环境要求

- Node.js >= 18
- pnpm >= 8

### 本地开发

```bash
# 安装依赖
pnpm install

# 启动后端
pnpm dev:backend

# 启动前端
pnpm dev:frontend
```

## 相关链接

- [RSSHub官方仓库](https://github.com/DIYgod/RSSHub)
- [RSSHub文档](https://docs.rsshub.app/)

## 许可证

AGPL-3.0
