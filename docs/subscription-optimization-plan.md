# 订阅管理优化实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为订阅管理添加分类标签系统和自定义配置功能

**Architecture:** 
- 后端扩展订阅表支持标签、筛选关键词、刷新频率配置
- 前端创建标签选择组件和订阅配置弹窗
- 订阅库显示标签筛选，添加订阅时弹出完整配置弹窗

**Tech Stack:** Vue 3 + TypeScript + Pinia + SQLite

---

## 文件结构

```
后端:
- views/backend/src/models/database.ts (修改)
- views/backend/src/routes/subscriptions.ts (修改)
- views/backend/src/routes/routes.ts (修改)

前端:
- views/frontend/src/views/subscriptions/SubscriptionList.vue (修改)
- views/frontend/src/components/TagSelector.vue (新建)
- views/frontend/src/components/SubscriptionConfigModal.vue (新建)
- views/frontend/src/stores/subscription.ts (修改)
- views/frontend/src/api/index.ts (修改)
- views/frontend/src/types/subscription.ts (新建)
```

---

## Task 1: 后端数据库模型扩展

**Files:**
- Modify: `views/backend/src/models/database.ts`
- Modify: `views/backend/src/routes/subscriptions.ts`

- [ ] **Step 1: 添加订阅标签字段到subscriptions表**

在database.ts的initDatabase函数中，找到subscriptions表定义，添加新字段：

```typescript
// 订阅表 - 添加tags、filter_include、filter_exclude字段
db.exec(`
  CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    category_id INTEGER,
    route_url TEXT NOT NULL,
    title TEXT,
    config TEXT,
    filter_keywords TEXT,
    -- 新增字段
    tags TEXT,              -- JSON数组，存储标签ID列表
    filter_include TEXT,   -- 包含关键词，逗号分隔
    filter_exclude TEXT,    -- 排除关键词，逗号分隔
    refresh_rate INTEGER DEFAULT 30,  -- 刷新频率（分钟）
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
  )
`);
```

- [ ] **Step 2: 添加迁移脚本为已有订阅补充新字段**

在initDatabase函数末尾添加：

```typescript
// 迁移：为已有订阅添加新字段
const columns = db.prepare("PRAGMA table_info(subscriptions)").all() as { name: string }[];
const hasTags = columns.some(c => c.name === 'tags');
if (!hasTags) {
  db.exec('ALTER TABLE subscriptions ADD COLUMN tags TEXT');
}
const hasFilterInclude = columns.some(c => c.name === 'filter_include');
if (!hasFilterInclude) {
  db.exec('ALTER TABLE subscriptions ADD COLUMN filter_include TEXT');
}
const hasFilterExclude = columns.some(c => c.name === 'filter_exclude');
if (!hasFilterExclude) {
  db.exec('ALTER TABLE subscriptions ADD COLUMN filter_exclude TEXT');
}
const hasRefreshRate = columns.some(c => c.name === 'refresh_rate');
if (!hasRefreshRate) {
  db.exec('ALTER TABLE subscriptions ADD COLUMN refresh_rate INTEGER DEFAULT 30');
}
```

- [ ] **Step 3: 创建路由预设标签数据**

在database.ts中添加路由标签映射：

```typescript
// 路由预设标签映射
export const ROUTE_TAGS: Record<string, string[]> = {
  '/zhihu/hot': ['social', 'internet'],
  '/zhihu/daily': ['news'],
  '/36kr/news/latest': ['tech', 'business'],
  '/huxiu/article': ['tech', 'news'],
  '/bilibili/ranking/all': ['video'],
  '/weibo/search/hot': ['social', 'internet'],
  '/github/trending/daily': ['coding', 'tech'],
  'https://www.ruanyifeng.com/blog/atom.xml': ['blog', 'tech'],
};
```

- [ ] **Step 4: 更新subscriptions API支持新字段**

修改routes/subscriptions.ts中的createSubscription和updateSubscription：

