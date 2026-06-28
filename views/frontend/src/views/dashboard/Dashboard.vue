<template>
  <div class="dashboard-page">
    <!-- 顶部欢迎区 -->
    <section class="welcome-section">
      <div class="welcome-bg"></div>
      <div class="welcome-content">
        <div class="welcome-left">
          <h2>你好，{{ displayName }}</h2>
          <p>今天有 <strong>{{ stats.unread }}</strong> 篇未读文章等你阅读</p>
        </div>
        <div class="welcome-right">
          <router-link to="/articles" class="btn btn-light">
            <FileText :size="18" />
            查看全部文章
          </router-link>
        </div>
      </div>
    </section>

    <!-- 数据概览 -->
    <section class="stats-section">
      <div class="section-header">
        <h3>数据概览</h3>
        <span class="section-sub">共 {{ stats.subscriptions }} 个订阅源</span>
      </div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon stat-icon-blue">
            <FileText :size="22" />
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.total }}</div>
            <div class="stat-label">文章总数</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon stat-icon-green">
            <BookOpen :size="22" />
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.unread }}</div>
            <div class="stat-label">未读文章</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon stat-icon-orange">
            <Heart :size="22" />
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.favorites }}</div>
            <div class="stat-label">已收藏</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon stat-icon-purple">
            <FileSymlink :size="22" />
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.shared }}</div>
            <div class="stat-label">已分享</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon stat-icon-blue-light">
            <Package :size="22" />
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.subscriptions }}</div>
            <div class="stat-label">订阅数量</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon stat-icon-teal">
            <TrendingUp :size="22" />
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ readRate }}%</div>
            <div class="stat-label">阅读完成率</div>
          </div>
        </div>
      </div>
    </section>

    <div class="content-grid">
      <!-- 近7天趋势 -->
      <section class="chart-section">
        <div class="section-header">
          <h3>近7天新增</h3>
        </div>
        <div ref="weeklyChartRef" class="chart-container"></div>
      </section>

      <!-- 订阅源分布 -->
      <section class="chart-section">
        <div class="section-header">
          <h3>订阅源分布</h3>
        </div>
        <div ref="subscriptionChartRef" class="chart-container"></div>
      </section>
    </div>

    <!-- 快捷操作 & 最近订阅 -->
    <div class="bottom-grid">
      <section class="panel-section">
        <div class="section-header">
          <h3>快捷操作</h3>
        </div>
        <div class="action-list">
          <router-link to="/subscriptions" class="action-item">
            <div class="action-icon">
              <Package :size="20" />
            </div>
            <div class="action-body">
              <div class="action-title">订阅管理</div>
              <div class="action-desc">添加、编辑、删除订阅</div>
            </div>
            <ChevronRight :size="18" class="action-arrow" />
          </router-link>
          <router-link to="/routes" class="action-item">
            <div class="action-icon">
              <Search :size="20" />
            </div>
            <div class="action-body">
              <div class="action-title">订阅库</div>
              <div class="action-desc">浏览所有可用订阅源</div>
            </div>
            <ChevronRight :size="18" class="action-arrow" />
          </router-link>
          <router-link to="/settings" class="action-item">
            <div class="action-icon">
              <Settings :size="20" />
            </div>
            <div class="action-body">
              <div class="action-title">设置</div>
              <div class="action-desc">自动清理、数据管理</div>
            </div>
            <ChevronRight :size="18" class="action-arrow" />
          </router-link>
        </div>
      </section>

      <section class="panel-section">
        <div class="section-header">
          <h3>订阅源排行</h3>
          <router-link to="/subscriptions" class="section-link">查看全部</router-link>
        </div>
        <div class="ranking-list">
          <div v-if="topSubscriptions.length === 0" class="empty-ranking">
            暂无订阅数据
          </div>
          <div
            v-for="(item, index) in topSubscriptions"
            :key="item.id"
            class="ranking-item"
          >
            <span class="rank-badge" :class="'rank-' + (index + 1)">{{ index + 1 }}</span>
            <span class="rank-name">{{ item.title || item.routeUrl }}</span>
            <span class="rank-count">{{ item.articleCount || 0 }} 篇</span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useAuthStore, useSubscriptionStore } from '@/stores';
import { articleApi } from '@/api';
import * as echarts from 'echarts';
import {
  FileText,
  BookOpen,
  Heart,
  FileSymlink,
  Package,
  TrendingUp,
  Search,
  Settings,
  ChevronRight
} from 'lucide-vue-next';

