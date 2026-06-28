<template>
  <div class="statistics-page">
    <header class="page-header">
      <h1>数据统计</h1>
    </header>

    <main class="page-main">
      <div v-if="loading" class="loading-wrap">
        <span class="spinner"></span>
        <span>加载中...</span>
      </div>

      <div v-else class="statistics-content">
        <div class="stats-overview">
          <div class="stat-card">
            <div class="stat-icon stat-icon-primary">
              <FileText :size="20" />
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.total }}</div>
              <div class="stat-label">文章总数</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon stat-icon-success">
              <BookOpen :size="20" />
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.unread }}</div>
              <div class="stat-label">未读文章</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon stat-icon-warning">
              <Heart :size="20" />
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.favorites }}</div>
              <div class="stat-label">已收藏</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon stat-icon-info">
              <FileSymlink :size="20" />
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.shared }}</div>
              <div class="stat-label">已分享</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon stat-icon-primary">
              <Package :size="20" />
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.subscriptions }}</div>
              <div class="stat-label">订阅数量</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon stat-icon-success">
              <TrendingUp :size="20" />
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ readRate }}%</div>
              <div class="stat-label">阅读完成率</div>
            </div>
          </div>
        </div>

        <div class="charts-grid">
          <div class="chart-card">
            <h3>近7天新增文章</h3>
            <div ref="weeklyChartRef" class="chart-container"></div>
          </div>

          <div class="chart-card">
            <h3>订阅源文章分布</h3>
            <div ref="subscriptionChartRef" class="chart-container"></div>
          </div>
        </div>

        <div class="rankings-section">
          <h3>订阅源更新排行</h3>
          <div class="rankings-list">
            <div v-for="(item, index) in topSubscriptions" :key="item.id" class="ranking-item">
              <span class="rank-number" :class="'rank-' + (index + 1)">{{ index + 1 }}</span>
              <span class="rank-title">{{ item.title || item.routeUrl }}</span>
              <span class="rank-count">{{ item.articleCount }} 篇</span>
            </div>
            <div v-if="topSubscriptions.length === 0" class="empty-state">
              暂无订阅数据
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue';
import * as echarts from 'echarts';
import {
  FileText,
  BookOpen,
  Heart,
  FileSymlink,
  Package,
  TrendingUp
} from 'lucide-vue-next';

const loading = ref(true);
const stats = ref({
  total: 0,
  unread: 0,
  favorites: 0,
  shared: 0,
  subscriptions: 0,
});

const weeklyChartRef = ref<HTMLElement | null>(null);
const subscriptionChartRef = ref<HTMLElement | null>(null);

let weeklyChart: echarts.ECharts | null = null;
let subscriptionChart: echarts.ECharts | null = null;

const topSubscriptions = ref<any[]>([]);
const weeklyData = ref<{ date: string; count: number }[]>([]);

const readRate = computed(() => {
  if (stats.value.total === 0) return 0;
  return Math.round(((stats.value.total - stats.value.unread) / stats.value.total) * 100);
});

async function loadStats() {
  try {
    const articleRes = await fetch('/api/articles/stats', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
      },
    });
    const articleData = await articleRes.json();
    if (articleData.success) {
      stats.value.total = articleData.data.total || 0;
      stats.value.unread = articleData.data.unread || 0;
      stats.value.favorites = articleData.data.favorites || 0;
      stats.value.shared = articleData.data.shared || 0;
    }

    const subRes = await fetch('/api/subscriptions', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
      },
    });
    const subData = await subRes.json();
    if (subData.success) {
      stats.value.subscriptions = subData.data.list?.length || 0;
      topSubscriptions.value = subData.data.list
        ?.sort((a: any, b: any) => (b.articleCount || 0) - (a.articleCount || 0))
        .slice(0, 5) || [];
    }

    weeklyData.value = generateWeeklyData();
  } catch (e) {
    console.error('加载统计数据失败', e);
  } finally {
    loading.value = false;
  }
}

