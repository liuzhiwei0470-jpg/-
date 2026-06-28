<template>
  <div class="routes-page">
    <header class="page-header">
      <h1>订阅库</h1>
      <div class="search-box">
        <Search :size="16" class="search-icon" />
        <input
          v-model="keyword"
          type="text"
          class="form-input"
          placeholder="搜索路由..."
        />
      </div>
    </header>

    <main class="page-main">
      <div class="categories">
        <button
          v-for="cat in categories"
          :key="cat"
          :class="['category-btn', { active: selectedCategory === cat }]"
          @click="selectedCategory = cat"
        >
          {{ cat }}
        </button>
      </div>

      <div v-if="loading" class="loading">加载中...</div>

      <div v-else class="routes-grid">
        <div v-for="route in filteredRoutes" :key="route.name" class="route-card">
          <div class="route-header">
            <span class="route-category">{{ route.category }}</span>
            <h3>{{ route.name }}</h3>
          </div>
          <div class="route-body">
            <p class="route-description">{{ route.description }}</p>
            <div class="route-example">
              <code>{{ route.example }}</code>
            </div>
          </div>
          <div class="route-footer">
            <button @click="copyRoute(route)" class="btn btn-ghost">
              <Copy :size="14" />
              复制
            </button>
            <button
              @click="addSubscription(route)"
              class="btn btn-primary"
              :disabled="addingRoute === route.example"
            >
              <Plus v-if="!isSubscribed(route.example)" :size="14" />
              <Check v-else :size="14" />
              {{ addingRoute === route.example ? '添加中...' : (isSubscribed(route.example) ? '已订阅' : '添加订阅') }}
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useSubscriptionStore } from '@/stores/subscription';
import { useRouter } from 'vue-router';
import { useToast } from '@/composables/useToast';
import {
  Search,
  Copy,
  Plus,
  Check
} from 'lucide-vue-next';

interface Route {
  name: string;
  category: string;
  description: string;
  example: string;
}

const router = useRouter();
const subscriptionStore = useSubscriptionStore();

const toast = useToast();

const keyword = ref('');
const selectedCategory = ref('全部');
const loading = ref(false);
const addingRoute = ref('');
const subscribedRoutes = ref<string[]>([]);

const categories = ['全部', '科技资讯', '技术开发', '财经商业', '社区热榜', '阅读文化', '个人博客'];

const routes = ref<Route[]>([
  {
    name: '知乎热榜',
    category: '社区热榜',
    description: '知乎全站热榜问题，实时了解热门话题',
    example: '/zhihu/hot',
  },
  {
    name: '知乎日报',
    category: '科技资讯',
    description: '知乎日报每日推荐精选内容',
    example: '/zhihu/daily',
  },
  {
    name: '36氪',
    category: '科技资讯',
    description: '36氪最新资讯，关注创业和科技',
    example: '/36kr/news/latest',
  },
  {
    name: '虎嗅网',
    category: '科技资讯',
    description: '虎嗅网最新文章，深度科技商业分析',
    example: '/huxiu/article',
  },
  {
    name: '澎湃新闻',
    category: '科技资讯',
    description: '澎湃新闻精选报道，优质新闻内容',
    example: '/thepaper/featured',
  },
  {
    name: '财新网',
    category: '财经商业',
    description: '财新网最新资讯，权威财经新闻',
    example: '/caixin/latest',
  },
  {
    name: '华尔街见闻',
    category: '财经商业',
    description: '华尔街见闻全球财经资讯',
    example: '/wallstreetcn/news/latest',
  },
  {
    name: '财联社电报',
    category: '财经商业',
    description: '财联社7x24小时实时财经快讯',
    example: '/cls/telegraph',
  },
  {
    name: 'Readhub',
    category: '科技资讯',
    description: 'Readhub热门话题，科技资讯聚合',
    example: '/readhub/topic',
  },
  {
    name: '果壳网',
    category: '阅读文化',
    description: '果壳网科学人，有趣的科普内容',
    example: '/guokr/scientific',
  },
  {
    name: '豆瓣新片榜',
    category: '阅读文化',
    description: '豆瓣电影最新上映影片',
    example: '/douban/movie/playing',
  },
  {
    name: '豆瓣新书榜',
    category: '阅读文化',
    description: '豆瓣读书最新上架书籍',
    example: '/douban/book/latest',
  },
  {
    name: '掘金前端',
    category: '技术开发',
    description: '掘金前端频道优质技术文章',
    example: '/juejin/category/frontend',
  },
  {
    name: 'Hacker News',
    category: '技术开发',
    description: 'Hacker News热门技术讨论',
    example: '/hackernews',
  },
  {
    name: '阮一峰的网络日志',
    category: '个人博客',
    description: '科技爱好者周刊和技术文章',
    example: 'https://www.ruanyifeng.com/blog/atom.xml',
  },
]);

