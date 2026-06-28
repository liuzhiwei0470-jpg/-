<template>
  <div class="home-page">
    <section class="hero">
      <div class="hero-bg"></div>
      <div class="container hero-content">
        <div class="hero-logo">
          <Rss :size="48" />
        </div>
        <h1 class="hero-title">个人情报官</h1>
        <p class="hero-slogan">您的智能信息中枢</p>
        <p class="hero-desc">
          汇聚全网优质资讯，智能分享内容，告别信息焦虑，让阅读更高效
        </p>
        <div class="hero-actions">
          <button @click="openRegister" class="btn btn-primary btn-lg">立即开始</button>
          <button @click="openLogin" class="btn btn-outline btn-lg">登录</button>
        </div>
      </div>
    </section>

    <section class="features">
      <div class="container">
        <h2 class="section-title">为什么选择个人情报官？</h2>
        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon">
              <FileText :size="28" />
            </div>
            <h3>智能全文提取</h3>
            <p>告别RSS摘要，自动提取文章完整内容，还原纯净阅读体验</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">
              <Package :size="28" />
            </div>
            <h3>多源订阅管理</h3>
            <p>一站式管理所有订阅源，支持RSSHub全网订阅源接入</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">
              <Download :size="28" />
            </div>
            <h3>离线收藏导出</h3>
            <p>支持Word、Markdown、HTML多格式导出，随时随地离线阅读</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">
              <Trash2 :size="28" />
            </div>
            <h3>自动清理省空间</h3>
            <p>智能自动清理旧文章，保持数据库轻量，专注有价值内容</p>
          </div>
        </div>
      </div>
    </section>

    <section class="how-it-works">
      <div class="container">
        <h2 class="section-title">三步开始高效阅读</h2>
        <div class="steps">
          <div class="step">
            <div class="step-number">1</div>
            <div class="step-content">
              <h3>添加订阅</h3>
              <p>从订阅库中选择你感兴趣的源，或手动添加任意RSS地址</p>
            </div>
          </div>
          <div class="step-arrow">
            <ChevronRight :size="24" />
          </div>
          <div class="step">
            <div class="step-number">2</div>
            <div class="step-content">
              <h3>自动同步</h3>
              <p>系统自动定时抓取更新，无需手动刷新，新内容即时推送</p>
            </div>
          </div>
          <div class="step-arrow">
            <ChevronRight :size="24" />
          </div>
          <div class="step">
            <div class="step-number">3</div>
            <div class="step-content">
              <h3>高效阅读</h3>
              <p>一键分享内容，标记收藏，多端导出，享受沉浸式阅读</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="sources">
      <div class="container">
        <h2 class="section-title">支持的订阅源</h2>
        <p class="section-desc">覆盖主流资讯平台，满足你的信息获取需求</p>
        <div class="sources-grid">
          <div class="source-item">
            <MessageCircle :size="20" class="source-icon" />
            <span class="source-name">知乎</span>
          </div>
          <div class="source-item">
            <Newspaper :size="20" class="source-icon" />
            <span class="source-name">36氪</span>
          </div>
          <div class="source-item">
            <PawPrint :size="20" class="source-icon" />
            <span class="source-name">虎嗅</span>
          </div>
          <div class="source-item">
            <FileText :size="20" class="source-icon" />
            <span class="source-name">阮一峰</span>
          </div>
          <div class="source-item">
            <Target :size="20" class="source-icon" />
            <span class="source-name">少数派</span>
          </div>
          <div class="source-item">
            <Play :size="20" class="source-icon" />
            <span class="source-name">B站</span>
          </div>
          <div class="source-item">
            <Video :size="20" class="source-icon" />
            <span class="source-name">微博</span>
          </div>
          <div class="source-item">
            <BookOpen :size="20" class="source-icon" />
            <span class="source-name">豆瓣</span>
          </div>
          <div class="source-item">
            <TrendingUp :size="20" class="source-icon" />
            <span class="source-name">东方财富</span>
          </div>
          <div class="source-item">
            <Snowflake :size="20" class="source-icon" />
            <span class="source-name">雪球</span>
          </div>
        </div>
        <p class="sources-more">以及 RSSHub 支持的数千个订阅源...</p>
      </div>
    </section>

    <section class="cta">
      <div class="container">
        <h2>准备好提升你的信息获取效率了吗？</h2>
        <p>免费注册，即刻开始你的智能阅读之旅</p>
        <router-link to="/register" @click.prevent="openRegister" class="btn btn-primary btn-lg">立即注册</router-link>
      </div>
    </section>

    <footer class="footer">
      <div class="container">
        <p class="footer-main">个人情报官 · 让信息获取更高效</p>
        <p class="footer-desc">基于 RSSHub 扩展的 RSS 订阅管理平台</p>
      </div>
    </footer>

    <AuthModal v-model="authStore.showAuthModal" :initial-mode="authStore.authModalMode" />
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';
import AuthModal from '@/components/AuthModal.vue';
import {
  Rss,
  FileText,
  Package,
  Download,
  Trash2,
  ChevronRight,
  MessageCircle,
  Newspaper,
  PawPrint,
  Target,
  Play,
  Video,
  BookOpen,
  TrendingUp,
  Snowflake
} from 'lucide-vue-next';

