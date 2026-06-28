# 订阅管理优化设计方案

## 1. 需求概述

优化订阅管理系统的交互流程：
1. 订阅库添加分类标签筛选功能
2. 添加订阅时提供完整的自定义配置

## 2. 分类标签体系

### 2.1 预设标签（共10个）

| 标签 | 说明 | 示例订阅源 |
|------|------|-----------|
| AI | 人工智能、机器学习、大模型 | ChatGPT新闻、AI资讯 |
| 科技 | 科技数码、硬件、软件 | 36氪、虎嗅 |
| 金融 | 金融投资、股市、经济 | 雪球、同花顺 |
| 商业 | 商业财经、创业、创投 | 创业邦、投资界 |
| 编程 | 编程开发、技术文章 | GitHub Trending、掘金 |
| 互联网 | 互联网资讯、行业动态 | 微博热搜、知乎热榜 |
| 视频 | 视频内容相关 | B站热门、抖音热榜 |
| 社交 | 社交媒体相关 | 微博、Twitter |
| 新闻 | 新闻资讯 | 网易新闻、腾讯新闻 |
| 博客 | 博客文章 | 阮一峰的网络日志 |

### 2.2 标签数据结构

```typescript
interface Tag {
  id: string;
  name: string;
  icon?: string;
}

// 预设标签列表
const PRESET_TAGS: Tag[] = [
  { id: 'ai', name: 'AI', icon: '🤖' },
  { id: 'tech', name: '科技', icon: '📱' },
  { id: 'finance', name: '金融', icon: '💰' },
  { id: 'business', name: '商业', icon: '💼' },
  { id: 'coding', name: '编程', icon: '💻' },
  { id: 'internet', name: '互联网', icon: '🌐' },
  { id: 'video', name: '视频', icon: '📺' },
  { id: 'social', name: '社交', icon: '💬' },
  { id: 'news', name: '新闻', icon: '📰' },
  { id: 'blog', name: '博客', icon: '📝' },
];
```

## 3. 订阅配置功能

### 3.1 配置项

| 配置项 | 类型 | 说明 | 默认值 |
|--------|------|------|--------|
| 分类标签 | 多选 | 订阅内容所属分类 | 空 |
| 刷新频率 | 单选 | 自动同步间隔 | 30分钟 |
| 包含关键词 | 文本 | 文章标题/摘要包含这些词才显示 | 空 |
| 排除关键词 | 文本 | 包含这些词的文章不显示 | 空 |

### 3.2 刷新频率选项

- 5分钟
- 15分钟
- 30分钟（默认）
- 60分钟

### 3.3 筛选逻辑

```
显示文章 = (包含关键词为空 OR 匹配包含关键词) AND (排除关键词为空 OR 不匹配排除关键词)
```

## 4. 界面交互设计

### 4.1 订阅库页面

```
┌─────────────────────────────────────────────────┐
│  [全部] [AI] [科技] [金融] [商业] [编程] ...     │  ← 标签筛选
│                                    [🔍 搜索...]   │
├─────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌───────────────┐         │
│  │ 📰 虎嗅网      │  │ 💬 微博热搜    │         │
│  │ [科技] [新闻]  │  │ [社交] [互联网]│         │
│  │ 虎嗅网最新文章 │  │ 微博热搜榜...  │         │
│  │         [+添加]│  │         [+添加]│         │
│  └───────────────┘  └───────────────┘         │
│  ...                                            │
└─────────────────────────────────────────────────┘
```

### 4.2 添加订阅配置弹窗

