import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('@/views/Home.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/auth/Login.vue'),
      meta: { guest: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/auth/Register.vue'),
      meta: { guest: true },
    },
    {
      path: '/share/:token',
      name: 'share',
      component: () => import('@/views/Share.vue'),
    },
    {
      path: '/',
      component: () => import('@/components/AppLayout.vue'),
      children: [
        {
          path: 'articles',
          name: 'articles',
          component: () => import('@/views/articles/ArticleList.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/views/dashboard/Dashboard.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'subscriptions',
          name: 'subscriptions',
          component: () => import('@/views/subscriptions/SubscriptionList.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'subscriptions/:id',
          name: 'subscription-articles',
          component: () => import('@/views/subscriptions/ArticleList.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'subscriptions/:id/articles/:articleId',
          name: 'article-detail',
          component: () => import('@/views/subscriptions/ArticleDetail.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/views/settings/Settings.vue'),
          meta: { requiresAuth: true },
        },
      ],
    },
  ],
});

// 路由守卫
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();

  // 已登录用户访问首页，重定向到仪表盘
  if (to.path === '/' && authStore.isLoggedIn) {
    next('/dashboard');
  }
  // 未登录用户访问需要认证的页面：打开登录弹窗并停留在当前页
  else if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    if (from.path === to.path) {
      authStore.openLoginModal(to.fullPath);
      next(false);
    } else {
      authStore.openLoginModal(to.fullPath);
      next(from.path || '/');
    }
  }
  // 已登录用户访问 guest 页面（登录/注册），重定向到仪表盘
  else if (to.meta.guest && authStore.isLoggedIn) {
    next('/dashboard');
  }
  // 其他情况正常放行
  else {
    next();
  }
});

export default router;
