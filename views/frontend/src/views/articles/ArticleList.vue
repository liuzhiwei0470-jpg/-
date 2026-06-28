<template>
  <div class="article-list-page">
    <header class="page-header">
      <div class="header-left">
        <h1>全部文章</h1>
        <span v-if="unreadCount.total > 0" class="unread-badge">{{ unreadCount.total }} 未读</span>
      </div>
      <div class="header-right">
        <button @click="handleMarkAllRead" class="btn btn-ghost" :disabled="markingAllRead">
          <CheckCheck :size="16" />
          {{ markingAllRead ? '标记中...' : '全部已读' }}
        </button>
      </div>
    </header>

    <main class="page-main">
      <div class="toolbar">
        <div class="filter-tabs">
          <button
            v-for="tab in filterTabs"
            :key="tab.value"
            :class="['tab-btn', { active: currentFilter === tab.value }]"
            @click="changeFilter(tab.value)"
          >
            {{ tab.label }}
            <span v-if="tab.count !== undefined && tab.count > 0" class="tab-count">{{ tab.count }}</span>
          </button>
        </div>

        <div class="toolbar-right">
          <button @click="toggleBatchMode" class="btn btn-ghost">
            <Layers :size="16" />
            {{ batchMode ? '取消' : '批量管理' }}
          </button>
          <select v-model="sortOrder" class="form-select" @change="loadArticles(1)">
            <option value="newest">最新发布</option>
            <option value="oldest">最早发布</option>
          </select>

          <select v-model="selectedSubscriptionId" class="form-select" @change="loadArticles(1)">
            <option :value="undefined">全部订阅源</option>
            <option v-for="sub in subscriptions" :key="sub.id" :value="sub.id">
              {{ sub.title || sub.routeUrl }}
            </option>
          </select>

          <div class="search-box">
            <Search :size="16" class="search-icon" />
            <input
              v-model="searchQuery"
              type="text"
              class="form-input"
              placeholder="搜索文章..."
            />
            <span v-if="searchLoading" class="search-spinner"></span>
            <button
              v-else-if="searchQuery"
              @click="clearSearch"
              class="search-clear"
              title="清除搜索"
            >
              <X :size="14" />
            </button>
          </div>
        </div>
      </div>

      <div v-if="batchMode && articles.length > 0" class="batch-toolbar">
        <label class="batch-checkbox">
          <input
            type="checkbox"
            :checked="isAllSelected"
            :indeterminate.prop="isIndeterminate"
            @change="toggleSelectAll"
          />
          {{ isAllSelected ? '取消全选' : '全选' }}
        </label>
        <span class="batch-selected">已选 {{ selectedIds.length }} 篇</span>
        <div class="batch-actions">
          <button
            @click="handleBatchDelete"
            class="btn btn-danger btn-sm"
            :disabled="selectedIds.length === 0 || batchDeleting"
          >
            <Trash2 :size="14" />
            {{ batchDeleting ? '删除中...' : '删除' }}
          </button>
          <button
            @click="handleBatchMarkRead"
            class="btn btn-secondary btn-sm"
            :disabled="selectedIds.length === 0"
          >
            <Check :size="14" />
            已读
          </button>
          <button
            @click="handleBatchMarkUnread"
            class="btn btn-ghost btn-sm"
            :disabled="selectedIds.length === 0"
          >
            <Circle :size="14" />
            未读
          </button>
        </div>
      </div>

      <div v-if="loading" class="loading-wrap">
        <span class="spinner"></span>
        <span>加载中...</span>
      </div>

      <div v-else-if="articles.length === 0" class="empty-state">
        <FileText :size="48" class="empty-icon" />
        <h3>暂无文章</h3>
        <p>{{ emptyTip }}</p>
        <router-link to="/subscriptions" class="btn btn-primary">管理订阅</router-link>
      </div>

      <div v-else class="article-list">
        <div
          v-for="(article, idx) in articles"
          :key="article.id"
          :class="['article-item', { unread: !article.isRead, selected: selectedIds.includes(article.id), active: idx === activeIndex }]"
          @click="handleItemClick(article.id)"
        >
          <div v-if="batchMode" class="article-checkbox" @click.stop>
            <input
              type="checkbox"
              :checked="selectedIds.includes(article.id)"
              @change="toggleSelect(article.id)"
            />
          </div>
          <div class="article-main">
            <div class="article-title">{{ article.title }}</div>
            <div v-if="getSnippet(article)" class="article-snippet">
              {{ getSnippet(article) }}
            </div>
            <div class="article-meta">
              <span v-if="article.subscriptionTitle" class="article-source">
                <Tag :size="12" />
                {{ article.subscriptionTitle }}
              </span>
              <span v-if="article.author" class="article-author">
                <User :size="12" />
                {{ article.author }}
              </span>
              <span class="article-date">
                <Clock :size="12" />
                {{ formatRelativeTimeFull(article.published) }}
              </span>
              <span v-if="article.createdAt" class="article-stored">
                <Database :size="12" />
                {{ formatRelativeTimeFull(article.createdAt) }}
              </span>
            </div>
          </div>
          <div class="article-actions" @click.stop>
            <a
              :href="article.link"
              target="_blank"
              class="action-btn"
              title="查看原文"
            >
              <ExternalLink :size="18" />
            </a>
            <button
              @click="toggleFavorite(article)"
              :class="['action-btn', { active: article.isFavorite }]"
              :title="article.isFavorite ? '取消收藏' : '收藏'"
            >
              <Heart :size="18" :fill="article.isFavorite ? 'currentColor' : 'none'" />
            </button>
            <button
              @click="toggleRead(article)"
              class="action-btn"
              :title="article.isRead ? '标记未读' : '标记已读'"
            >
              <CheckCircle v-if="article.isRead" :size="18" />
              <Circle v-else :size="18" />
            </button>
          </div>
        </div>
      </div>

      <div v-if="pagination.totalPages > 1" class="pagination">
        <button
          @click="changePage(pagination.page - 1)"
          :disabled="pagination.page <= 1"
          class="btn btn-ghost"
        >
          <ChevronLeft :size="16" />
          上一页
        </button>
        <span class="page-info">
          第 {{ pagination.page }} / {{ pagination.totalPages }} 页，共 {{ pagination.total }} 篇
        </span>
        <button
          @click="changePage(pagination.page + 1)"
          :disabled="pagination.page >= pagination.totalPages"
          class="btn btn-ghost"
        >
          下一页
          <ChevronRight :size="16" />
        </button>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { articleApi, subscriptionApi, type Article, type Subscription, type UnreadCount } from '@/api';