```
┌─────────────────────────────────────────────────┐
│  添加订阅                                    [×] │
├─────────────────────────────────────────────────┤
│  订阅源: /huxiu/article                        │
│  名称: 虎嗅网                                   │
│                                                 │
│  分类标签:  ← 可多选                           │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐             │
│  │ AI  │ │科技 │ │金融 │ │商业 │ │...         │
│  └─────┘ └─────┘ └─────┘ └─────┘             │
│                                                 │
│  刷新频率:                                      │
│  ○ 5分钟  ○ 15分钟  ● 30分钟  ○ 60分钟         │
│                                                 │
│  包含关键词: (用逗号分隔)                       │
│  ┌─────────────────────────────────┐           │
│  │                                 │           │
│  └─────────────────────────────────┘           │
│                                                 │
│  排除关键词: (用逗号分隔)                       │
│  ┌─────────────────────────────────┐           │
│  │                                 │           │
│  └─────────────────────────────────┘           │
│                                                 │
│                    [取消]  [预览]  [确认添加]    │
└─────────────────────────────────────────────────┘
```

### 4.3 我的订阅页面

```
┌─────────────────────────────────────────────────┐
│  我的订阅 (5)                     [+ 手动添加]   │
├─────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌───────────────┐         │
│  │ 📰 虎嗅网  [3]│  │ 💬 微博热搜 [1]│         │
│  │ [科技] [新闻] │  │ [社交] [互联网]│         │
│  │ 刷新: 30分钟  │  │ 刷新: 60分钟  │         │
│  │ [编辑] [删除] │  │ [编辑] [删除] │         │
│  └───────────────┘  └───────────────┘         │
│  ...                                            │
└─────────────────────────────────────────────────┘
```

## 5. 数据模型

### 5.1 订阅表结构

```sql
CREATE TABLE subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  category_id INTEGER,
  route_url TEXT NOT NULL,
  title TEXT,
  -- 新增字段
  tags TEXT,              -- JSON数组，存储标签ID列表
  filter_include TEXT,   -- 包含关键词，逗号分隔
  filter_exclude TEXT,    -- 排除关键词，逗号分隔
  refresh_rate INTEGER DEFAULT 30,  -- 刷新频率（分钟）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);
```

### 5.2 订阅路由标签关联表

```sql
CREATE TABLE route_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  route_example TEXT NOT NULL,  -- 路由示例，如 /zhihu/hot
  tag_id TEXT NOT NULL,         -- 标签ID
  UNIQUE(route_example, tag_id)
);
```

## 6. API设计

### 6.1 获取标签列表

```
GET /api/tags
Response: { tags: Tag[] }
```

### 6.2 获取路由及其标签

```
GET /api/routes
Response: { routes: RouteWithTags[] }

interface RouteWithTags {
  name: string;
  category: string;
  description: string;
  example: string;
  tags: string[];  // 标签ID列表
}
```

### 6.3 创建订阅（带配置）

```
POST /api/subscriptions
Body: {
  routeUrl: string;
  title?: string;
  tags?: string[];
  filterInclude?: string;
  filterExclude?: string;
  refreshRate?: number;
}
Response: { subscription: Subscription }
```

### 6.4 更新订阅配置

```
PUT /api/subscriptions/:id
Body: {
  tags?: string[];
  filterInclude?: string;
  filterExclude?: string;
  refreshRate?: number;
}
Response: { subscription: Subscription }
```

## 7. 实现步骤

1. **后端数据模型扩展**
   - 添加订阅标签字段
   - 创建路由-标签关联数据
   - 更新API支持新字段

2. **前端标签组件**
   - 创建标签选择组件
   - 创建订阅配置弹窗

3. **订阅库页面**
   - 添加预设标签筛选
   - 为每个路由显示标签
   - 集成配置弹窗

4. **我的订阅页面**
   - 显示订阅标签
   - 支持编辑配置

5. **文章筛选逻辑**
   - 根据关键词过滤文章

## 8. 验收标准

- [ ] 订阅库页面显示预设分类标签筛选
- [ ] 每个订阅路由卡片显示对应标签
- [ ] 点击"添加订阅"弹出完整配置弹窗
- [ ] 配置支持：标签多选、刷新频率、包含/排除关键词
- [ ] 我的订阅页面显示已订阅源的配置信息
- [ ] 文章列表根据关键词筛选正确过滤
