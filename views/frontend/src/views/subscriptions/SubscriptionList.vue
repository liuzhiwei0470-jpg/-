<template>
  <div class="subscriptions-page">
    <header class="page-header">
      <div class="container">
        <div class="page-header-inner">
          <div class="tabs">
            <button
              :class="['tab-btn', { active: activeTab === 'mine' }]"
              @click="activeTab = 'mine'"
            >
              我的订阅
              <span v-if="unreadCount.total > 0" class="tab-badge">{{ unreadCount.total }}</span>
            </button>
            <button
              :class="['tab-btn', { active: activeTab === 'library' }]"
              @click="activeTab = 'library'"
            >
              订阅库
            </button>
          </div>
          <div class="header-actions">
            <button v-if="activeTab === 'mine'" @click="openManualAdd" class="btn btn-primary">
              + 手动添加
            </button>
            <button v-if="activeTab === 'library'" @click="showTutorial = true" class="btn btn-ghost">
              <BookOpen :size="16" />
              使用教程
            </button>
          </div>
        </div>
      </div>
    </header>

    <main class="page-main">
      <div class="container">
        <!-- 我的订阅 -->
        <div v-if="activeTab === 'mine'">
          <div v-if="loading" class="loading-wrap">
            <span class="spinner"></span>
            <span>加载中...</span>
          </div>

          <div v-else-if="error" class="empty-state">
            <p>{{ error }}</p>
            <button @click="loadSubscriptions" class="btn btn-primary">重试</button>
          </div>

          <div v-else-if="subscriptions.length === 0" class="empty-state">
            <div class="empty-icon"><Inbox :size="48" /></div>
            <h3>还没有订阅</h3>
            <p>去"订阅库"看看，或者手动添加订阅源</p>
            <div class="empty-actions">
              <button @click="activeTab = 'library'" class="btn btn-primary">浏览订阅库</button>
              <button @click="openManualAdd" class="btn btn-secondary">手动添加</button>
            </div>
          </div>

          <div v-else class="subscription-grid">
            <div
              v-for="sub in subscriptions"
              :key="sub.id"
              class="subscription-card"
              @click="goToArticles(sub.id)"
            >
              <div class="card-header">
                <div class="card-title-wrap">
                  <h3>{{ sub.title || sub.routeUrl }}</h3>
                  <span class="unread-badge">
                    {{ unreadCount.bySubscription[sub.id] || 0 }}/{{ sub.articleCount || 0 }}
                  </span>
                </div>
                <div class="card-actions" @click.stop>
                  <button @click="editSubscription(sub)" class="btn btn-ghost btn-sm">编辑</button>
                  <button @click="deleteSubscription(sub.id)" class="btn btn-ghost btn-sm btn-danger-text">删除</button>
                </div>
              </div>
              <div class="card-body">
                <div class="card-meta">
                  <span>刷新: {{ formatInterval(sub.refreshInterval) }}</span>
                </div>
                <div class="card-detail-row" @click.stop>
                  <span class="detail-label" @click="toggleCardDetail(sub.id)">
                    {{ expandedCards.includes(sub.id) ? '收起配置' : '查看配置' }}
                  </span>
                  <span class="detail-divider">·</span>
                  <span class="detail-label" @click="goToArticles(sub.id)">
                    查看文章 →
                  </span>
                </div>
                <div v-if="expandedCards.includes(sub.id)" class="card-detail-content">
                  <p class="card-url">{{ sub.routeUrl }}</p>
                  <div v-if="sub.filterInclude || sub.filterExclude" class="card-filters">
                    <span v-if="sub.filterInclude" class="filter-include">
                      包含: {{ sub.filterInclude }}
                    </span>
                    <span v-if="sub.filterExclude" class="filter-exclude">
                      排除: {{ sub.filterExclude }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 订阅库 -->
        <div v-if="activeTab === 'library'" class="library-container">
          <!-- 左侧分类侧边栏 -->
          <div class="library-sidebar">
            <div class="sidebar-title">分类导航</div>
            <div class="category-list">
              <button
                :class="['category-item', { active: selectedCategory === '' }]"
                @click="selectedCategory = ''"
              >
                <span class="category-icon"><Layers :size="16" /></span>
                <span class="category-name">全部分类</span>
                <span class="category-count">{{ totalCount }}</span>
              </button>
              <button
                v-for="cat in categoryList"
                :key="cat.name"
                :class="['category-item', { active: selectedCategory === cat.name }]"
                @click="selectedCategory = cat.name"
              >
                <span class="category-icon"><component :is="getCategoryIcon(cat.name)" :size="16" /></span>
                <span class="category-name">{{ cat.name }}</span>
                <span class="category-count">{{ cat.count }}</span>
              </button>
            </div>
          </div>

          <!-- 右侧内容区 -->
          <div class="library-content">
            <div class="library-header">
              <div class="library-search">
                <div class="search-input-wrapper">
                  <Search :size="16" class="search-input-icon" />
                  <input
                    v-model="keyword"
                    type="text"
                    class="form-input search-input"
                    placeholder="搜索订阅源名称或描述..."
                  />
                </div>
              </div>
              <div class="library-stats">
                共 <strong>{{ filteredRoutes.length }}</strong> 个订阅源
              </div>
            </div>

            <div class="routes-by-category">
              <div
                v-for="group in groupedRoutes"
                :key="group.category"
                class="category-section"
              >
                <div class="category-section-header">
                  <span class="section-icon"><component :is="getCategoryIcon(group.category)" :size="16" /></span>
                  <h3 class="section-title">{{ group.category }}</h3>
                  <span class="section-count">{{ group.routes.length }} 个</span>
                </div>
                <div class="routes-grid">
                  <div v-for="route in group.routes" :key="route.name" class="route-card">
                    <div class="route-header">
                      <h3>{{ route.name }}</h3>
                    </div>
                    <div class="route-body">
                      <p class="route-description">{{ route.description }}</p>
                      <div class="route-example">
                        <code>{{ route.example }}</code>
                      </div>
                    </div>
                    <div class="route-footer">
                      <button
                        @click="openConfigModal(route)"
                        :class="['btn', isSubscribed(route.example) ? 'btn-ghost' : 'btn-primary', 'btn-sm']"
                      >
                        {{ isSubscribed(route.example) ? '✓ 已订阅' : '+ 添加订阅' }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="filteredRoutes.length === 0" class="empty-library">
              <p>🔍 没有找到匹配的订阅源</p>
              <p class="empty-hint">换个关键词试试</p>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 订阅配置弹窗 -->
    <SubscriptionConfigModal
      :visible="showConfigModal"
      :initial-data="configModalData"
      :is-editing="!!configEditingId"
      :editing-id="configEditingId"
      @close="closeConfigModal"
      @submit="handleConfigSubmit"
    />

    <!-- 添加订阅教程 -->
    <AddSubscriptionTutorial
      :visible="showTutorial"
      @close="showTutorial = false"
      @complete="onTutorialComplete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useSubscriptionStore, type Subscription } from '@/stores/subscription';
import { articleApi, subscriptionApi, routeApi, type UnreadCount, type Route } from '@/api';
import { useAuthStore } from '@/stores';
import { PRESET_TAGS, DEFAULT_REFRESH_INTERVAL, REFRESH_INTERVAL_OPTIONS } from '@/types/subscription';
import SubscriptionConfigModal from '@/components/SubscriptionConfigModal.vue';
import AddSubscriptionTutorial from '@/components/AddSubscriptionTutorial.vue';
import { useToast } from '@/composables/useToast';
import { useConfirm } from '@/composables/useConfirm';
import {
  Plus,
  BookOpen,
  Inbox,
  Layers,
  Newspaper,
  TrendingUp,
  Monitor,
  Gamepad2,
  Briefcase,
  Microscope,
  Palette,
  Zap,
  Globe2,
  Search,
  Tv2
} from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();
const store = useSubscriptionStore();
const authStore = useAuthStore();

const toast = useToast();
const { confirm } = useConfirm();

const subscriptions = ref<Subscription[]>([]);
const unreadCount = ref<UnreadCount>({ total: 0, bySubscription: {} });
const loading = ref(false);
const error = ref('');
const activeTab = ref<'mine' | 'library'>('mine');
const expandedCards = ref<number[]>([]);

function syncTabFromQuery() {
  if (route.query.tab === 'library') {
    activeTab.value = 'library';
  } else {
    activeTab.value = 'mine';
  }
}

syncTabFromQuery();

watch(() => route.query.tab, () => {
  syncTabFromQuery();
});

watch(activeTab, (val) => {
  router.replace({ query: { ...route.query, tab: val } });
});

// 订阅库相关
const keyword = ref('');
const selectedCategory = ref('');
const subscribedRoutes = ref<string[]>([]);

// 订阅库数据
const routes = ref<Route[]>([]);

const CATEGORY_ICONS: Record<string, any> = {
  '科技资讯': Newspaper,
  '财经商业': Briefcase,
  '社区热榜': TrendingUp,
  '技术开发': Monitor,
  '阅读文化': BookOpen,
  '生活方式': Zap,
  '游戏娱乐': Gamepad2,
  '设计创意': Palette,
  '科学探索': Microscope,
  '全球视野': Globe2,
  '视频播客': Tv2,
};

function getCategoryIcon(category: string): any {
  return CATEGORY_ICONS[category] || Layers;
}

const filteredRoutes = computed(() => {
  return routes.value.filter((r) => {
    const matchKeyword = keyword.value === '' ||
      r.name.includes(keyword.value) ||
      r.description.includes(keyword.value);
    const matchCategory = selectedCategory.value === '' ||
      r.category === selectedCategory.value;
    return matchKeyword && matchCategory;
  });
});

const totalCount = computed(() => routes.value.length);

const categoryList = computed(() => {
  const map = new Map<string, number>();
  for (const r of routes.value) {
    map.set(r.category, (map.get(r.category) || 0) + 1);
  }
  return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
});

const groupedRoutes = computed(() => {
  const map = new Map<string, Route[]>();
  for (const r of filteredRoutes.value) {
    if (!map.has(r.category)) {
      map.set(r.category, []);
    }
    map.get(r.category)!.push(r);
  }
  return Array.from(map.entries()).map(([category, routes]) => ({ category, routes }));
});

// 配置弹窗相关
const showConfigModal = ref(false);
const configModalData = ref<any>(null);
const configEditingId = ref<number | null>(null);

// 教程相关
const showTutorial = ref(false);

function onTutorialComplete() {
  toast.success('教程完成！开始你的RSS阅读之旅吧~');
}

function handleLogout() {
  authStore.logout();
  router.push('/login');
}

function goToArticles(id: number) {
  router.push(`/subscriptions/${id}`);
}

async function loadSubscriptions() {
  loading.value = true;
  error.value = '';
  try {
    await store.fetchSubscriptions();
    subscriptions.value = store.subscriptions;
    await loadUnreadCount();
    subscribedRoutes.value = subscriptions.value.map(s => s.routeUrl);
  } catch (e: any) {
    error.value = e.response?.data?.error?.message || '加载失败，请刷新重试';
  } finally {
    loading.value = false;
  }
}

async function loadRoutes() {
  try {
    const res = await routeApi.getRoutes();
    routes.value = res.data.routes;
  } catch (e) {
    console.error('加载路由失败', e);
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

function isSubscribed(routeUrl: string) {
  return subscribedRoutes.value.includes(routeUrl);
}

function toggleCardDetail(id: number) {
  const index = expandedCards.value.indexOf(id);
  if (index > -1) {
    expandedCards.value.splice(index, 1);
  } else {
    expandedCards.value.push(id);
  }
}

// 打开配置弹窗 - 从订阅库添加
function openConfigModal(route: Route) {
  if (isSubscribed(route.example)) {
    activeTab.value = 'mine';
    return;
  }
  configModalData.value = {
    routeUrl: route.example,
    title: route.name,
    filterInclude: '',
    filterExclude: '',
    refreshInterval: DEFAULT_REFRESH_INTERVAL,
  };
  configEditingId.value = null;
  showConfigModal.value = true;
}

// 打开配置弹窗 - 手动添加
function openManualAdd() {
  configModalData.value = null;
  configEditingId.value = null;
  showConfigModal.value = true;
}

// 打开配置弹窗 - 编辑已有订阅
function editSubscription(sub: Subscription) {
  configModalData.value = {
    routeUrl: sub.routeUrl,
    title: sub.title || '',
    filterInclude: sub.filterInclude || '',
    filterExclude: sub.filterExclude || '',
    refreshInterval: sub.refreshInterval ?? DEFAULT_REFRESH_INTERVAL,
  };
  configEditingId.value = sub.id;
  showConfigModal.value = true;
}

async function deleteSubscription(id: number) {
  const ok = await confirm({
    title: '删除订阅',
    message: '确定要删除这个订阅吗？相关文章也会被删除。',
    type: 'danger',
    confirmText: '删除',
  });
  if (!ok) return;
  try {
    await store.deleteSubscription(id);
    subscriptions.value = subscriptions.value.filter(s => s.id !== id);
    await loadUnreadCount();
  } catch (e: any) {
    toast.error(e.response?.data?.error?.message || '删除失败');
  }
}

function closeConfigModal() {
  showConfigModal.value = false;
  configModalData.value = null;
  configEditingId.value = null;
}

async function handleConfigSubmit(data: any) {
  try {
    if (data.id) {
      // 更新订阅
      await store.updateSubscription(data.id, {
        filterInclude: data.filterInclude,
        filterExclude: data.filterExclude,
        refreshInterval: data.refreshInterval,
      });
      toast.success('更新成功');
    } else {
      // 创建订阅
      await store.createSubscription({
        routeUrl: data.routeUrl,
        title: data.title,
        filterInclude: data.filterInclude,
        filterExclude: data.filterExclude,
        refreshInterval: data.refreshInterval,
      });
      subscribedRoutes.value.push(data.routeUrl);
      await loadUnreadCount();
      toast.success('订阅添加成功！');
    }
    await loadSubscriptions();
    closeConfigModal();
  } catch (e: any) {
    toast.error(e.response?.data?.error?.message || '操作失败');
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatInterval(minutes: number): string {
  const opt = REFRESH_INTERVAL_OPTIONS.find(o => o.value === minutes);
  return opt?.label || `${minutes}分钟`;
}

onMounted(() => {
  loadSubscriptions();
  loadRoutes();
});
</script>

<style scoped>
.subscription-list-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;
}

.page-header {
  background: var(--color-white);
  border-bottom: 1px solid var(--color-border);
  padding: 14px 20px;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 50;
}

.page-header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tabs {
  display: flex;
  gap: 2px;
  background: var(--color-bg);
  padding: 3px;
  border-radius: var(--radius-md);
}

.tab-btn {
  padding: 5px 14px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.tab-btn:hover {
  color: var(--color-text-primary);
}

.tab-btn.active {
  background: var(--color-white);
  color: var(--color-primary);
}

.tab-badge {
  background: var(--color-bg);
  color: var(--color-text-secondary);
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  min-width: 18px;
  text-align: center;
}

.tab-btn.active .tab-badge {
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.page-main {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px 20px;
  min-width: 0;
}

.loading {
  text-align: center;
  padding: var(--space-xl);
  color: var(--color-text-secondary);
}

.empty-state {
  text-align: center;
  padding: var(--space-2xl);
  background: var(--color-white);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: var(--space-md);
}

.empty-state h3 {
  margin-bottom: var(--space-sm);
}

.empty-state p {
  color: var(--color-text-secondary);
  margin-bottom: var(--space-lg);
}

.empty-actions {
  display: flex;
  gap: var(--space-sm);
  justify-content: center;
}

.subscription-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 14px;
}

.subscription-card {
  background: var(--color-white);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: border-color 0.2s;
}

.subscription-card:hover {
  border-color: var(--color-primary);
}

.subscription-card .card-header {
  padding: 14px 16px;
  border-bottom: 1px solid var(--color-border-light);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-md);
}

.card-title-wrap {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
}

.unread-badge {
  background: var(--color-primary);
  color: white;
  font-size: 11px;
  padding: 1px 7px;
  border-radius: 10px;
  font-weight: 500;
  min-width: 18px;
  text-align: center;
  flex-shrink: 0;
}

.subscription-card .card-header h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-body {
  padding: 14px 16px;
}

.card-url {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-bottom: 8px;
  font-family: monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-meta {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.card-detail-row {
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.detail-label {
  font-size: 12px;
  color: var(--color-primary);
  cursor: pointer;
  text-decoration: underline;
}

.detail-divider {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.card-detail-content {
  margin-top: var(--space-sm);
  padding-top: var(--space-sm);
  border-top: 1px solid var(--color-border);
}

.card-filters {
  margin-top: var(--space-xs);
  font-size: 11px;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.filter-include {
  color: var(--color-success);
}

.filter-exclude {
  color: var(--color-danger);
}

.btn-danger-text {
  color: var(--color-error) !important;
}

/* 订阅库样式 */
.library-container {
  display: flex;
  gap: 16px;
  min-height: 500px;
}

.library-sidebar {
  width: 200px;
  flex-shrink: 0;
  background: var(--color-white);
  border-radius: var(--radius-lg);
  padding: 14px;
  border: 1px solid var(--color-border);
  height: fit-content;
  position: sticky;
  top: 16px;
}

.sidebar-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-muted);
  margin-bottom: 10px;
  padding: 0 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  border: none;
  background: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  text-align: left;
  font-size: 13px;
  color: var(--color-text-primary);
  transition: all var(--transition-fast);
}

.category-item:hover {
  background: var(--color-bg);
}

.category-item.active {
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: 500;
}

.category-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.category-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-count {
  font-size: 11px;
  color: var(--color-text-muted);
  background: var(--color-bg);
  padding: 1px 7px;
  border-radius: 10px;
  flex-shrink: 0;
}

.category-item.active .category-count {
  background: var(--color-primary);
  color: var(--color-white);
}

.library-content {
  flex: 1;
  min-width: 0;
}

.library-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  gap: var(--space-md);
}

.library-search {
  flex: 1;
  max-width: 360px;
}

.search-input-wrapper {
  position: relative;
}

.search-input-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-muted);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding-left: 36px !important;
}

.library-stats {
  font-size: 13px;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.library-stats strong {
  color: var(--color-primary);
  font-size: 15px;
}

.routes-by-category {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.category-section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-border);
}

.section-icon {
  width: 18px;
  height: 18px;
  color: var(--color-primary);
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.section-count {
  font-size: 12px;
  color: var(--color-text-muted);
  background: var(--color-bg);
  padding: 2px 9px;
  border-radius: 10px;
  margin-left: 4px;
}

.routes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}

.route-card {
  background: var(--color-white);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  overflow: hidden;
  transition: border-color var(--transition-fast);
}

.route-card:hover {
  border-color: var(--color-primary);
}

.route-header {
  padding: 12px 14px;
  border-bottom: 1px solid var(--color-border-light);
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.route-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.route-body {
  padding: 12px 14px;
}

.route-description {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.route-example code {
  display: block;
  padding: 6px 8px;
  background: var(--color-bg);
  border-radius: var(--radius-sm);
  font-size: 11px;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.route-footer {
  padding: 10px 14px;
  border-top: 1px solid var(--color-border-light);
  display: flex;
  gap: var(--space-sm);
  justify-content: flex-end;
}

.empty-library {
  text-align: center;
  padding: var(--space-2xl);
  color: var(--color-text-secondary);
}

.empty-library p {
  margin: var(--space-sm) 0;
}

.empty-library .empty-hint {
  font-size: 13px;
  color: var(--color-text-tertiary);
}

/* 响应式 */
@media (max-width: 900px) {
  .library-container {
    flex-direction: column;
  }

  .library-sidebar {
    width: 100%;
    position: static;
  }

  .category-list {
    flex-direction: row;
    overflow-x: auto;
    flex-wrap: wrap;
  }

  .category-item {
    flex-shrink: 0;
  }
}

@media (max-width: 768px) {
  .page-header {
    padding: 12px 16px;
  }

  .page-main {
    padding: 12px 16px;
  }

  .subscription-grid {
    grid-template-columns: 1fr;
  }

  .routes-grid {
    grid-template-columns: 1fr;
  }
}
</style>