import { useAuthStore } from '@/stores';
import { formatRelativeTimeFull } from '@/utils/date';
import { useToast } from '@/composables/useToast';
import { useConfirm } from '@/composables/useConfirm';
import {
  CheckCheck,
  Layers,
  Search,
  X,
  Trash2,
  Check,
  Circle,
  FileText,
  Tag,
  User,
  Clock,
  Database,
  Heart,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink
} from 'lucide-vue-next';

const router = useRouter();
const authStore = useAuthStore();
const toast = useToast();
const { confirm } = useConfirm();

const articles = ref<Article[]>([]);
const subscriptions = ref<Subscription[]>([]);
const loading = ref(false);
const markingAllRead = ref(false);
const searchQuery = ref('');
const searchLoading = ref(false);
const selectedSubscriptionId = ref<number | undefined>(undefined);
const currentFilter = ref<'all' | 'unread' | 'read' | 'favorite' | 'shared'>('all');
const sortOrder = ref<'newest' | 'oldest'>('newest');
const unreadCount = ref<UnreadCount>({ total: 0, bySubscription: {} });
const batchMode = ref(false);
const selectedIds = ref<number[]>([]);
const batchDeleting = ref(false);
const activeIndex = ref(0);

const isAllSelected = computed(() => {
  return articles.value.length > 0 && selectedIds.value.length === articles.value.length;
});

const isIndeterminate = computed(() => {
  return selectedIds.value.length > 0 && selectedIds.value.length < articles.value.length;
});

let searchTimer: ReturnType<typeof setTimeout> | null = null;

watch(searchQuery, () => {
  if (searchTimer) {
    clearTimeout(searchTimer);
  }
  searchTimer = setTimeout(() => {
    loadArticles(1);
  }, 300);
});

const pagination = ref({
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
});

const filterTabs = computed(() => [
  { label: '全部', value: 'all' as const },
  { label: '未读', value: 'unread' as const, count: unreadCount.value.total },
  { label: '已读', value: 'read' as const },
  { label: '收藏', value: 'favorite' as const },
  { label: '已分享', value: 'shared' as const },
]);

const emptyTip = computed(() => {
  if (currentFilter.value === 'unread') return '没有未读文章';
  if (currentFilter.value === 'read') return '没有已读文章';
  if (currentFilter.value === 'favorite') return '没有收藏的文章';
  if (currentFilter.value === 'shared') return '还没有生成分享链接的文章';
  if (searchQuery.value) return '没有找到匹配的文章';
  if (selectedSubscriptionId.value) return '该订阅源暂无文章';
  return '添加订阅后即可查看文章';
});

