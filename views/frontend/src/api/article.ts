import api from './request';

export interface Article {
  id: number;
  subscriptionId: number;
  guid: string;
  title: string | null;
  link: string | null;
  content: string | null;
  contentSnippet: string | null;
  fullContent: string | null;
  hasFullContent: boolean;
  author: string | null;
  published: string | null;
  isRead: boolean;
  isFavorite: boolean;
  createdAt: string;
  subscriptionTitle?: string | null;
  prevArticle?: Article | null;
  nextArticle?: Article | null;
}

export interface PaginationData<T> {
  list: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UnreadCount {
  total: number;
  bySubscription: Record<number, number>;
}

export const articleApi = {
  preview(url: string) {
    return api.get<any, any>('/subscriptions/preview', { params: { url } });
  },

  sync(subscriptionId: number) {
    return api.post<any, any>(`/subscriptions/${subscriptionId}/sync`);
  },

  list(subscriptionId: number, params?: { page?: number; limit?: number; isRead?: boolean; isFavorite?: boolean; hasFullContent?: boolean; hasShareToken?: boolean; sort?: 'newest' | 'oldest'; search?: string }) {
    return api.get<any, any>(`/subscriptions/${subscriptionId}/articles`, { params });
  },

  all(params?: {
    page?: number;
    limit?: number;
    isRead?: boolean;
    isFavorite?: boolean;
    hasFullContent?: boolean;
    hasShareToken?: boolean;
    subscriptionId?: number;
    search?: string;
    sort?: 'newest' | 'oldest';
  }) {
    return api.get<any, any>('/subscriptions/articles', { params });
  },

  getUnreadCount() {
    return api.get<any, any>('/subscriptions/unread-count');
  },

  get(articleId: number) {
    return api.get<any, any>(`/subscriptions/articles/${articleId}`);
  },

  markAsRead(articleId: number, isRead: boolean = true) {
    return api.patch<any, any>(`/subscriptions/articles/${articleId}/read`, { isRead });
  },

  batchMarkAsRead(articleIds: number[], isRead: boolean = true) {
    return api.post<any, any>('/subscriptions/batch-read', { articleIds, isRead });
  },

  markAllAsRead(subscriptionId: number) {
    return api.post<any, any>(`/subscriptions/${subscriptionId}/mark-all-read`);
  },

  markAllAsReadGlobal() {
    return api.post<any, any>('/subscriptions/mark-all-read');
  },

  toggleFavorite(articleId: number) {
    return api.patch<any, any>(`/subscriptions/articles/${articleId}/favorite`);
  },

  // 提取全文
  extractFullContent(articleId: number) {
    return api.post<any, any>(`/subscriptions/articles/${articleId}/extract`, {}, {
      timeout: 60000,
    });
  },

  // 下载文章
  download(articleId: number, format: 'md' | 'html' | 'docx' = 'md') {
    return api.get<any, any>(`/subscriptions/articles/${articleId}/download`, {
      params: { format },
      responseType: 'blob',
    });
  },

  // 删除文章
  delete(articleId: number) {
    return api.delete<any, any>(`/subscriptions/articles/${articleId}`);
  },

  // 生成分享链接
  generateShareLink(articleId: number) {
    return api.post<any, any>(`/subscriptions/articles/${articleId}/share`);
  },

  // 批量删除文章
  batchDelete(articleIds: number[]) {
    return api.post<any, any>('/subscriptions/articles/batch-delete', { articleIds });
  },

  // 按条件清理文章
  cleanup(params: {
    isRead?: boolean;
    isFavorite?: boolean;
    hasFullContent?: boolean;
    olderThanDays?: number;
    subscriptionId?: number;
  }) {
    return api.post<any, any>('/subscriptions/articles/cleanup', params);
  },

  // 获取文章统计
  getStats() {
    return api.get<any, any>('/subscriptions/stats');
  },
};
