<template>
  <div class="settings-page">
    <div class="page-hero">
      <div class="hero-icon">
        <Settings :size="28" />
      </div>
      <div class="hero-info">
        <h1>设置</h1>
        <p>管理你的账户和数据</p>
      </div>
    </div>

    <div class="settings-layout">
      <!-- 个人信息 -->
      <section class="settings-card">
        <div class="card-header">
          <User :size="18" class="card-icon" />
          <h3>个人信息</h3>
        </div>
        <div class="card-body">
          <div class="info-row">
            <div class="info-label">邮箱</div>
            <div class="info-value">{{ authStore.user?.email }}</div>
          </div>
          <div class="info-row">
            <div class="info-label">注册时间</div>
            <div class="info-value">{{ authStore.user?.createdAt }}</div>
          </div>
        </div>
      </section>

      <!-- 数据概览 -->
      <section class="settings-card">
        <div class="card-header">
          <BarChart2 :size="18" class="card-icon" />
          <h3>数据概览</h3>
        </div>
        <div class="card-body">
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-num">{{ stats.total }}</div>
              <div class="stat-text">文章总数</div>
            </div>
            <div class="stat-item">
              <div class="stat-num">{{ stats.favorite }}</div>
              <div class="stat-text">已收藏</div>
            </div>
            <div class="stat-item">
              <div class="stat-num">{{ stats.shared }}</div>
              <div class="stat-text">已分享</div>
            </div>
            <div class="stat-item stat-warning">
              <div class="stat-num">{{ stats.old }}</div>
              <div class="stat-text">可清理</div>
            </div>
          </div>
        </div>
      </section>

      <!-- 自动清理 -->
      <section class="settings-card">
        <div class="card-header">
          <Clock :size="18" class="card-icon" />
          <h3>自动清理</h3>
          <label class="toggle-switch">
            <input type="checkbox" v-model="autoCleanup.enabled" />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="card-body">
          <p class="setting-desc">开启后，系统将每天自动清理超过设定天数的旧文章</p>
          <div v-if="autoCleanup.enabled" class="setting-group">
            <div class="form-row">
              <span class="form-label">清理超过</span>
              <select v-model.number="autoCleanup.days" class="form-select">
                <option :value="7">7 天</option>
                <option :value="14">14 天</option>
                <option :value="30">30 天</option>
                <option :value="60">60 天</option>
                <option :value="90">90 天</option>
              </select>
            </div>
            <p class="form-hint">推荐 30 天，平衡历史记录与存储空间</p>
          </div>
        </div>
      </section>

      <!-- 手动清理 -->
      <section class="settings-card">
        <div class="card-header">
          <Trash2 :size="18" class="card-icon card-icon-warning" />
          <h3>手动清理</h3>
        </div>
        <div class="card-body">
          <p class="setting-desc">立即清理超过 {{ autoCleanup.days }} 天的旧文章</p>
          <div class="cleanup-options">
            <label class="checkbox-label">
              <input type="checkbox" v-model="cleanupOptions.unreadOnly" />
              <span>仅清理未读</span>
            </label>
          </div>
          <button
            @click="handleCleanup"
            class="btn btn-danger"
            :disabled="cleaning || stats.old === 0"
          >
            <Trash2 :size="16" />
            {{ cleaning ? '清理中...' : '清理 ' + stats.old + ' 篇旧文章' }}
          </button>
        </div>
      </section>

      <!-- 安全 -->
      <section class="settings-card">
        <div class="card-header">
          <Lock :size="18" class="card-icon" />
          <h3>安全</h3>
        </div>
        <div class="card-body">
          <div class="info-row">
            <div class="info-label">密码</div>
            <div class="info-value muted">功能开发中...</div>
          </div>
        </div>
      </section>

      <!-- 关于 -->
      <section class="settings-card">
        <div class="card-header">
          <Rss :size="18" class="card-icon" />
          <h3>关于</h3>
        </div>
        <div class="card-body">
          <div class="about-row">
            <div class="about-name">个人情报官</div>
            <div class="about-version">v1.0.0</div>
          </div>
          <p class="about-desc">基于 RSSHub 扩展的 RSS 订阅管理平台</p>
        </div>
      </section>

      <!-- 退出登录 -->
      <section class="settings-card settings-card-danger">
        <div class="card-body">
          <button @click="handleLogout" class="btn btn-logout">
            <LogOut :size="18" />
            退出登录
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { articleApi, settingsApi } from '@/api';
import { useToast } from '@/composables/useToast';
import {
  Settings,
  User,
  BarChart2,
  Clock,
  Trash2,
  Lock,
  Rss,
  LogOut
} from 'lucide-vue-next';

const router = useRouter();
const authStore = useAuthStore();
const toast = useToast();

const stats = reactive({
  total: 0,
  favorite: 0,
  shared: 0,
  old: 0,
});

const cleaning = ref(false);
const cleanupOptions = reactive({
  unreadOnly: false,
});

const autoCleanup = reactive({
  enabled: true,
  days: 30,
});

async function loadAutoCleanupSettings() {
  try {
    const res = await settingsApi.getSettings();
    if (res.success && res.data) {
      autoCleanup.enabled = res.data.autoCleanupEnabled;
      autoCleanup.days = res.data.autoCleanupDays;
      localStorage.setItem('autoCleanupSettings', JSON.stringify({
        enabled: autoCleanup.enabled,
        days: autoCleanup.days,
      }));
      return;
    }
  } catch (e) {
    console.error('从后端加载设置失败，尝试从本地存储加载', e);
  }

  try {
    const saved = localStorage.getItem('autoCleanupSettings');
    if (saved) {
      const parsed = JSON.parse(saved);
      autoCleanup.enabled = parsed.enabled !== undefined ? parsed.enabled : true;
      autoCleanup.days = parsed.days || 30;
    }
  } catch (e) {
    console.error('加载自动清理设置失败', e);
  }
}