function goToDetail(article: Article) {
  router.push({
    path: `/subscriptions/${article.subscriptionId}/articles/${article.id}`,
    query: { from: 'all-articles' },
  });
}

function handleItemClick(id: number) {
  if (batchMode.value) {
    toggleSelect(id);
  } else {
    goToDetail(articles.value.find(a => a.id === id)!);
  }
}

function toggleBatchMode() {
  batchMode.value = !batchMode.value;
  selectedIds.value = [];
}

function toggleSelect(id: number) {
  const index = selectedIds.value.indexOf(id);
  if (index > -1) {
    selectedIds.value.splice(index, 1);
  } else {
    selectedIds.value.push(id);
  }
}

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedIds.value = [];
  } else {
    selectedIds.value = articles.value.map(a => a.id);
  }
}

async function handleBatchDelete() {
  if (selectedIds.value.length === 0) return;

  const ok = await confirm({
    title: '批量删除',
    message: `确定要删除选中的 ${selectedIds.value.length} 篇文章吗？\n\n删除后无法恢复！`,
    confirmText: '删除',
  });
  if (!ok) return;

  batchDeleting.value = true;
  try {
    await articleApi.batchDelete(selectedIds.value);
    toast.success(`已删除 ${selectedIds.value.length} 篇文章`);
    selectedIds.value = [];
    batchMode.value = false;
    loadArticles(pagination.value.page);
  } catch (e) {
    toast.error('删除失败');
  } finally {
    batchDeleting.value = false;
  }
}

async function handleBatchMarkRead() {
  if (selectedIds.value.length === 0) return;

  try {
    await articleApi.batchMarkAsRead(selectedIds.value, true);
    toast.success(`已标记 ${selectedIds.value.length} 篇为已读`);
    selectedIds.value = [];
    batchMode.value = false;
    loadArticles(pagination.value.page);
  } catch (e) {
    toast.error('操作失败');
  }
}

async function handleBatchMarkUnread() {
  if (selectedIds.value.length === 0) return;

  try {
    await articleApi.batchMarkAsRead(selectedIds.value, false);
    toast.success(`已标记 ${selectedIds.value.length} 篇为未读`);
    selectedIds.value = [];
    batchMode.value = false;
    loadArticles(pagination.value.page);
  } catch (e) {
    toast.error('操作失败');
  }
}

function getSnippet(article: Article): string {
  if (article.contentSnippet && article.contentSnippet.trim()) {
    return stripHtml(article.contentSnippet);
  }
  if (article.content) {
    const text = stripHtml(article.content);
    return text.slice(0, 150);
  }
  return '';
}

function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

function handleLogout() {
  authStore.logout();
  router.push('/login');
}

async function loadSubscriptions() {
  try {
    const res = await subscriptionApi.list({ limit: 100 });
    subscriptions.value = res.data.list;
  } catch (e) {
    console.error('加载订阅列表失败', e);
  }
}

async function loadUnreadCount() {
  try {
    const res = await articleApi.getUnreadCount();
    unreadCount.value = res.data;
  } catch (e) {
    console.error('加载未读计数失败', e);
  }
}

async function loadArticles(page: number = 1) {
  loading.value = true;
  if (searchQuery.value.trim()) {
    searchLoading.value = true;
  }
  pagination.value.page = page;
  try {
    const params: any = {
      page: pagination.value.page,
      limit: pagination.value.limit,
      sort: sortOrder.value,
    };
    if (currentFilter.value === 'unread') params.isRead = false;
    if (currentFilter.value === 'read') params.isRead = true;
    if (currentFilter.value === 'favorite') params.isFavorite = true;
    if (currentFilter.value === 'shared') params.hasShareToken = true;
    if (selectedSubscriptionId.value) params.subscriptionId = selectedSubscriptionId.value;
    if (searchQuery.value.trim()) params.search = searchQuery.value.trim();

    const res = await articleApi.all(params);
    articles.value = res.data.list;
    pagination.value = res.data.pagination;
  } catch (e) {
    console.error('加载文章失败', e);
  } finally {
    loading.value = false;
    searchLoading.value = false;
  }
}

function clearSearch() {
  searchQuery.value = '';
}

function changeFilter(filter: 'all' | 'unread' | 'read' | 'favorite' | 'shared') {
  currentFilter.value = filter;
  loadArticles(1);
}

