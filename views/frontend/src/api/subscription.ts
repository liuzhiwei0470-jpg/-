import api from './request';

export interface Subscription {
  id: number;
  userId: number;
  categoryId: number | null;
  routeUrl: string;
  title: string | null;
  config: Record<string, any> | null;
  filterKeywords: string | null;
  tags: string[];
  filterInclude: string | null;
  filterExclude: string | null;
  refreshInterval: number;
  createdAt: string;
}

export interface SubscriptionCreateInput {
  routeUrl: string;
  title?: string;
  categoryId?: number;
  filterKeywords?: string;
  tags?: string[];
  filterInclude?: string;
  filterExclude?: string;
  refreshInterval?: number;
  config?: Record<string, any>;
}

export interface SubscriptionUpdateInput {
  title?: string;
  categoryId?: number | null;
  filterKeywords?: string;
  tags?: string[];
  filterInclude?: string;
  filterExclude?: string;
  refreshInterval?: number;
  config?: Record<string, any>;
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

// 路由信息
export interface Route {
  name: string;
  category: string;
  description: string;
  example: string;
  tags: string[];
}

export const subscriptionApi = {
  list(params?: { page?: number; limit?: number; categoryId?: number }) {
    return api.get<any, any>('/subscriptions', { params });
  },

  get(id: number) {
    return api.get<any, any>(`/subscriptions/${id}`);
  },

  create(data: SubscriptionCreateInput) {
    return api.post<any, any>('/subscriptions', data);
  },

  update(id: number, data: SubscriptionUpdateInput) {
    return api.put<any, any>(`/subscriptions/${id}`, data);
  },

  delete(id: number) {
    return api.delete<any, any>(`/subscriptions/${id}`);
  },
};

// 路由API
export const routeApi = {
  getRoutes() {
    return api.get<any, any>('/subscriptions/routes');
  },
};
