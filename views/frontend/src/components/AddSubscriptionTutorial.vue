<template>
  <Teleport to="body">
    <div v-if="visible" class="tutorial-overlay" @click.self="close">
      <div class="tutorial-container">
        <!-- 顶部进度指示器 -->
        <div class="tutorial-progress">
          <div
            v-for="(step, index) in steps"
            :key="index"
            :class="['progress-dot', {
              active: currentStep === index,
              completed: currentStep > index
            }]"
            @click="goToStep(index)"
          >
            <span v-if="currentStep > index" class="check">✓</span>
          </div>
        </div>

        <!-- 步骤内容 -->
        <div class="tutorial-content">
          <div v-if="currentStep === 0" class="step-content">
            <div class="step-icon">👋</div>
            <h2>欢迎使用个人情报官</h2>
            <p>这是一个强大的RSS阅读器，可以帮助你聚合管理各种资讯来源。</p>
            <p class="step-hint">让我们一起来学习如何添加订阅源吧！</p>
          </div>

          <div v-if="currentStep === 1" class="step-content">
            <div class="step-icon">📚</div>
            <h2>订阅库 - 快速添加</h2>
            <p>点击顶部导航的 <strong>"订阅库"</strong> 标签，这里收录了常用的订阅源。</p>
            <div class="tip-box">
              <span class="tip-icon">💡</span>
              <span>订阅库按分类排列，方便你快速找到想要的资讯来源</span>
            </div>
          </div>

          <div v-if="currentStep === 2" class="step-content">
            <div class="step-icon">🔍</div>
            <h2>搜索和筛选</h2>
            <p>使用搜索框快速找到特定订阅源，或点击左侧分类筛选。</p>
            <div class="example-search">
              <span class="example-label">例如：</span>
              <code>财经</code> <code>科技</code> <code>投资</code>
            </div>
          </div>

          <div v-if="currentStep === 3" class="step-content">
            <div class="step-icon">➕</div>
            <h2>添加订阅</h2>
            <p>订阅库收录了常用的订阅源，直接点击 <strong>"+ 添加订阅"</strong> 即可。</p>
            <div class="tip-box">
              <span class="tip-icon">💡</span>
              <span>也可以手动添加任意RSS源</span>
            </div>
            <div class="method-list">
              <div class="method-item">
                <span class="method-label">方式一</span>
                <span class="method-desc">订阅库选择 → 一键添加</span>
              </div>
              <div class="method-item">
                <span class="method-label">方式二</span>
                <span class="method-desc">手动添加 → 输入RSS链接</span>
              </div>
            </div>
          </div>

          <div v-if="currentStep === 4" class="step-content">
            <div class="step-icon">⚙️</div>
            <h2>配置订阅</h2>
            <p>在弹窗中可以设置：</p>
            <ul class="config-list">
              <li><strong>订阅源地址</strong> - RSS链接或RSSHub路由路径</li>
              <li><strong>标题</strong> - 给订阅源起个名字（可选）</li>
              <li><strong>刷新间隔</strong> - 多久更新一次（建议30-60分钟）</li>
              <li><strong>关键词过滤</strong> - 只保留包含/排除特定关键词的文章</li>
            </ul>
            <div class="tip-box">
              <span class="tip-icon">🔍</span>
              <span>支持两种地址格式：完整RSS链接（https://...）和RSSHub路径（/xxx/xxx）</span>
            </div>
          </div>

          <div v-if="currentStep === 5" class="step-content">
            <div class="step-icon">📰</div>
            <h2>阅读文章</h2>
            <p>添加成功后，点击订阅卡片进入文章列表。</p>
            <div class="tip-box">
              <span class="tip-icon">✨</span>
              <span>使用筛选标签快速找到：未读/已读/收藏/已分享的文章</span>
            </div>
          </div>

          <div v-if="currentStep === 6" class="step-content">
            <div class="step-icon">🔗</div>
            <h2>生成分享链接</h2>
            <p>点击文章进入详情，点击 <strong>"生成分享链接"</strong> 按钮。</p>
            <p>系统会生成一个固定链接，可以分享给任何人查看！</p>
          </div>

          <div v-if="currentStep === 7" class="step-content">
            <div class="step-icon">💾</div>
            <h2>导出下载</h2>
            <p>在文章详情页点击下载按钮，可以导出为：</p>
            <div class="format-list">
              <div class="format-item">
                <span class="format-icon">📝</span>
                <span class="format-name">Markdown (.md)</span>
              </div>
              <div class="format-item">
                <span class="format-icon">📊</span>
                <span class="format-name">Word (.docx)</span>
              </div>
            </div>
          </div>

          <div v-if="currentStep === 8" class="step-content">
            <div class="step-icon">🎉</div>
            <h2>恭喜你！</h2>
            <p>你已经掌握了个人情报官的基本用法。</p>
            <p class="step-hint">开始探索，定制你的专属资讯吧！</p>
            <div class="start-btn-wrapper">
              <button @click="startUsing" class="btn btn-primary btn-lg">
                开始使用 →
              </button>
            </div>
          </div>
        </div>

        <!-- 底部按钮 -->
        <div class="tutorial-footer">
          <button v-if="currentStep > 0" @click="prevStep" class="btn btn-ghost">
            ← 上一步
          </button>
          <div v-else></div>

          <button v-if="currentStep < steps.length - 1" @click="nextStep" class="btn btn-primary">
            下一步 →
          </button>
        </div>

        <!-- 跳过按钮 -->
        <button @click="close" class="skip-btn">跳过教程</button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  close: [];
  complete: [];
}>();

