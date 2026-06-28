<template>
  <div class="app-layout" :class="{ 'sidebar-collapsed': sidebarCollapsed, 'sidebar-mobile-open': mobileMenuOpen }">
    <!-- 移动端遮罩 -->
    <div v-if="mobileMenuOpen" class="mobile-overlay" @click="closeMobileMenu"></div>

    <!-- 侧边栏 -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="logo">
          <component :is="Rss" class="logo-icon" />
          <span class="logo-text">个人情报官</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: isActive(item.path) }"
          @click="closeMobileMenu"
        >
          <component :is="item.icon" class="nav-icon" :size="20" />
          <span class="nav-text">{{ item.label }}</span>
        </router-link>

        <button class="nav-item nav-item-secondary" @click="openTutorial">
          <component :is="BookOpen" class="nav-icon" :size="20" />
          <span class="nav-text">使用教程</span>
        </button>

        <div class="nav-divider"></div>
      </nav>

      <div class="sidebar-footer">
        <div class="user-info" @click="showUserMenu = !showUserMenu">
          <div class="user-avatar">{{ userInitial }}</div>
          <div class="user-details">
            <div class="user-name">{{ displayName }}</div>
            <div class="user-role">用户</div>
          </div>
          <ChevronDown :size="14" class="user-menu-arrow" />
        </div>
        <div v-if="showUserMenu" class="user-menu">
          <router-link to="/settings" class="user-menu-item" @click="closeUserMenu">
            <Settings :size="16" />
            <span>设置</span>
          </router-link>
          <div class="user-menu-divider"></div>
          <button @click="handleLogout" class="user-menu-item user-menu-danger">
            <LogOut :size="16" />
            <span>退出登录</span>
          </button>
        </div>
      </div>
    </aside>

    <!-- 主内容区 -->
    <main class="main-content">
      <!-- 移动端顶部栏 -->
      <header class="mobile-header">
        <button class="hamburger" @click="toggleMobileMenu">
          <Menu :size="24" />
        </button>
        <span class="mobile-title">个人情报官</span>
      </header>

      <div class="content-wrapper">
        <router-view />
      </div>
    </main>

    <AuthModal v-model="authStore.showAuthModal" :initial-mode="authStore.authModalMode" />
    <AddSubscriptionTutorial :visible="showTutorial" @close="showTutorial = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import AuthModal from '@/components/AuthModal.vue';
import AddSubscriptionTutorial from '@/components/AddSubscriptionTutorial.vue';
import {
  Rss,
  FileText,
  Package,
  LayoutDashboard,
  Settings,
  LogOut,
  Menu,
  BookOpen,
  ChevronDown,
  ChevronRight
} from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const sidebarCollapsed = ref(false);
const mobileMenuOpen = ref(false);
const showTutorial = ref(false);
const showUserMenu = ref(false);

const navItems = [
  { path: '/dashboard', label: '仪表盘', icon: LayoutDashboard },
  { path: '/articles', label: '全部文章', icon: FileText },
  { path: '/subscriptions', label: '订阅管理', icon: Package },
];

const userInitial = computed(() => {
  const email = authStore.user?.email || '';
  return email.charAt(0).toUpperCase();
});

const displayName = computed(() => {
  const email = authStore.user?.email || '';
  return email.split('@')[0];
});

function isActive(path: string): boolean {
  if (path === '/dashboard') {
    return route.path === '/dashboard';
  }
  if (path === '/subscriptions') {
    return route.path.startsWith('/subscriptions');
  }
  return route.path.startsWith(path);
}

function openTutorial() {
  showTutorial.value = true;
  mobileMenuOpen.value = false;
}

function closeUserMenu() {
  showUserMenu.value = false;
}

function toggleMobileMenu() {
  mobileMenuOpen.value = !mobileMenuOpen.value;
}

function closeMobileMenu() {
  mobileMenuOpen.value = false;
}

function handleLogout() {
  showUserMenu.value = false;
  authStore.logout();
  router.push('/');
}