const filteredRoutes = computed(() => {
  return routes.value.filter((route) => {
    const matchKeyword = keyword.value === '' ||
      route.name.includes(keyword.value) ||
      route.description.includes(keyword.value);
    const matchCategory = selectedCategory.value === '全部' ||
      route.category === selectedCategory.value;
    return matchKeyword && matchCategory;
  });
});

function copyRoute(route: Route) {
  navigator.clipboard.writeText(route.example);
  toast.success('已复制到剪贴板');
}

function isSubscribed(routeUrl: string) {
  return subscribedRoutes.value.includes(routeUrl);
}

async function addSubscription(route: Route) {
  if (isSubscribed(route.example)) {
    router.push('/subscriptions');
    return;
  }

  addingRoute.value = route.example;
  try {
    await subscriptionStore.createSubscription({
      routeUrl: route.example,
      title: route.name,
    });
    subscribedRoutes.value.push(route.example);
    toast.success('订阅添加成功！');
  } catch (error: any) {
    const message = error?.response?.data?.error?.message || '添加失败，请稍后重试';
    toast.error(message);
  } finally {
    addingRoute.value = '';
  }
}

async function loadSubscribedRoutes() {
  try {
    const list = await subscriptionStore.fetchAllSubscriptions();
    subscribedRoutes.value = list.map((sub: any) => sub.routeUrl);
  } catch (error) {
    console.error('加载订阅列表失败:', error);
  }
}

onMounted(() => {
  loadSubscribedRoutes();
});
</script>

<style scoped>
.routes-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-lg) var(--space-xl);
  background: var(--color-white);
  border-bottom: 1px solid var(--color-border);
}

.page-header h1 {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.search-box {
  position: relative;
  width: 280px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-muted);
  pointer-events: none;
}

.search-box .form-input {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  padding-left: 36px;
}

.page-main {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-lg) var(--space-xl);
}

.categories {
  display: flex;
  gap: var(--space-sm);
  margin-bottom: var(--space-lg);
  flex-wrap: wrap;
}

.category-btn {
  padding: var(--space-xs) var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-white);
  cursor: pointer;
  font-size: 14px;
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
}

.category-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.category-btn.active {
  background: var(--color-primary);
  color: var(--color-white);
  border-color: var(--color-primary);
}

.loading {
  text-align: center;
  padding: var(--space-2xl);
  color: var(--color-text-secondary);
}

.routes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-md);
}

.route-card {
  background: var(--color-white);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  overflow: hidden;
}

.route-header {
  padding: var(--space-md) var(--space-lg);
  border-bottom: 1px solid var(--color-border);
}

.route-category {
  font-size: 12px;
  color: var(--color-primary);
  font-weight: 500;
}

.route-header h3 {
  margin-top: var(--space-xs);
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.route-body {
  padding: var(--space-md) var(--space-lg);
}

.route-description {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-sm);
  line-height: 1.5;
}

.route-example {
  background: var(--color-bg);
  border-radius: var(--radius-sm);
  padding: var(--space-sm);
}

.route-example code {
  display: block;
  font-size: 12px;
  color: var(--color-text-primary);
  word-break: break-all;
}

.route-footer {
  padding: var(--space-md) var(--space-lg);
  border-top: 1px solid var(--color-border);
  display: flex;
  gap: var(--space-sm);
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: var(--space-md);
    padding: var(--space-md);
  }

  .search-box {
    width: 100%;
  }

  .page-main {
    padding: var(--space-md);
  }

  .routes-grid {
    grid-template-columns: 1fr;
  }
}
</style>