async function saveAutoCleanupSettings() {
  try {
    await settingsApi.updateSettings({
      autoCleanupEnabled: autoCleanup.enabled,
      autoCleanupDays: autoCleanup.days,
    });
    localStorage.setItem('autoCleanupSettings', JSON.stringify({
      enabled: autoCleanup.enabled,
      days: autoCleanup.days,
    }));
  } catch (e) {
    console.error('保存自动清理设置失败', e);
    localStorage.setItem('autoCleanupSettings', JSON.stringify({
      enabled: autoCleanup.enabled,
      days: autoCleanup.days,
    }));
  }
}

async function loadStats() {
  try {
    const res = await articleApi.getStats();
    if (res.success) {
      stats.total = res.data.total;
      stats.favorite = res.data.favorite;
      stats.shared = res.data.shared;
      stats.old = res.data.old;
    }
  } catch (e) {
    console.error('加载统计失败', e);
  }
}

async function handleCleanup() {
  if (stats.old === 0 || cleaning.value) return;

  const daysText = `${autoCleanup.days}天`;
  if (!confirm(`确定要清理 ${stats.old} 篇旧文章吗？\n\n仅清理：未收藏 + 未生成分享链接 + 超过${daysText}的文章`)) {
    return;
  }

  cleaning.value = true;
  try {
    const params: any = {
      isFavorite: false,
      hasFullContent: false,
      olderThanDays: autoCleanup.days,
    };
    if (cleanupOptions.unreadOnly) {
      params.isRead = false;
    }

    const res = await articleApi.cleanup(params);
    if (res.success) {
      toast.success(`已清理 ${res.data.count} 篇文章`);
      loadStats();
    }
  } catch (e) {
    toast.error('清理失败');
  } finally {
    cleaning.value = false;
  }
}

function handleLogout() {
  authStore.logout();
  router.push('/login');
}

onMounted(() => {
  loadStats();
  loadAutoCleanupSettings();
});

watch(
  () => [autoCleanup.enabled, autoCleanup.days],
  () => {
    saveAutoCleanupSettings();
  },
  { deep: true }
);
</script>

<style scoped>
.settings-page {
  padding: 20px;
  max-width: 720px;
  margin: 0 auto;
  box-sizing: border-box;
}

/* 顶部标题 */
.page-hero {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
}

.hero-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
  background: var(--color-primary-light);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-info h1 {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 2px;
}

.hero-info p {
  font-size: 13px;
  color: var(--color-text-secondary);
}

/* 网格布局 - 单栏 */
.settings-layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.settings-card {
  background: var(--color-white);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  overflow: hidden;
}

.settings-card-danger {
  border: 1px solid #FECACA;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--color-border-light);
}

.card-icon {
  color: var(--color-primary);
}

.card-icon-warning {
  color: var(--color-warning);
}

.card-header h3 {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
  flex: 1;
}

.card-body {
  padding: 20px;
}

/* 信息行 */
.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--color-border-light);
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.info-value {
  font-size: 14px;
  color: var(--color-text-primary);
  font-weight: 500;
}

.info-value.muted {
  color: var(--color-text-muted);
  font-weight: 400;
}

/* 数据统计 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.stat-item {
  text-align: center;
  padding: 16px 8px;
  background: var(--color-white);
}

.stat-num {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: 4px;
}

.stat-text {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.stat-warning .stat-num {
  color: var(--color-warning);
}

/* 设置描述 */
.setting-desc {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 14px;
  line-height: 1.6;
}

.setting-group {
  padding: 14px;
  background: var(--color-bg);
  border-radius: var(--radius-md);
}

.form-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 4px;
}

.form-label {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.form-select {
  padding: 6px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 13px;
  background: var(--color-white);
  color: var(--color-text-primary);
}

.form-hint {
  font-size: 12px;
  color: var(--color-text-muted);
  margin: 0;
}

/* 清理选项 */
.cleanup-options {
  margin-bottom: 14px;
}

.checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-text-secondary);
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  cursor: pointer;
}

/* 开关 */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
  cursor: pointer;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--color-border);
  border-radius: 22px;
  transition: var(--transition-normal);
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  border-radius: 50%;
  transition: var(--transition-normal);
}

.toggle-switch input:checked + .toggle-slider {
  background-color: var(--color-primary);
}

.toggle-switch input:checked + .toggle-slider:before {
  transform: translateX(18px);
}

/* 按钮 */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  padding: 10px 18px;
  font-size: 14px;
  font-weight: 500;
  border-radius: var(--radius-md);
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
  width: 100%;
}

.btn-danger {
  background: var(--color-error);
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
}

.btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-logout {
  background: transparent;
  color: var(--color-error);
  border: 1px solid var(--color-error);
  font-weight: 500;
}

.btn-logout:hover {
  background: #FEF2F2;
}

/* 关于 */
.about-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.about-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.about-version {
  font-size: 13px;
  color: var(--color-text-muted);
}

.about-desc {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 0;
}

/* 响应式 */
@media (max-width: 600px) {
  .settings-page {
    padding: 16px;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
