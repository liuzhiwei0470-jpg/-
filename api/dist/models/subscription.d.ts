export interface Subscription {
    id: number;
    user_id: number;
    category_id: number | null;
    route_url: string;
    title: string | null;
    config: string | null;
    filter_keywords: string | null;
    tags: string | null;
    filter_include: string | null;
    filter_exclude: string | null;
    refresh_times: string | null;
    refresh_interval: number;
    created_at: string;
}
export interface SubscriptionCreateInput {
    userId: number;
    categoryId?: number | null;
    routeUrl: string;
    title?: string;
    config?: Record<string, any>;
    filterKeywords?: string;
    tags?: string[];
    filterInclude?: string;
    filterExclude?: string;
    refreshInterval?: number;
}
export interface SubscriptionUpdateInput {
    categoryId?: number | null;
    title?: string;
    config?: Record<string, any>;
    filterKeywords?: string;
    tags?: string[];
    filterInclude?: string;
    filterExclude?: string;
    refreshInterval?: number;
}
export interface SubscriptionResponse {
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
    articleCount: number;
    unreadCount: number;
}
//# sourceMappingURL=subscription.d.ts.map