const authStore = useAuthStore();

function openLogin() {
  authStore.openLoginModal();
}

function openRegister() {
  authStore.openRegisterModal();
}
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  background: var(--color-bg);
}

/* Hero Section */
.hero {
  position: relative;
  padding: 80px 0;
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  color: #fff;
  overflow: hidden;
}

.hero-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
}

.hero-content {
  position: relative;
  text-align: center;
  max-width: 700px;
  margin: 0 auto;
}

.hero-logo {
  width: 80px;
  height: 80px;
  border-radius: 20px;
  background: rgba(74, 144, 217, 0.2);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
}

.hero-title {
  font-size: 48px;
  font-weight: 700;
  margin-bottom: 12px;
  color: #fff;
}

.hero-slogan {
  font-size: 24px;
  font-weight: 500;
  color: var(--color-primary);
  margin-bottom: 16px;
}

.hero-desc {
  font-size: 16px;
  color: #94a3b8;
  margin-bottom: 32px;
  line-height: 1.6;
}

.hero-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 24px;
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: 15px;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-primary {
  background: var(--color-primary);
  color: #fff;
}

.btn-primary:hover {
  background: var(--color-primary-hover);
}

.btn-outline {
  background: transparent;
  color: #fff;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.btn-outline:hover {
  border-color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

.btn-lg {
  padding: 14px 28px;
  font-size: 16px;
}

/* Features Section */
.features {
  padding: 80px 0;
  background: var(--color-white);
}

.section-title {
  text-align: center;
  font-size: 28px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: 40px;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 24px;
}

.feature-card {
  text-align: center;
  padding: 28px 20px;
  border-radius: var(--radius-lg);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  transition: transform 0.2s, border-color 0.2s;
}

.feature-card:hover {
  transform: translateY(-2px);
  border-color: var(--color-primary);
}

.feature-icon {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-md);
  background: var(--color-primary-light);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.feature-card h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 8px;
}

.feature-card p {
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

/* How it Works Section */
.how-it-works {
  padding: 80px 0;
  background: var(--color-bg);
}

.steps {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 200px;
}

.step-number {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--color-primary);
  color: #fff;
  font-size: 20px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.step-content h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 8px;
}

.step-content p {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.step-arrow {
  color: var(--color-primary);
  margin-top: 14px;
}

/* Sources Section */
.sources {
  padding: 80px 0;
  background: var(--color-white);
}

.section-desc {
  text-align: center;
  color: var(--color-text-secondary);
  margin-top: -32px;
  margin-bottom: 40px;
}

.sources-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-bottom: 24px;
}

.source-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: var(--color-bg);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  transition: transform 0.2s, border-color 0.2s;
}

.source-item:hover {
  transform: scale(1.02);
  border-color: var(--color-primary);
}

.source-icon {
  color: var(--color-primary);
}

.source-name {
  font-weight: 500;
  color: var(--color-text-primary);
  font-size: 14px;
}

.sources-more {
  text-align: center;
  color: var(--color-text-muted);
  font-size: 14px;
}

/* CTA Section */
.cta {
  padding: 80px 0;
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  color: #fff;
  text-align: center;
}

.cta h2 {
  font-size: 26px;
  font-weight: 700;
  margin-bottom: 12px;
}

.cta p {
  font-size: 15px;
  color: #94a3b8;
  margin-bottom: 24px;
}

/* Footer */
.footer {
  padding: 32px 0;
  background: var(--color-bg);
  text-align: center;
  border-top: 1px solid var(--color-border);
}

.footer-main {
  color: var(--color-text-primary);
  font-weight: 600;
  font-size: 14px;
}

.footer-desc {
  font-size: 13px;
  color: var(--color-text-muted);
  margin-top: 8px;
}

/* Container */
.container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 24px;
}

/* Responsive */
@media (max-width: 768px) {
  .hero {
    padding: 60px 0;
  }

  .hero-title {
    font-size: 36px;
  }

  .hero-slogan {
    font-size: 20px;
  }

  .hero-desc {
    font-size: 15px;
  }

  .hero-actions {
    flex-direction: column;
    align-items: center;
  }

  .steps {
    flex-direction: column;
    align-items: center;
  }

  .step-arrow {
    transform: rotate(90deg);
    margin: 8px 0;
  }

  .section-title {
    font-size: 24px;
  }

  .cta h2 {
    font-size: 22px;
  }
}
</style>
