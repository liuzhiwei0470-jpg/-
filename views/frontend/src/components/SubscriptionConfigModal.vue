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
          <label>订阅源地址</label>
          <input
            v-model="config.routeUrl"
            type="text"
            class="form-input"
            :disabled="isEditing"
            placeholder="例如：/zhihu/hot 或 https://example.com/feed.xml"
          />
          <small class="form-hint">
            支持两种格式：
            <br />• RSSHub 路由路径（以 / 开头），如 <code>/zhihu/hot</code>
            <br />• 完整 RSS 链接，如 <code>https://example.com/feed.xml</code>
          </small>
          <div v-if="!isEditing" class="quick-picks">
            <span class="quick-label">试试这些：</span>
            <button
              v-for="quick in quickPicks"
              :key="quick"
              type="button"
              class="quick-btn"
              @click="config.routeUrl = quick"
            >
              {{ quick }}
            </button>
          </div>
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

        <!-- 刷新频率 -->
        <div class="form-group">
          <label>刷新频率</label>
          <select v-model="config.refreshInterval" class="form-select">
            <option
              v-for="opt in intervalOptions"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </option>
          </select>
          <small class="form-hint">每隔多久自动检查一次该订阅源是否有新文章</small>
        </div>

        <!-- 关键词筛选开关 -->
        <div class="form-group filter-toggle">
          <div class="toggle-switch-row">
            <div class="toggle-label">
              <span class="toggle-title">关键词筛选</span>
              <small class="form-hint">开启后可按关键词过滤文章</small>
            </div>
            <button
              type="button"
              :class="['switch', { on: enableFilter }]"
              @click="toggleFilter"
              :aria-checked="enableFilter"
              role="switch"
            >
              <span class="switch-handle"></span>
            </button>
          </div>
        </div>

        <!-- 关键词筛选内容 -->
        <div v-if="enableFilter" class="filter-content">
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
import { REFRESH_INTERVAL_OPTIONS, DEFAULT_REFRESH_INTERVAL } from '@/types/subscription';

const props = defineProps<{
  visible: boolean;
  initialData?: {
    routeUrl: string;
    title: string;
    filterInclude: string;
    filterExclude: string;
    refreshInterval: number;
  };
  isEditing?: boolean;
  editingId?: number;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit', data: any): void;
}>();

const intervalOptions = REFRESH_INTERVAL_OPTIONS;

const quickPicks = [
  '/zhihu/hot',
  '/36kr/news/latest',
  '/huxiu/article',
  '/hackernews',
  'https://www.ruanyifeng.com/blog/atom.xml',
];

const config = reactive({
  routeUrl: '',
  title: '',
  filterInclude: '',
  filterExclude: '',
  refreshInterval: DEFAULT_REFRESH_INTERVAL,
});

const enableFilter = ref(false);

const previewLoading = ref(false);
const previewResult = ref<any>(null);
const previewError = ref('');
const submitting = ref(false);

function toggleFilter() {
  enableFilter.value = !enableFilter.value;
  if (!enableFilter.value) {
    config.filterInclude = '';
    config.filterExclude = '';
  }
}

// 初始化数据
watch(() => props.visible, (val) => {
  if (val) {
    if (props.initialData) {
      Object.assign(config, {
        routeUrl: props.initialData.routeUrl,
        title: props.initialData.title,
        filterInclude: props.initialData.filterInclude,
        filterExclude: props.initialData.filterExclude,
        refreshInterval: props.initialData.refreshInterval ?? DEFAULT_REFRESH_INTERVAL,
      });
      enableFilter.value = !!(props.initialData.filterInclude || props.initialData.filterExclude);
    } else {
      Object.assign(config, {
        routeUrl: '',
        title: '',
        filterInclude: '',
        filterExclude: '',
        refreshInterval: DEFAULT_REFRESH_INTERVAL,
      });
      enableFilter.value = false;
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
  emit('submit', { 
    id: props.editingId,
    routeUrl: config.routeUrl,
    title: config.title,
    filterInclude: config.filterInclude,
    filterExclude: config.filterExclude,
    refreshInterval: config.refreshInterval,
  });
  submitting.value = false;
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--color-white);
  border-radius: var(--radius-lg);
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  padding: var(--space-md);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
}

.btn-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--color-text-secondary);
  padding: 0;
  line-height: 1;
}

.modal-body {
  padding: var(--space-md);
}

.form-group {
  margin-bottom: var(--space-md);
}

.form-group label {
  display: block;
  margin-bottom: var(--space-xs);
  font-size: 14px;
  font-weight: 500;
}

.form-input,
.form-select {
  width: 100%;
  padding: var(--space-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 14px;
  background: var(--color-white);
}

.form-select {
  cursor: pointer;
}

.form-hint {
  display: block;
  margin-top: var(--space-xs);
  font-size: 12px;
  color: var(--color-text-muted);
  line-height: 1.6;
}

.form-hint code {
  background: var(--color-bg);
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 11px;
}

.quick-picks {
  margin-top: var(--space-sm);
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.quick-label {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.quick-btn {
  padding: 3px 8px;
  font-size: 11px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-white);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.quick-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-bg);
}

.filter-toggle {
  padding: var(--space-sm) 0;
}

.toggle-switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.toggle-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.toggle-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.switch {
  position: relative;
  width: 44px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 12px;
  background: var(--color-border);
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;
}

.switch.on {
  background: var(--color-primary);
}

.switch-handle {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background: var(--color-white);
  border-radius: 50%;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.switch.on .switch-handle {
  transform: translateX(20px);
}

.filter-content {
  padding: var(--space-sm);
  background: var(--color-bg);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-md);
}

.preview-loading {
  text-align: center;
  padding: var(--space-md);
  color: var(--color-text-secondary);
}

.preview-result {
  padding: var(--space-md);
  background: var(--color-bg);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-md);
}

.preview-result h4 {
  margin-bottom: var(--space-xs);
}

.preview-count {
  font-size: 12px;
  color: var(--color-primary);
}

.error-text {
  color: var(--color-danger);
  font-size: 13px;
  margin: var(--space-sm) 0;
}

.modal-footer {
  padding: var(--space-md);
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
  gap: var(--space-sm);
}
</style>