function changePage(page: number) {
  loadArticles(page);
}

async function toggleFavorite(article: Article) {
  try {
    await articleApi.toggleFavorite(article.id);
    article.isFavorite = !article.isFavorite;
  } catch (e) {
    console.error('操作失败', e);
  }
}

async function toggleRead(article: Article) {
  try {
    await articleApi.markAsRead(article.id, !article.isRead);
    article.isRead = !article.isRead;
    if (article.isRead) {
      unreadCount.value.total = Math.max(0, unreadCount.value.total - 1);
    } else {
      unreadCount.value.total += 1;
    }
  } catch (e) {
    console.error('操作失败', e);
  }
}

async function handleMarkAllRead() {
  const ok = await confirm({
    title: '标记全部已读',
    message: '确定要将所有文章标记为已读吗？',
    confirmText: '全部已读',
  });
  if (!ok) return;
  markingAllRead.value = true;
  try {
    await articleApi.markAllAsReadGlobal();
    articles.value.forEach(a => a.isRead = true);
    unreadCount.value.total = 0;
    Object.keys(unreadCount.value.bySubscription).forEach(k => {
      unreadCount.value.bySubscription[parseInt(k)] = 0;
    });
  } catch (e) {
    console.error('标记失败', e);
  } finally {
    markingAllRead.value = false;
  }
}

onMounted(() => {
  loadSubscriptions();
  loadUnreadCount();
  loadArticles(1);
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  if (searchTimer) {
    clearTimeout(searchTimer);
  }
  window.removeEventListener('keydown', handleKeydown);
});

function handleKeydown(e: KeyboardEvent) {
  const target = e.target as HTMLElement;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable) {
    if (e.key === 'Escape') {
      (target as HTMLElement).blur();
    }
    return;
  }

  if (e.key === 'j' || e.key === 'ArrowDown') {
    e.preventDefault();
    if (activeIndex.value < articles.value.length - 1) {
      activeIndex.value++;
      scrollToActive();
    }
  } else if (e.key === 'k' || e.key === 'ArrowUp') {
    e.preventDefault();
    if (activeIndex.value > 0) {
      activeIndex.value--;
      scrollToActive();
    }
  } else if (e.key === 'Enter') {
    if (articles.value[activeIndex.value]) {
      handleItemClick(articles.value[activeIndex.value].id);
    }
  } else if (e.key === 'r' || e.key === 'R') {
    loadArticles(1);
  } else if (e.key === 's' || e.key === 'S') {
    if (articles.value[activeIndex.value]) {
      toggleFavorite(articles.value[activeIndex.value]);
    }
  } else if (e.key === 'm' || e.key === 'M') {
    if (articles.value[activeIndex.value]) {
      toggleRead(articles.value[activeIndex.value]);
    }
  } else if (e.key === '/') {
    e.preventDefault();
    const searchInput = document.querySelector('.search-box input') as HTMLInputElement;
    if (searchInput) searchInput.focus();
  } else if (e.key === 'Escape') {
    activeIndex.value = 0;
  } else if (e.key === 'g' || e.key === 'G') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    activeIndex.value = 0;
  }
}