const steps = [
  '欢迎',
  '订阅库',
  '搜索',
  '添加',
  '配置',
  '阅读',
  '提取',
  '导出',
  '完成'
];

const currentStep = ref(0);

function nextStep() {
  if (currentStep.value < steps.length - 1) {
    currentStep.value++;
  }
}

function prevStep() {
  if (currentStep.value > 0) {
    currentStep.value--;
  }
}

function goToStep(index: number) {
  currentStep.value = index;
}

function close() {
  emit('close');
}

function startUsing() {
  localStorage.setItem('tutorial_completed', 'true');
  emit('complete');
  close();
}

watch(() => props.visible, (newVal) => {
  if (newVal) {
    currentStep.value = 0;
  }
});
</script>

<style scoped>
.tutorial-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.tutorial-container {
  background: var(--color-white);
  border-radius: 16px;
  padding: 32px;
  max-width: 480px;
  width: 90%;
  position: relative;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.tutorial-progress {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 24px;
}

.progress-dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-bg);
  border: 2px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 12px;
  color: var(--color-text-muted);
}

.progress-dot.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
  transform: scale(1.1);
}

.progress-dot.completed {
  background: var(--color-success);
  border-color: var(--color-success);
  color: white;
}

.progress-dot:hover {
  transform: scale(1.1);
}

.check {
  font-weight: bold;
}

.tutorial-content {
  min-height: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.step-content {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.step-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.step-content h2 {
  font-size: 24px;
  color: var(--color-text-primary);
  margin-bottom: 16px;
}

.step-content p {
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin-bottom: 12px;
}

.step-hint {
  font-size: 13px;
  color: var(--color-text-muted);
}

.tip-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--color-bg);
  padding: 12px 16px;
  border-radius: 8px;
  margin: 16px 0;
  font-size: 14px;
  text-align: left;
}

.tip-icon {
  font-size: 20px;
}

.example-search {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  flex-wrap: wrap;
  justify-content: center;
}

.example-label {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.example-search code {
  background: var(--color-bg);
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 13px;
  color: var(--color-primary);
}

.config-list {
  list-style: none;
  padding: 0;
  margin: 16px 0;
  text-align: left;
}

.config-list li {
  padding: 12px 0;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-secondary);
}

.config-list li:last-child {
  border-bottom: none;
}

.format-list {
  display: flex;
  gap: 16px;
  margin-top: 20px;
}

.format-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--color-bg);
  padding: 16px 24px;
  border-radius: 12px;
}

.format-icon {
  font-size: 28px;
}

.format-name {
  font-weight: 500;
  color: var(--color-text-primary);
}

.method-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
}

.method-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--color-bg);
  padding: 12px 16px;
  border-radius: 8px;
  text-align: left;
}

.method-label {
  background: var(--color-primary);
  color: white;
  font-size: 12px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 4px;
  white-space: nowrap;
}

.method-desc {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.start-btn-wrapper {
  margin-top: 24px;
}

.btn-lg {
  padding: 12px 32px;
  font-size: 16px;
  border-radius: 24px;
}

.tutorial-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--color-border);
}

.skip-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: 13px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.skip-btn:hover {
  background: var(--color-bg);
  color: var(--color-text-secondary);
}
</style>
