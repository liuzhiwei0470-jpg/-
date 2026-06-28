<template>
  <div class="share-page">
    <header class="share-header">
      <router-link to="/" class="back-link">
        <ChevronLeft :size="20" />
        <span>返回首页</span>
      </router-link>
      <span class="share-badge">个人情报官分享</span>
    </header>

    <main class="share-content" v-if="article">
      <h1 class="article-title">{{ article.title }}</h1>
      <div class="article-meta">
        <span class="source">来自 {{ article.subscriptionTitle }}</span>
        <span class="divider">|</span>
        <span class="date">{{ formatDate(article.published) }}</span>
      </div>

      <div class="article-body" v-html="renderedContent"></div>

      <div class="article-actions" v-if="article.link">
        <a :href="article.link" target="_blank" rel="noopener" class="read-original">
          <ExternalLink :size="18" />
          <span>阅读原文</span>
        </a>
      </div>

      <footer class="share-footer">
        <p>由个人情报官分享</p>
      </footer>
    </main>

    <div class="loading-state" v-else-if="loading">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>

    <div class="error-state" v-else>
      <h2>分享链接不存在或已失效</h2>
      <p>该文章可能已被删除或取消分享</p>
      <router-link to="/" class="home-link">返回首页</router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ChevronLeft, ExternalLink } from 'lucide-vue-next';

interface ShareArticle {
  id: number;
  title: string | null;
  content: string | null;
  author: string | null;
  published: string | null;
  subscriptionTitle: string;
  link: string | null;
}

const route = useRoute();
const article = ref<ShareArticle | null>(null);
const loading = ref(true);

const renderedContent = computed(() => {
  if (!article.value?.content) return '';
  // 简单处理：去除script和style标签，防止XSS
  return article.value.content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
});

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const fetchArticle = async () => {
  const token = route.params.token as string;
  if (!token) {
    loading.value = false;
    return;
  }

  try {
    const response = await fetch(`/api/share/${token}`);
    const data = await response.json();
    if (data.success) {
      article.value = data.data;
    }
  } catch (e) {
    console.error('获取分享文章失败', e);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchArticle();
});
</script>

<style scoped>
.share-page {
  min-height: 100vh;
  background: #f8fafc;
}

.share-header {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
}

.back-link {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #374151;
  text-decoration: none;
  font-size: 14px;
  transition: color 0.2s;
}

.back-link:hover {
  color: #3B82F6;
}

.share-badge {
  font-size: 13px;
  color: #6b7280;
  background: #f3f4f6;
  padding: 4px 12px;
  border-radius: 16px;
}

.share-content {
  max-width: 720px;
  margin: 0 auto;
  padding: 32px 20px;
  background: #fff;
}

.article-title {
  font-size: 24px;
  font-weight: 600;
  color: #111827;
  line-height: 1.4;
  margin: 0 0 16px 0;
}

.article-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 24px;
}

.article-meta .divider {
  color: #d1d5db;
}

.article-body {
  font-size: 16px;
  line-height: 1.8;
  color: #374151;
}

.article-body :deep(p) {
  margin: 0 0 16px 0;
}

.article-body :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 16px 0;
}

.article-body :deep(a) {
  color: #3B82F6;
  text-decoration: none;
}

.article-body :deep(a:hover) {
  text-decoration: underline;
}

.article-body :deep(blockquote) {
  margin: 16px 0;
  padding: 12px 16px;
  background: #f9fafb;
  border-left: 4px solid #3B82F6;
  color: #4b5563;
}

.article-body :deep(pre) {
  background: #1f2937;
  color: #f9fafb;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  font-size: 14px;
}

.article-body :deep(code) {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 14px;
}

.article-body :deep(ul),
.article-body :deep(ol) {
  margin: 16px 0;
  padding-left: 24px;
}

.article-body :deep(li) {
  margin-bottom: 8px;
}

.article-actions {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #e5e7eb;
}

.read-original {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: #3B82F6;
  color: #fff;
  text-decoration: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  transition: background 0.2s;
}

.read-original:hover {
  background: #2563eb;
}

.share-footer {
  margin-top: 48px;
  padding-top: 24px;
  border-top: 1px solid #e5e7eb;
  text-align: center;
}

.share-footer p {
  font-size: 13px;
  color: #9ca3af;
  margin: 0;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 40px 20px;
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e5e7eb;
  border-top-color: #3B82F6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-state p {
  margin-top: 16px;
  color: #6b7280;
}

.error-state h2 {
  font-size: 20px;
  color: #111827;
  margin: 0 0 8px 0;
}

.error-state p {
  color: #6b7280;
  margin: 0 0 24px 0;
}

.home-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 10px 20px;
  background: #3B82F6;
  color: #fff;
  text-decoration: none;
  border-radius: 6px;
  font-size: 14px;
  transition: background 0.2s;
}

.home-link:hover {
  background: #2563eb;
}

@media (max-width: 640px) {
  .article-title {
    font-size: 20px;
  }

  .article-body {
    font-size: 15px;
  }
}
</style>