```typescript
// 创建订阅 - 支持新字段
app.post('/subscriptions', authMiddleware, async (req, res) => {
  const { routeUrl, title, tags, filterInclude, filterExclude, refreshRate } = req.body;
  
  const result = db.prepare(`
    INSERT INTO subscriptions (user_id, route_url, title, tags, filter_include, filter_exclude, refresh_rate)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.userId,
    routeUrl,
    title || null,
    tags ? JSON.stringify(tags) : null,
    filterInclude || null,
    filterExclude || null,
    refreshRate || 30
  );
  
  res.json({ subscription: getSubscriptionById(result.lastInsertRowid) });
});

// 更新订阅 - 支持新字段
app.put('/subscriptions/:id', authMiddleware, async (req, res) => {
  const { tags, filterInclude, filterExclude, refreshRate } = req.body;
  
  db.prepare(`
    UPDATE subscriptions 
    SET tags = ?, filter_include = ?, filter_exclude = ?, refresh_rate = ?
    WHERE id = ? AND user_id = ?
  `).run(
    tags ? JSON.stringify(tags) : null,
    filterInclude || null,
    filterExclude || null,
    refreshRate || 30,
    req.params.id,
    req.userId
  );
  
  res.json({ subscription: getSubscriptionById(req.params.id) });
});
```

- [ ] **Step 5: 添加获取路由列表API**

修改routes/subscriptions.ts：

```typescript
// 获取可用路由列表（带标签）
app.get('/routes', authMiddleware, async (req, res) => {
  const ROUTES = [
    { name: '知乎热榜', category: '社交', description: '知乎全站热榜问题', example: '/zhihu/hot' },
    { name: '知乎日报', category: '新闻', description: '知乎日报每日推荐', example: '/zhihu/daily' },
    { name: '阮一峰的网络日志', category: '博客', description: '科技爱好者周刊和技术文章', example: 'https://www.ruanyifeng.com/blog/atom.xml' },
    { name: '36氪', category: '新闻', description: '36氪最新资讯', example: '/36kr/news/latest' },
    { name: '虎嗅网', category: '新闻', description: '虎嗅网最新文章', example: '/huxiu/article' },
    { name: 'B站热门视频', category: '视频', description: 'B站全站热门排行榜', example: '/bilibili/ranking/all' },
    { name: '微博热搜', category: '社交', description: '微博热搜榜实时更新', example: '/weibo/search/hot' },
    { name: 'GitHub Trending', category: '技术', description: 'GitHub每日热门项目', example: '/github/trending/daily' },
  ];
  
  const routesWithTags = ROUTES.map(route => ({
    ...route,
    tags: ROUTE_TAGS[route.example] || []
  }));
  
  res.json({ routes: routesWithTags });
});
```

---

## Task 2: 前端类型定义

**Files:**
- Create: `views/frontend/src/types/subscription.ts`

- [ ] **Step 1: 创建订阅相关类型定义**

```typescript
// 预设标签
export interface Tag {
  id: string;
  name: string;
  icon: string;
}