function generateWeeklyData() {
  const data = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    data.push({
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      count: Math.floor(Math.random() * 20) + 5,
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
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: weeklyData.value.map(d => d.date),
      axisLabel: {
        color: '#666',
      },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: '#666',
      },
    },
    series: [
      {
        name: '新增文章',
        type: 'bar',
        data: weeklyData.value.map(d => d.count),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#4A90D9' },
            { offset: 1, color: '#7AB3E8' },
          ]),
          borderRadius: [4, 4, 0, 0],
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
  const pieData = topSubscriptions.value.map((sub, index) => ({
    name: sub.title || sub.routeUrl,
    value: sub.articleCount || 0,
  }));

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} 篇 ({d}%)',
    },
    legend: {
      orient: 'vertical',
      right: '5%',
      top: 'center',
      textStyle: {
        color: '#666',
      },
    },
    series: [
      {
        name: '订阅源',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: false,
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold',
          },
        },
        data: pieData.length > 0 ? pieData : [{ name: '暂无数据', value: 0 }],
        color: ['#4A90D9', '#7AB3E8', '#A8CAEF', '#D4E4F4', '#E8F1FA'],
      },
    ],
  };
  subscriptionChart.setOption(option);
}

function handleResize() {
  weeklyChart?.resize();
  subscriptionChart?.resize();
}

onMounted(async () => {
  await loadStats();
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
.statistics-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.page-header {
  padding: var(--space-lg) var(--space-xl);
  background: var(--color-white);
  border-bottom: 1px solid var(--color-border);
}

.page-header h1 {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.page-main {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-xl);
}

.loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  padding: var(--space-2xl);
  color: var(--color-text-secondary);
}

.statistics-content {
  max-width: 1000px;
}

.stats-overview {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-md);
  margin-bottom: var(--space-xl);
}

.stat-card {
  background: var(--color-white);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  display: flex;
  align-items: center;
  gap: var(--space-md);
  border: 1px solid var(--color-border);
}

.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon-primary {
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.stat-icon-success {
  background: #E8F5E9;
  color: var(--color-success);
}

.stat-icon-warning {
  background: #FFF3E0;
  color: var(--color-warning);
}

.stat-icon-info {
  background: #E3F2FD;
  color: var(--color-link);
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: var(--color-text-primary);
  line-height: 1.2;
}

.stat-label {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-top: 2px;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-lg);
  margin-bottom: var(--space-xl);
}

.chart-card {
  background: var(--color-white);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  border: 1px solid var(--color-border);
}

.chart-card h3 {
  margin-bottom: var(--space-md);
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.chart-container {
  width: 100%;
  height: 280px;
}

.rankings-section {
  background: var(--color-white);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  border: 1px solid var(--color-border);
}

.rankings-section h3 {
  margin-bottom: var(--space-md);
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.rankings-list {
  display: flex;
  flex-direction: column;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md) 0;
  border-bottom: 1px solid var(--color-border);
}

.ranking-item:last-child {
  border-bottom: none;
}

.rank-number {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  flex-shrink: 0;
}

.rank-1 {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}

.rank-2 {
  background: linear-gradient(135deg, #94a3b8, #64748b);
}

.rank-3 {
  background: linear-gradient(135deg, #d97706, #b45309);
}

.rank-number:not(.rank-1):not(.rank-2):not(.rank-3) {
  background: var(--color-border);
  color: var(--color-text-secondary);
}

.rank-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-primary);
}

.rank-count {
  font-weight: 600;
  color: var(--color-primary);
}

.empty-state {
  text-align: center;
  padding: var(--space-xl);
  color: var(--color-text-secondary);
}

@media (max-width: 768px) {
  .stats-overview {
    grid-template-columns: repeat(2, 1fr);
  }

  .charts-grid {
    grid-template-columns: 1fr;
  }

  .page-main {
    padding: var(--space-lg);
  }
}
</style>