const authStore = useAuthStore();
const subscriptionStore = useSubscriptionStore();

const displayName = computed(() => {
  const email = authStore.user?.email || '';
  return email.split('@')[0];
});

const stats = ref({
  total: 0,
  unread: 0,
  favorites: 0,
  shared: 0,
  subscriptions: 0,
});

const topSubscriptions = ref<any[]>([]);
const weeklyData = ref<{ date: string; count: number }[]>([]);

const readRate = computed(() => {
  if (stats.value.total === 0) return 0;
  return Math.round(((stats.value.total - stats.value.unread) / stats.value.total) * 100);
});

const weeklyChartRef = ref<HTMLElement | null>(null);
const subscriptionChartRef = ref<HTMLElement | null>(null);
let weeklyChart: echarts.ECharts | null = null;
let subscriptionChart: echarts.ECharts | null = null;

function generateWeeklyData() {
  const data = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    data.push({
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      count: Math.floor(Math.random() * 25) + 5,
    });
  }
  return data;
}

function initWeeklyChart() {
  if (!weeklyChartRef.value) return;
  weeklyChart = echarts.init(weeklyChartRef.value);
  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#fff',
      borderColor: '#EEEEEE',
      borderWidth: 1,
      textStyle: {
        color: '#1A1A1A',
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: weeklyData.value.map(d => d.date),
      axisLabel: {
        color: '#999',
        fontSize: 12,
      },
      axisLine: {
        lineStyle: {
          color: '#EEEEEE',
        },
      },
      axisTick: {
        show: false,
      },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: '#999',
        fontSize: 12,
      },
      splitLine: {
        lineStyle: {
          color: '#F5F5F5',
          type: 'dashed',
        },
      },
    },
    series: [
      {
        name: '新增文章',
        type: 'bar',
        data: weeklyData.value.map(d => d.count),
        itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#6366F1' },
              { offset: 1, color: '#A5B4FC' },
            ]),
          borderRadius: [6, 6, 0, 0],
        },
        barWidth: '50%',
      },
    ],
  };
  weeklyChart.setOption(option);
}

function initSubscriptionChart() {
  if (!subscriptionChartRef.value) return;
  subscriptionChart = echarts.init(subscriptionChartRef.value);
  const pieData = topSubscriptions.value.slice(0, 5).map((sub) => ({
    name: sub.title || sub.routeUrl,
    value: sub.articleCount || 0,
  }));

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} 篇 ({d}%)',
      backgroundColor: '#fff',
      borderColor: '#EEEEEE',
      borderWidth: 1,
      textStyle: {
        color: '#1A1A1A',
      },
    },
    legend: {
      orient: 'vertical',
      right: '5%',
      top: 'center',
      textStyle: {
        color: '#666',
        fontSize: 12,
      },
      itemWidth: 10,
      itemHeight: 10,
    },
    series: [
      {
        name: '订阅源',
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['30%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: false,
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 13,
            fontWeight: 'bold',
          },
        },
        data: pieData.length > 0 ? pieData : [{ name: '暂无数据', value: 0 }],
        color: ['#6366F1', '#818CF8', '#A5B4FC', '#C7D2FE', '#E0E7FF'],
      },
    ],
  };
  subscriptionChart.setOption(option);
}

function handleResize() {
  weeklyChart?.resize();
  subscriptionChart?.resize();
}

async function loadData() {
  try {
    const [articleStatsRes, subRes] = await Promise.all([
      articleApi.getStats(),
      subscriptionStore.fetchSubscriptions({ limit: 100 }),
    ]);

    if (articleStatsRes.success && articleStatsRes.data) {
      stats.value.total = articleStatsRes.data.total || 0;
      stats.value.unread = articleStatsRes.data.unread || 0;
      stats.value.favorites = articleStatsRes.data.favorites || articleStatsRes.data.favorite || 0;
      stats.value.shared = articleStatsRes.data.shared || 0;
    }

    const subs = subscriptionStore.subscriptions;
    stats.value.subscriptions = subscriptionStore.pagination?.total || subs.length;

    topSubscriptions.value = [...subs]
      .sort((a: any, b: any) => (b.articleCount || 0) - (a.articleCount || 0))
      .slice(0, 5);

    weeklyData.value = generateWeeklyData();
  } catch (e) {
    console.error('加载仪表盘数据失败', e);
  }
}