export const PRESET_TAGS: Tag[] = [
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

// 路由信息（带标签）
export interface Route {
  name: string;
  category: string;
  description: string;
  example: string;
  tags: string[];
}

// 订阅配置
export interface SubscriptionConfig {
  tags: string[];
  filterInclude: string;
  filterExclude: string;
  refreshRate: number;
}

// 订阅（带配置）
export interface Subscription {
  id: number;
  routeUrl: string;
  title: string | null;
  tags: string[];
  filterInclude: string | null;
  filterExclude: string | null;
  refreshRate: number;
  lastSyncTime?: string;
  createdAt: string;
}
```

---

## Task 3: API接口扩展

**Files:**
- Modify: `views/frontend/src/api/index.ts`

- [ ] **Step 1: 添加路由API和更新订阅API**

```typescript
// 获取可用路由列表
export const routeApi = {
  getRoutes: () => http.get<{ routes: Route[] }>('/routes'),
};

// 更新订阅配置
export const subscriptionApi = {
  // ... 现有方法
  
  // 更新订阅
  update: (id: number, data: Partial<SubscriptionConfig>) => 
    http.put(`/subscriptions/${id}`, data),
};
```

---

## Task 4: 标签选择组件

**Files:**
- Create: `views/frontend/src/components/TagSelector.vue`

- [ ] **Step 1: 创建TagSelector组件**

```vue
<template>
  <div class="tag-selector">
    <div class="tag-list">
      <button
        v-for="tag in tags"
        :key="tag.id"
        :class="['tag-btn', { selected: selected.includes(tag.id) }]"
        @click="toggle(tag.id)"
        type="button"
      >
        <span class="tag-icon">{{ tag.icon }}</span>
        <span class="tag-name">{{ tag.name }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PRESET_TAGS, type Tag } from '@/types/subscription';

const props = defineProps<{
  modelValue: string[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void;
}>();

const tags = PRESET_TAGS;

const selected = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

function toggle(tagId: string) {
  const current = [...selected.value];
  const index = current.indexOf(tagId);
  if (index > -1) {
    current.splice(index, 1);
  } else {
    current.push(tagId);
  }
  selected.value = current;
}
</script>

<style scoped>
.tag-selector {
  margin-bottom: var(--space-md);
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.tag-btn {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-white);
  cursor: pointer;
  font-size: 13px;
  transition: all var(--transition-fast);
}

.tag-btn:hover {
  border-color: var(--color-primary);
}

.tag-btn.selected {
  background: var(--color-primary-light);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.tag-icon {
  font-size: 14px;
}

.tag-name {
  font-weight: 500;
}
</style>
```

---

## Task 5: 订阅配置弹窗组件

**Files:**
- Create: `views/frontend/src/components/SubscriptionConfigModal.vue`

- [ ] **Step 1: 创建订阅配置弹窗组件**

```vue
<template>
  <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h3>{{ isEditing ? '编辑订阅配置' : '添加订阅' }}</h3>
        <button @click="$emit('close')" class="btn-close">×</button>
      </div>
      
      <div class="modal-body">
        <!-- 订阅源信息 -->
        <div class="form-group">
          <label>订阅源</label>
          <input
            v-model="config.routeUrl"
            type="text"
            class="form-input"
            :disabled="isEditing"
            placeholder="路由地址或RSS链接"
          />
        </div>
        
        <div class="form-group">
          <label>自定义名称</label>
          <input
            v-model="config.title"
            type="text"
            class="form-input"
            placeholder="留空则使用RSS源标题"
          />
        </div>
        
        <!-- 分类标签 -->
        <div class="form-group">
          <label>分类标签</label>
          <TagSelector v-model="config.tags" />
        </div>
        
        <!-- 刷新频率 -->
        <div class="form-group">
          <label>刷新频率</label>
          <div class="radio-group">
            <label v-for="option in refreshOptions" :key="option.value" class="radio-label">
              <input
                type="radio"
                :value="option.value"
                v-model="config.refreshRate"
              />
              {{ option.label }}
            </label>
          </div>
        </div>
        
        <!-- 包含关键词 -->
        <div class="form-group">
          <label>包含关键词</label>
          <input
            v-model="config.filterInclude"
            type="text"
            class="form-input"
            placeholder="用逗号分隔，如：AI,ChatGPT,GPT-4"
          />
          <small class="form-hint">文章标题或摘要包含这些词才显示</small>
        </div>
        
        <!-- 排除关键词 -->
        <div class="form-group">
          <label>排除关键词</label>
          <input
            v-model="config.filterExclude"
            type="text"
            class="form-input"
            placeholder="用逗号分隔，如：广告,推广"
          />
          <small class="form-hint">包含这些词的文章将被过滤</small>
        </div>
        
        <!-- 预览 -->
        <div v-if="previewLoading" class="preview-loading">预览加载中...</div>
        <div v-else-if="previewResult" class="preview-result">
          <h4>预览 - {{ previewResult.title }}</h4>
          <p class="preview-count">共 {{ previewResult.itemCount }} 篇文章</p>
        </div>
        <div v-if="previewError" class="error-text">{{ previewError }}</div>
      </div>
      
      <div class="modal-footer">
        <button @click="$emit('close')" class="btn btn-ghost">取消</button>
        <button @click="handlePreview" class="btn btn-secondary" :disabled="!config.routeUrl || previewLoading">
          {{ previewLoading ? '加载中...' : '预览' }}
        </button>
        <button @click="handleSubmit" class="btn btn-primary" :disabled="submitting">
          {{ submitting ? '提交中...' : (isEditing ? '保存' : '确认添加') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import { articleApi } from '@/api';
import TagSelector from './TagSelector.vue';

const props = defineProps<{
  visible: boolean;
  initialData?: {
    routeUrl: string;
    title: string;
    tags: string[];
    filterInclude: string;
    filterExclude: string;
    refreshRate: number;
  };
  isEditing?: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit', data: typeof config): void;
}>();

const refreshOptions = [
  { label: '5分钟', value: 5 },
  { label: '15分钟', value: 15 },
  { label: '30分钟', value: 30 },
  { label: '60分钟', value: 60 },
];

const config = reactive({
  routeUrl: '',
  title: '',
  tags: [] as string[],
  filterInclude: '',
  filterExclude: '',
  refreshRate: 30,
});

const previewLoading = ref(false);
const previewResult = ref<any>(null);
const previewError = ref('');
const submitting = ref(false);

// 初始化数据
watch(() => props.visible, (val) => {
  if (val) {
    if (props.initialData) {
      Object.assign(config, props.initialData);
    } else {
      Object.assign(config, {
        routeUrl: '',
        title: '',
        tags: [],
        filterInclude: '',
        filterExclude: '',
        refreshRate: 30,
      });
    }
    previewResult.value = null;
    previewError.value = '';
  }
});

async function handlePreview() {
  if (!config.routeUrl) return;
  previewLoading.value = true;
  previewError.value = '';
  try {
    const res = await articleApi.preview(config.routeUrl);
    previewResult.value = res.data;
  } catch (e: any) {
    previewError.value = e.response?.data?.error?.message || '预览失败';
  } finally {
    previewLoading.value = false;
  }
}

function handleSubmit() {
  if (!config.routeUrl) return;
  submitting.value = true;
  emit('submit', { ...config });
  submitting.value = false;
}
</script>

<style scoped>
/* 复用SubscriptionList.vue中的弹窗样式 */
.radio-group {
  display: flex;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  cursor: pointer;
  font-size: 14px;
}

.form-hint {
  display: block;
  margin-top: var(--space-xs);
  font-size: 12px;
  color: var(--color-text-muted);
}
</style>
```

---

## Task 6: 订阅管理页面集成

**Files:**
- Modify: `views/frontend/src/views/subscriptions/SubscriptionList.vue`

- [ ] **Step 1: 添加导入和更新数据**

在script部分添加：

```typescript
import TagSelector from '@/components/TagSelector.vue';
import SubscriptionConfigModal from '@/components/SubscriptionConfigModal.vue';
import { PRESET_TAGS, type Route } from '@/types/subscription';

// 添加状态
const showConfigModal = ref(false);
const configModalData = ref<any>(null);

// 更新路由数据接口
interface RouteWithTags {
  name: string;
  category: string;
  description: string;
  example: string;
  tags: string[];
}

// 订阅库数据改为从API获取
const routes = ref<RouteWithTags[]>([]);

// 获取路由列表
async function loadRoutes() {
  try {
    const res = await routeApi.getRoutes();
    routes.value = res.data.routes;
  } catch (e) {
    console.error('加载路由失败', e);
  }
}

// 获取标签显示名称
function getTagName(tagId: string): string {
  const tag = PRESET_TAGS.find(t => t.id === tagId);
  return tag?.name || tagId;
}
```

- [ ] **Step 2: 更新订阅库界面**

更新模板中的路由卡片部分：

```vue
<!-- 订阅库 - 分类筛选按钮改为使用预设标签 -->
<div class="categories">
  <button
    v-for="tag in PRESET_TAGS"
    :key="tag.id"
    :class="['category-btn', { active: selectedCategory === tag.id }]"
    @click="selectedCategory = tag.id"
  >
    {{ tag.icon }} {{ tag.name }}
  </button>
</div>

<!-- 路由卡片显示标签 -->
<div v-for="route in filteredRoutes" class="route-card">
  <div class="route-header">
    <h3>{{ route.name }}</h3>
    <div class="route-tags">
      <span v-for="tagId in route.tags" :key="tagId" class="route-tag">
        {{ getTagName(tagId) }}
      </span>
    </div>
  </div>
  <!-- ... -->
  <div class="route-footer">
    <button @click="copyRoute(route)" class="btn btn-secondary btn-sm">复制</button>
    <button
      @click="openConfigModal(route)"
      class="btn btn-primary btn-sm"
    >
      {{ isSubscribed(route.example) ? '已订阅' : '+ 添加订阅' }}
    </button>
  </div>
</div>
```

- [ ] **Step 3: 添加打开配置弹窗方法**

```typescript
function openConfigModal(route: RouteWithTags) {
  if (isSubscribed(route.example)) {
    activeTab.value = 'mine';
    return;
  }
  configModalData.value = {
    routeUrl: route.example,
    title: route.name,
    tags: route.tags,
    filterInclude: '',
    filterExclude: '',
    refreshRate: 30,
  };
  showConfigModal.value = true;
}

async function handleConfigSubmit(data: any) {
  try {
    await store.createSubscription({
      routeUrl: data.routeUrl,
      title: data.title,
      tags: data.tags,
      filterInclude: data.filterInclude,
      filterExclude: data.filterExclude,
      refreshRate: data.refreshRate,
    });
    subscribedRoutes.value.push(data.routeUrl);
    await loadUnreadCount();
    showConfigModal.value = false;
    alert('订阅添加成功！');
  } catch (error: any) {
    const message = error?.response?.data?.error?.message || '添加失败';
    alert(message);
  }
}
```

- [ ] **Step 4: 添加配置弹窗组件**

在模板末尾添加：

```vue
<!-- 订阅配置弹窗 -->
<SubscriptionConfigModal
  :visible="showConfigModal"
  :initial-data="configModalData"
  @close="showConfigModal = false"
  @submit="handleConfigSubmit"
/>
```

- [ ] **Step 5: 更新filteredRoutes逻辑**

```typescript
const filteredRoutes = computed(() => {
  return routes.value.filter((route) => {
    const matchKeyword = keyword.value === '' ||
      route.name.includes(keyword.value) ||
      route.description.includes(keyword.value);
    const matchCategory = selectedCategory.value === '' ||
      route.tags.includes(selectedCategory.value);
    return matchKeyword && matchCategory;
  });
});
```

- [ ] **Step 6: 添加标签样式**

```css
.route-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  margin-top: var(--space-xs);
}

.route-tag {
  font-size: 11px;
  padding: 2px 6px;
  background: var(--color-primary-light);
  color: var(--color-primary);
  border-radius: var(--radius-sm);
}
```

---

## Task 7: 我的订阅页面显示配置

**Files:**
- Modify: `views/frontend/src/views/subscriptions/SubscriptionList.vue`

- [ ] **Step 1: 更新订阅卡片显示标签和配置**

```vue
<!-- 订阅卡片显示标签 -->
<div class="subscription-card" @click="goToArticles(sub.id)">
  <div class="card-header">
    <div class="card-title-wrap">
      <h3>{{ sub.title || sub.routeUrl }}</h3>
      <span v-if="unreadCount.bySubscription[sub.id] > 0" class="unread-badge">
        {{ unreadCount.bySubscription[sub.id] }}
      </span>
    </div>
    <div class="card-actions" @click.stop>
      <button @click="editSubscriptionConfig(sub)" class="btn btn-ghost btn-sm">编辑</button>
      <button @click="deleteSubscription(sub.id)" class="btn btn-ghost btn-sm btn-danger-text">删除</button>
    </div>
  </div>
  <div class="card-body">
    <p class="card-url">{{ sub.routeUrl }}</p>
    
    <!-- 显示标签 -->
    <div v-if="sub.tags && sub.tags.length > 0" class="card-tags">
      <span v-for="tagId in sub.tags" :key="tagId" class="card-tag">
        {{ getTagName(tagId) }}
      </span>
    </div>
    
    <div class="card-meta">
      <span>刷新: {{ sub.refreshRate }}分钟</span>
      <span v-if="sub.lastSyncTime">同步: {{ formatDate(sub.lastSyncTime) }}</span>
    </div>
    
    <!-- 显示筛选关键词 -->
    <div v-if="sub.filterInclude || sub.filterExclude" class="card-filters">
      <span v-if="sub.filterInclude" class="filter-hint">
        含: {{ sub.filterInclude }}
      </span>
      <span v-if="sub.filterExclude" class="filter-hint filter-exclude">
        排: {{ sub.filterExclude }}
      </span>
    </div>
  </div>
</div>
```

- [ ] **Step 2: 添加编辑配置方法**

```typescript
function editSubscriptionConfig(sub: any) {
  configModalData.value = {
    routeUrl: sub.routeUrl,
    title: sub.title || '',
    tags: sub.tags ? JSON.parse(sub.tags) : [],
    filterInclude: sub.filterInclude || '',
    filterExclude: sub.filterExclude || '',
    refreshRate: sub.refreshRate || 30,
  };
  showConfigModal.value = true;
}

async function handleConfigSubmit(data: any) {
  if (configModalData.value && !data.routeUrl) {
    // 编辑模式
    try {
      const subId = subscriptions.value.find(s => s.routeUrl === data.title)?.id;
      if (subId) {
        await store.updateSubscription(subId, data);
        await loadSubscriptions();
        showConfigModal.value = false;
        alert('更新成功');
      }
    } catch (e: any) {
      alert(e.response?.data?.error?.message || '更新失败');
    }
  } else {
    // 新增模式
    // ... 现有逻辑
  }
}
```

- [ ] **Step 3: 添加配置显示样式**

```css
.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  margin-bottom: var(--space-sm);
}

.card-tag {
  font-size: 11px;
  padding: 2px 6px;
  background: var(--color-primary-light);
  color: var(--color-primary);
  border-radius: var(--radius-sm);
}

.card-filters {
  margin-top: var(--space-xs);
  font-size: 12px;
}

.filter-hint {
  color: var(--color-success);
  margin-right: var(--space-sm);
}

.filter-exclude {
  color: var(--color-danger);
}
```

---

## Task 8: 测试验证

- [ ] **Step 1: 重启后端服务**

```bash
cd /Users/liuzhiwei/Desktop/开发部门/个人情报官/views/backend
npm run dev
```

验证数据库迁移成功，日志应显示类似：
```
数据库初始化完成
订阅表字段检查完成
```

- [ ] **Step 2: 重启前端服务**

```bash
cd /Users/liuzhiwei/Desktop/开发部门/个人情报官/views/frontend
npm run dev
```

- [ ] **Step 3: 测试订阅库标签筛选**

1. 打开订阅管理页面
2. 切换到"订阅库"Tab
3. 点击不同标签按钮，验证路由列表是否正确筛选
4. 验证每个路由卡片是否显示对应标签

- [ ] **Step 4: 测试添加订阅配置**

1. 点击路由卡片的"+ 添加订阅"
2. 验证弹窗是否显示完整配置选项
3. 选择几个标签，设置刷新频率和关键词
4. 点击"确认添加"
5. 验证订阅是否添加成功，并显示配置信息

- [ ] **Step 5: 测试编辑订阅配置**

1. 在"我的订阅"Tab
2. 点击订阅卡片的"编辑"
3. 验证弹窗是否加载了现有配置
4. 修改配置并保存
5. 验证配置是否更新

---

## 验收清单

- [ ] 订阅库页面显示预设分类标签筛选
- [ ] 每个订阅路由卡片显示对应标签
- [ ] 点击"添加订阅"弹出完整配置弹窗
- [ ] 配置支持：标签多选、刷新频率、包含/排除关键词
- [ ] 我的订阅页面显示已订阅源的配置信息
- [ ] 编辑功能可修改订阅配置