function scrollToActive() {
  const items = document.querySelectorAll('.article-item');
  const item = items[activeIndex.value] as HTMLElement;
  if (item) {
    const rect = item.getBoundingClientRect();
    const headerHeight = 120;
    if (rect.top < headerHeight || rect.bottom > window.innerHeight - 20) {
      item.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}
</script>

<style scoped>
.article-list-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  background: var(--color-white);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  min-width: 0;
}

.header-left h1 {
  font-size: 17px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.unread-badge {
  background: var(--color-primary);
  color: white;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.header-right {
  display: flex;
  gap: var(--space-sm);
  flex-shrink: 0;
}

.page-main {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px 20px;
  min-width: 0;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  flex-wrap: wrap;
  gap: 10px;
  min-width: 0;
}

.filter-tabs {
  display: flex;
  gap: 2px;
  background: var(--color-bg);
  padding: 3px;
  border-radius: var(--radius-md);
  flex-shrink: 0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.filter-tabs::-webkit-scrollbar {
  display: none;
}

.tab-btn {
  padding: 5px 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  transition: all var(--transition-fast);
  white-space: nowrap;
  flex-shrink: 0;
}

.tab-btn:hover {
  color: var(--color-text-primary);
}

.tab-btn.active {
  background: var(--color-white);
  color: var(--color-primary);
  font-weight: 500;
}

.tab-count {
  background: var(--color-primary-light);
  color: var(--color-primary);
  padding: 1px 6px;
  border-radius: 10px;
  font-size: 11px;
}

.tab-btn.active .tab-count {
  background: var(--color-primary);
  color: white;
}

.toolbar-right {
  display: flex;
  gap: var(--space-sm);
  align-items: center;
  flex-wrap: wrap;
  flex: 1;
  justify-content: flex-end;
  min-width: 0;
}

.form-select {
  padding: 5px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 13px;
  background: var(--color-white);
  cursor: pointer;
  color: var(--color-text-primary);
  flex-shrink: 0;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.search-icon {
  position: absolute;
  left: 10px;
  color: var(--color-text-muted);
  pointer-events: none;
}

.search-box .form-input {
  width: 180px;
  padding: 6px 10px;
  padding-left: 30px;
  padding-right: 28px;
  font-size: 13px;
  height: 32px;
}

.search-spinner {
  position: absolute;
  right: 10px;
  width: 12px;
  height: 12px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.search-clear {
  position: absolute;
  right: 8px;
  width: 18px;
  height: 18px;
  border: none;
  background: var(--color-border);
  color: var(--color-text-secondary);
  border-radius: 50%;
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: all 0.2s;
}

.search-clear:hover {
  background: var(--color-text-secondary);
  color: var(--color-white);
}

.loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  padding: var(--space-2xl);
  color: var(--color-text-secondary);
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: var(--space-2xl);
  background: var(--color-white);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
}

.empty-icon {
  color: var(--color-text-muted);
  margin-bottom: var(--space-md);
}

.empty-state h3 {
  margin-bottom: var(--space-sm);
  color: var(--color-text-primary);
}

.empty-state p {
  color: var(--color-text-secondary);
  margin-bottom: var(--space-lg);
}

.article-list {
  background: var(--color-white);
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--color-border);
}

.article-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border-light);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.article-item:last-child {
  border-bottom: none;
}

.article-item:hover {
  background-color: var(--color-bg);
}

.article-item.active {
  background-color: var(--color-primary-light);
  border-left: 3px solid var(--color-primary);
}

.article-item.unread {
  background-color: #FAFBFC;
}

.article-item.selected {
  background: var(--color-primary-light);
}

.article-checkbox {
  display: flex;
  align-items: center;
  padding-right: var(--space-md);
}

.article-checkbox input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: var(--color-primary);
}

.article-main {
  flex: 1;
  min-width: 0;
}

.article-title {
  font-size: 14px;
  font-weight: 400;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.4;
}

.article-item.unread .article-title {
  font-weight: 600;
  color: var(--color-text-primary);
}

.article-snippet {
  font-size: 13px;
  color: var(--color-text-muted);
  line-height: 1.6;
  margin-bottom: 6px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-meta {
  font-size: 12px;
  color: var(--color-text-muted);
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.article-meta > span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.article-source {
  color: var(--color-primary);
  font-weight: 500;
}

.article-stored {
  opacity: 0.7;
}

.article-actions {
  display: flex;
  gap: 2px;
  margin-left: var(--space-md);
  flex-shrink: 0;
  opacity: 1;
}

.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-muted);
  padding: 6px;
  transition: color var(--transition-fast);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn:hover {
  color: var(--color-primary);
  background: var(--color-bg);
}

.action-btn.active {
  color: var(--color-error);
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--space-md);
  margin-top: 16px;
}

.page-info {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.batch-toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: 10px 14px;
  background: var(--color-primary-light);
  border-radius: var(--radius-md);
  margin-bottom: 12px;
}

.batch-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--color-text-primary);
  cursor: pointer;
}

.batch-checkbox input[type="checkbox"] {
  cursor: pointer;
  width: 15px;
  height: 15px;
  accent-color: var(--color-primary);
}

.batch-selected {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.batch-actions {
  margin-left: auto;
  display: flex;
  gap: var(--space-sm);
}

.btn-sm {
  padding: 5px 12px;
  font-size: 13px;
  height: 30px;
}

@media (max-width: 768px) {
  .page-main {
    padding: 12px 16px;
  }

  .page-header {
    padding: 12px 16px;
  }

  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-tabs {
    overflow-x: auto;
  }

  .toolbar-right {
    flex-wrap: wrap;
    justify-content: flex-start;
  }

  .search-box {
    flex: 1;
    min-width: 0;
  }

  .search-box .form-input {
    width: 100%;
  }

  .article-actions {
    opacity: 1;
  }
}
</style>
