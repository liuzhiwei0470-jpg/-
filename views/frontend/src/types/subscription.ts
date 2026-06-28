// 预设标签
export interface Tag {
  id: string;
  name: string;
  icon: string;
}

export const PRESET_TAGS: Tag[] = [
  { id: 'ai', name: 'AI', icon: '🤖' },
  { id: 'tech', name: '科技', icon: '📱' },
  { id: 'finance', name: '金融', icon: '💰' },
  { id: 'business', name: '商业', icon: '💼' },
  { id: 'coding', name: '编程', icon: '💻' },
  { id: 'internet', name: '互联网', icon: '🌐' },
  { id: 'video', name: '视频', icon: '📺' },
  { id: 'social', name: '社交', icon: '💬' },
  { id: 'news', name: '新闻', icon: '📰' },
  { id: 'blog', name: '博客', icon: '📝' },
];

// 路由信息（带标签）
export interface Route {
  name: string;
  category: string;
  description: string;
  example: string;
  tags: string[];
}

// 订阅配置
export interface SubscriptionConfig {
  filterInclude: string;
  filterExclude: string;
  refreshInterval: number;
}

// 订阅（带配置）
export interface Subscription {
  id: number;
  routeUrl: string;
  title: string | null;
  tags: string[];
  filterInclude: string | null;
  filterExclude: string | null;
  refreshInterval: number;
  lastSyncTime?: string;
  createdAt: string;
  articleCount: number;
  unreadCount: number;
}

// 预设刷新间隔选项（分钟）
export const REFRESH_INTERVAL_OPTIONS = [
  { value: 30, label: '30分钟' },
  { value: 60, label: '1小时' },
  { value: 120, label: '2小时' },
  { value: 180, label: '3小时' },
  { value: 360, label: '6小时' },
  { value: 720, label: '12小时' },
  { value: 1440, label: '24小时' },
];

export const DEFAULT_REFRESH_INTERVAL = 120; // 默认2小时
