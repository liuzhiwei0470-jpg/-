<template>
  <div class="article-detail-page">
    <header class="page-header">
      <div class="header-container">
        <div class="header-left">
          <button @click="goBack" class="btn btn-ghost btn-icon">
            <ArrowLeft :size="18" />
          </button>
        </div>
        <div class="header-right" v-if="article">
          <button
            @click="toggleFavorite"
            :class="['btn', 'btn-icon', article.isFavorite ? 'btn-primary' : 'btn-ghost']"
            :title="article.isFavorite ? '取消收藏' : '收藏'"
          >
            <Heart :size="18" :fill="article.isFavorite ? 'currentColor' : 'none'" />
          </button>
          <div class="download-menu" @click.stop>
            <button
              @click="showDownloadMenu = !showDownloadMenu"
              class="btn btn-ghost btn-icon"
              :disabled="downloading"
              title="下载"
            >
              <Download :size="18" />
            </button>
            <div v-if="showDownloadMenu" class="dropdown-menu">
              <button @click="downloadArticle('docx')" class="dropdown-item">
                <FileText :size="16" />
                <span>Word (.docx)</span>
              </button>
              <button @click="downloadArticle('md')" class="dropdown-item">
                <FileCode :size="16" />
                <span>Markdown (.md)</span>
              </button>
              <button @click="downloadArticle('html')" class="dropdown-item">
                <Globe :size="16" />
                <span>HTML (.html)</span>
              </button>
            </div>
          </div>
          <button
            @click="generateShareLink"
            class="btn btn-ghost btn-icon"
            :disabled="sharing"
            title="生成分享链接"
          >
            <Share2 :size="18" />
          </button>
          <a :href="article.link || '#'" target="_blank" class="btn btn-ghost btn-icon" title="查看原文">
            <ExternalLink :size="18" />
          </a>
          <div class="header-divider"></div>
          <button
            @click="showDeleteConfirm = true"
            class="btn btn-ghost btn-icon btn-danger-icon"
            title="删除"
          >
            <Trash2 :size="18" />
          </button>
        </div>
      </div>
    </header>

    <main class="page-main">
      <div class="container">
        <div v-if="loading" class="loading-wrap">
          <span class="spinner"></span>
          <span>加载中...</span>
        </div>

        <div v-else-if="article" class="article-detail">
          <h1 class="article-title">{{ article.title }}</h1>
          
          <div class="article-meta">
            <span v-if="article.subscriptionTitle" class="meta-item meta-source">
              <Tag :size="13" />
              {{ article.subscriptionTitle }}
            </span>
            <span v-if="article.author" class="meta-item">
              <User :size="13" />
              {{ article.author }}
            </span>
            <span v-if="article.published" class="meta-item">
              <Clock :size="13" />
              发布: {{ formatDate(article.published) }}
            </span>
            <span v-if="article.createdAt" class="meta-item">
              <RefreshCw :size="13" />
              更新: {{ formatDate(article.createdAt) }}
            </span>
          </div>

          <div class="article-content" v-html="renderedContent"></div>

          <div v-if="article.prevArticle || article.nextArticle" class="article-nav">
            <button
              v-if="article.prevArticle"
              class="nav-btn nav-prev"
              @click="goToArticle(article.prevArticle.id)"
            >
              <span class="nav-label">← 上一篇</span>
              <span class="nav-title">{{ article.prevArticle.title }}</span>
            </button>
            <button
              v-if="article.nextArticle"
              class="nav-btn nav-next"
              @click="goToArticle(article.nextArticle.id)"
            >
              <span class="nav-label">下一篇 →</span>
              <span class="nav-title">{{ article.nextArticle.title }}</span>
            </button>
          </div>
        </div>

        <div v-else class="empty-state">
          <p>文章不存在</p>
        </div>
      </div>
    </main>

    <!-- 删除确认弹窗 -->
    <div v-if="showDeleteConfirm" class="modal-overlay" @click="showDeleteConfirm = false">
      <div class="modal-content modal-small" @click.stop>
        <h3>确认删除</h3>
        <p>确定要删除这篇文章吗？删除后无法恢复。</p>
        <div class="modal-actions">
          <button @click="showDeleteConfirm = false" class="btn btn-ghost">取消</button>
          <button @click="deleteArticle" class="btn btn-danger" :disabled="deleting">
            {{ deleting ? '删除中...' : '确认删除' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 分享链接弹窗 -->
    <div v-if="showShareModal" class="modal-overlay" @click="closeShareModal">
      <div class="modal-content modal-small" @click.stop>
        <h3>分享链接</h3>
        <p class="share-desc">复制以下链接，分享给其他人查看文章</p>
        <div class="share-link-box">
          <input type="text" :value="shareUrl" readonly class="share-link-input" />
          <button @click="copyShareLink" class="btn btn-primary">
            复制链接
          </button>
        </div>
        <div class="modal-actions">
          <button @click="closeShareModal" class="btn btn-ghost">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { marked } from 'marked';
import { articleApi, type Article } from '@/api';
import { useToast } from '@/composables/useToast';
import {
  ArrowLeft,
  Heart,
  Download,
  FileText,
  FileCode,
  Globe,
  Share2,
  Trash2,
  ExternalLink,
  Tag,
  User,
  Clock,
  RefreshCw
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();

const articleId = computed(() => parseInt(route.params.articleId as string));
const article = ref<Article | null>(null);
const loading = ref(true);
const downloading = ref(false);
const showDownloadMenu = ref(false);
const showDeleteConfirm = ref(false);
const deleting = ref(false);
const sharing = ref(false);
const shareUrl = ref<string | null>(null);
const showShareModal = ref(false);

const toast = useToast();

const renderedContent = computed(() => {
  if (!article.value) return '暂无内容';
  const content = article.value.content || '';
  if (!content) return '暂无内容';
  if (isHtml(content)) {
    return content;
  }
  if (isMarkdown(content)) {
    return marked.parse(content);
  }
  return content.replace(/\n/g, '<br>');
});

function isHtml(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text);
}

function isMarkdown(text: string): boolean {
  const markdownPatterns = [
    /^#{1,6}\s/m,
    /\*\*.*\*\*/,
    /^-\s/m,
    /^\d+\.\s/m,
    /!\[.*\]\(.*\)/,
    /\[.*\]\(.*\)/,
    /^>/m,
    /`{3}/,
  ];
  let score = 0;
  for (const pattern of markdownPatterns) {
    if (pattern.test(text)) score++;
  }
  return score >= 1;
}

function goBack() {
  const from = route.query.from;
  const subId = route.params.id;

  if (from === 'all-articles') {
    router.push('/articles');
  } else if (from === 'subscription-articles') {
    router.push(`/subscriptions/${subId}`);
  } else {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/articles');
    }
  }
}

async function deleteArticle() {
  if (!article.value || deleting.value) return;
  
  deleting.value = true;
  try {
    await articleApi.delete(article.value.id);
    toast.success('删除成功');
    showDeleteConfirm.value = false;
    goBack();
  } catch (e) {
    toast.error('删除失败');
  } finally {
    deleting.value = false;
  }
}

async function loadArticle() {
  loading.value = true;
  try {
    const res = await articleApi.get(articleId.value);
    article.value = res.data;
  } catch (e) {
    console.error('加载文章失败', e);
  } finally {
    loading.value = false;
  }
}

async function toggleFavorite() {
  if (!article.value) return;
  try {
    await articleApi.toggleFavorite(article.value.id);
    article.value.isFavorite = !article.value.isFavorite;
  } catch (e) {
    console.error('操作失败', e);
  }
}

async function generateShareLink() {
  if (!article.value || sharing.value) return;
  sharing.value = true;
  try {
    const res = await articleApi.generateShareLink(article.value.id);
    if (res.success && res.data?.shareUrl) {
      shareUrl.value = res.data.shareUrl;
      showShareModal.value = true;
      toast.success('分享链接已生成！');
    } else {
      const errMsg = res.error?.message || '生成失败';
      toast.error(errMsg);
    }
  } catch (e: any) {
    const msg = e?.response?.data?.error?.message || e?.message || '生成失败，请稍后重试';
    toast.error(msg);
    console.error('生成分享链接失败:', e);
  } finally {
    sharing.value = false;
  }
}

function copyShareLink() {
  if (!shareUrl.value) return;
  navigator.clipboard.writeText(shareUrl.value).then(() => {
    toast.success('链接已复制到剪贴板');
  }).catch(() => {
    toast.error('复制失败，请手动复制');
  });
}

function closeShareModal() {
  showShareModal.value = false;
  shareUrl.value = null;
}

async function downloadArticle(format: 'docx' | 'md' | 'html') {
  if (!article.value || downloading.value) return;
  downloading.value = true;
  showDownloadMenu.value = false;
  try {
    const blob = await articleApi.download(article.value.id, format);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const title = article.value.title?.replace(/[\\/:*?"<>|]/g, '_') || 'article';
    const extMap: Record<string, string> = {
      docx: '.docx',
      md: '.md',
      html: '.html',
    };
    a.download = `${title}${extMap[format] || '.md'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e: any) {
    const msg = e?.response?.data?.error?.message || '下载失败，请稍后重试';
    toast.error(msg);
  } finally {
    downloading.value = false;
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function goToArticle(articleId: number) {
  const subscriptionId = route.params.id;
  router.push(`/subscriptions/${subscriptionId}/articles/${articleId}?from=${route.query.from || ''}`);
}

function handleKeydown(e: KeyboardEvent) {
  const target = e.target as HTMLElement;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
    return;
  }

  if (e.key === 'Escape') {
    goBack();
  } else if (e.key === 'ArrowLeft' && article.value?.prevArticle) {
    goToArticle(article.value.prevArticle.id);
  } else if (e.key === 'ArrowRight' && article.value?.nextArticle) {
    goToArticle(article.value.nextArticle.id);
  } else if (e.key === 'j' || e.key === 'J') {
    window.scrollBy(0, 100);
  } else if (e.key === 'k' || e.key === 'K') {
    window.scrollBy(0, -100);
  }
}

function handleClickOutside() {
  showDownloadMenu.value = false;
}

// 监听路由参数变化，当文章ID变化时重新加载
watch(articleId, () => {
  loadArticle();
});

onMounted(() => {
  loadArticle();
  document.addEventListener('keydown', handleKeydown);
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.article-detail-page {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.page-header {
  background: var(--color-white);
  border-bottom: 1px solid var(--color-border);
  padding: 10px 0;
  position: sticky;
  top: 0;
  z-index: 100;
  flex-shrink: 0;
}

.header-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.btn-icon {
  width: 32px;
  height: 32px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.header-right {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
  align-items: center;
}

.header-divider {
  width: 1px;
  height: 20px;
  background: var(--color-border);
  margin: 0 2px;
  flex-shrink: 0;
}

.btn-danger-icon {
  color: var(--color-text-muted);
  transition: all 0.2s;
}

.btn-danger-icon:hover {
  color: var(--color-error);
  background: var(--color-error-light, #fef2f2);
}

.download-menu {
  position: relative;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  z-index: 200;
  min-width: 180px;
  overflow: hidden;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 14px;
  background: none;
  border: none;
  text-align: left;
  font-size: 13px;
  color: var(--color-text-primary);
  cursor: pointer;
  transition: background 0.2s;
}

.dropdown-item:hover {
  background: var(--color-bg);
}

.page-main {
  flex: 1;
  padding: 24px 20px;
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
  color: var(--color-text-secondary);
}

.article-detail {
  background: var(--color-white);
  border-radius: var(--radius-lg);
  padding: 32px 40px;
  border: 1px solid var(--color-border);
  max-width: 900px;
  margin: 0 auto;
}

.article-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1.4;
  margin: 0 0 16px 0;
  word-break: break-word;
}

.article-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--color-border);
  font-size: 13px;
  color: var(--color-text-secondary);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.meta-source {
  color: var(--color-primary);
  font-weight: 500;
}

.content-tabs {
  display: flex;
  gap: 2px;
  margin-bottom: 24px;
  background: var(--color-bg);
  padding: 3px;
  border-radius: var(--radius-md);
  width: fit-content;
}

.content-tabs .tab-btn {
  padding: 6px 14px;
  background: none;
  border: none;
  font-size: 13px;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  border-radius: var(--radius-sm);
  font-weight: 500;
}

.content-tabs .tab-btn:hover {
  color: var(--color-text-primary);
}

.content-tabs .tab-btn.active {
  background: var(--color-white);
  color: var(--color-primary);
}

.article-content {
  font-size: 15px;
  line-height: 1.8;
  color: var(--color-text-primary);
}

.article-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: var(--radius-md);
  margin: var(--space-md) 0;
}

.article-content :deep(p) {
  margin-bottom: var(--space-md);
}

.article-content :deep(a) {
  color: var(--color-primary);
  text-decoration: underline;
}

.article-content :deep(h1),
.article-content :deep(h2),
.article-content :deep(h3) {
  margin-top: var(--space-lg);
  margin-bottom: var(--space-md);
  font-weight: 600;
}

.article-content :deep(pre) {
  background: var(--color-bg);
  padding: var(--space-md);
  border-radius: var(--radius-md);
  overflow-x: auto;
  margin: var(--space-md) 0;
}

.article-content :deep(code) {
  background: var(--color-bg);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-size: 13px;
}

.article-content :deep(blockquote) {
  border-left: 3px solid var(--color-primary);
  padding-left: var(--space-md);
  margin: var(--space-md) 0;
  color: var(--color-text-secondary);
  font-style: italic;
}

.article-nav {
  display: flex;
  justify-content: space-between;
  gap: var(--space-md);
  margin-top: var(--space-xl);
  padding-top: var(--space-lg);
  border-top: 1px solid var(--color-border);
}

.nav-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--space-md);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
  min-width: 0;
}

.nav-btn:hover {
  background: var(--color-white);
  border-color: var(--color-primary);
}

.nav-btn.nav-next {
  text-align: right;
}

.nav-label {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.nav-title {
  font-size: 14px;
  color: var(--color-text-primary);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

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

.modal-content {
  background: var(--color-bg-card);
  border-radius: 12px;
  padding: 24px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-small {
  max-width: 360px;
}

.modal-content h3 {
  margin: 0 0 12px 0;
  font-size: 18px;
  color: var(--color-text-primary);
}

.modal-content p {
  margin: 0 0 20px 0;
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.share-desc {
  margin-bottom: 16px !important;
}

.share-link-box {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.share-link-input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 13px;
  color: var(--color-text-secondary);
  background: var(--color-bg-secondary);
  outline: none;
}

.share-link-input:focus {
  border-color: var(--color-primary);
}

@media (max-width: 768px) {
  .page-main {
    padding: 16px;
  }

  .article-detail {
    padding: 20px 16px;
  }

  .article-title {
    font-size: 20px;
  }

  .article-meta {
    gap: 12px;
  }

  .header-container {
    padding: 0 16px;
  }
}
</style>