function handleResize() {
  if (window.innerWidth >= 768) {
    mobileMenuOpen.value = false;
  }
}

function handleClickOutside(e: MouseEvent) {
  if (showUserMenu.value) {
    const target = e.target as HTMLElement;
    if (!target.closest('.sidebar-footer')) {
      showUserMenu.value = false;
    }
  }
}

onMounted(() => {
  window.addEventListener('resize', handleResize);
  document.addEventListener('click', handleClickOutside);
  handleResize();
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
}

/* 侧边栏 - 白色背景简洁设计 */
.sidebar {
  width: 220px;
  background: #fff;
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 100;
  border-right: 1px solid var(--color-border);
}

.sidebar-header {
  display: flex;
  align-items: center;
  padding: 0 16px;
  height: 56px;
  border-bottom: 1px solid var(--color-border);
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  color: var(--color-primary);
  flex-shrink: 0;
}

.logo-text {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  white-space: nowrap;
}

.sidebar-nav {
  flex: 1;
  padding: 12px 8px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.nav-divider {
  height: 1px;
  background: var(--color-border);
  margin: 8px 8px;
}

.nav-item-secondary {
  color: var(--color-text-muted);
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
}

.nav-item-secondary:hover {
  color: var(--color-text-secondary);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  color: var(--color-text-secondary);
  text-decoration: none;
  border-radius: var(--radius-md);
  margin-bottom: 2px;
  transition: all var(--transition-fast);
  position: relative;
}

.nav-item:hover {
  background: var(--color-bg);
  color: var(--color-text-primary);
}

.nav-item.active {
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: 500;
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 20px;
  background: var(--color-primary);
  border-radius: 0 2px 2px 0;
}

.nav-icon {
  flex-shrink: 0;
}

.nav-text {
  white-space: nowrap;
  font-size: 14px;
}

.sidebar-footer {
  padding: 12px 12px;
  border-top: 1px solid var(--color-border);
  position: relative;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 6px 8px;
  border-radius: var(--radius-md);
  transition: background 0.2s;
}

.user-info:hover {
  background: var(--color-bg);
}

.user-avatar {
  width: 32px;
  height: 32px;
  background: var(--color-primary-light);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: var(--color-primary);
  font-size: 14px;
  flex-shrink: 0;
}

.user-details {
  flex: 1;
  min-width: 0;
  overflow: visible;
}

.user-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: visible;
}

.user-role {
  font-size: 12px;
  color: var(--color-text-muted);
}

.user-menu-arrow {
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.user-menu {
  position: absolute;
  bottom: calc(100% - 4px);
  left: 12px;
  right: 12px;
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 4px;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
  z-index: 200;
}

.user-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  text-decoration: none;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
}

.user-menu-item:hover {
  background: var(--color-bg);
}

.user-menu-danger {
  color: var(--color-error);
}

.user-menu-danger:hover {
  background: #FFF1F0;
}

.user-menu-divider {
  height: 1px;
  background: var(--color-border);
  margin: 4px 0;
}

/* 主内容区 */
.main-content {
  flex: 1;
  margin-left: 220px;
  min-height: 100vh;
  min-width: 0;
  background: var(--color-bg);
  transition: margin-left 0.3s ease;
}

.content-wrapper {
  padding: 20px;
  max-width: 100%;
  box-sizing: border-box;
}

/* 移动端顶部栏 */
.mobile-header {
  display: none;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid var(--color-border);
}

.hamburger {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-primary);
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mobile-title {
  font-weight: 600;
  font-size: 16px;
  color: var(--color-text-primary);
}

/* 移动端遮罩 */
.mobile-overlay {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 99;
}

/* 响应式 */
@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
    width: 220px;
  }

  .sidebar-mobile-open .sidebar {
    transform: translateX(0);
  }

  .mobile-overlay {
    display: block;
  }

  .main-content {
    margin-left: 0;
  }

  .mobile-header {
    display: flex;
  }

  .content-wrapper {
    padding: 16px;
  }
}
</style>