onMounted(async () => {
  await loadData();
  initWeeklyChart();
  initSubscriptionChart();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  weeklyChart?.dispose();
  subscriptionChart?.dispose();
});
</script>

<style scoped>
.dashboard-page {
  padding: 20px;
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
}

/* 欢迎区 */
.welcome-section {
  position: relative;
  border-radius: var(--radius-xl);
  overflow: hidden;
  margin-bottom: 20px;
}

.welcome-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #4F46E5 0%, #6366F1 100%);
}

.welcome-content {
  position: relative;
  padding: 24px 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.welcome-left h2 {
  font-size: 20px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 6px;
}

.welcome-left p {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
}

.welcome-left strong {
  color: #fff;
  font-weight: 600;
}

.btn-light {
  background: #fff;
  color: var(--color-primary);
}

.btn-light:hover {
  background: #f5f5f5;
}

/* 区块通用 */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.section-header h3 {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.section-sub {
  font-size: 13px;
  color: var(--color-text-muted);
}

.section-link {
  font-size: 13px;
  color: var(--color-primary);
  text-decoration: none;
}

.section-link:hover {
  color: var(--color-primary-hover);
}

/* 数据概览 */
.stats-section {
  margin-bottom: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
}

.stat-card {
  background: var(--color-white);
  border-radius: var(--radius-lg);
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--color-border);
  transition: border-color 0.2s;
}

.stat-card:hover {
  border-color: var(--color-primary);
}

.stat-icon {
  width: 42px;
  height: 42px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon-blue {
  background: #EEF2FF;
  color: #6366F1;
}

.stat-icon-green {
  background: #ECFDF5;
  color: #10B981;
}

.stat-icon-orange {
  background: #FFF7ED;
  color: #F59E0B;
}

.stat-icon-purple {
  background: #F5F3FF;
  color: #8B5CF6;
}

.stat-icon-blue-light {
  background: #EFF6FF;
  color: #3B82F6;
}

.stat-icon-teal {
  background: #F0FDFA;
  color: #14B8A6;
}

.stat-content {
  min-width: 0;
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1.2;
}

.stat-label {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 2px;
}

/* 图表区 */
.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.chart-section {
  background: var(--color-white);
  border-radius: var(--radius-lg);
  padding: 16px;
  border: 1px solid var(--color-border);
}

.chart-container {
  width: 100%;
  height: 240px;
}

/* 底部面板 */
.bottom-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.panel-section {
  background: var(--color-white);
  border-radius: var(--radius-lg);
  padding: 16px;
  border: 1px solid var(--color-border);
}

.action-list {
  display: flex;
  flex-direction: column;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: var(--radius-md);
  text-decoration: none;
  transition: background-color 0.2s;
}

.action-item:hover {
  background: var(--color-bg);
}

.action-icon {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-md);
  background: var(--color-primary-light);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-body {
  flex: 1;
  min-width: 0;
}

.action-title {
  font-weight: 500;
  color: var(--color-text-primary);
  margin-bottom: 2px;
  font-size: 14px;
}

.action-desc {
  font-size: 12px;
  color: var(--color-text-muted);
}

.action-arrow {
  color: var(--color-text-muted);
}

/* 排行 */
.ranking-list {
  display: flex;
  flex-direction: column;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--color-border-light);
}

.ranking-item:last-child {
  border-bottom: none;
}

.rank-badge {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  flex-shrink: 0;
}

.rank-1 {
  background: linear-gradient(135deg, #F59E0B, #D97706);
}

.rank-2 {
  background: linear-gradient(135deg, #94A3B8, #64748B);
}

.rank-3 {
  background: linear-gradient(135deg, #CD853F, #A0522D);
}

.rank-badge:not(.rank-1):not(.rank-2):not(.rank-3) {
  background: var(--color-border);
  color: var(--color-text-secondary);
}

.rank-name {
  flex: 1;
  font-size: 13px;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank-count {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-primary);
}

.empty-ranking {
  text-align: center;
  padding: 24px 0;
  color: var(--color-text-muted);
  font-size: 13px;
}

/* 响应式 */
@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .dashboard-page {
    padding: 16px;
  }

  .welcome-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    padding: 20px;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .content-grid,
  .bottom-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .stat-card {
    padding: 12px;
  }

  .stat-value {
    font-size: 18px;
  }

  .welcome-left h2 {
    font-size: 18px;
  }
}
</style>
