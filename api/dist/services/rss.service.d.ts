import type { ArticleResponse } from '../models/article';
export interface ParsedFeed {
    title: string;
    description: string;
    link: string;
    items: ParsedItem[];
}
export interface ParsedItem {
    title: string;
    link: string;
    pubDate: string;
    content: string;
    contentSnippet: string;
    guid: string;
    author: string;
}
export declare class RssService {
    parseFeed(url: string): Promise<ParsedFeed>;
    private matchFilters;
    syncSubscription(subscriptionId: number, routeUrl: string, filterInclude?: string | null, filterExclude?: string | null): Promise<number>;
    cleanupOldArticles(days?: number, subscriptionId?: number, userId?: number): Promise<number>;
    getArticleStats(): Promise<{
        total: number;
        favorite: number;
        shared: number;
        old: number;
    }>;
    deleteArticle(articleId: number, userId: number): Promise<boolean>;
    deleteArticles(articleIds: number[], userId: number): Promise<number>;
    deleteArticlesByCondition(userId: number, condition: {
        isRead?: boolean;
        isFavorite?: boolean;
        hasFullContent?: boolean;
        hasShareToken?: boolean;
        olderThanDays?: number;
        subscriptionId?: number;
    }): Promise<number>;
    getArticles(subscriptionId: number, page?: number, limit?: number, filters?: {
        isRead?: boolean;
        isFavorite?: boolean;
        hasFullContent?: boolean;
        hasShareToken?: boolean;
        sort?: 'newest' | 'oldest';
        search?: string;
    }): Promise<{
        list: ArticleResponse[];
        total: number;
    }>;
    getAllArticles(userId: number, page?: number, limit?: number, filters?: {
        isRead?: boolean;
        isFavorite?: boolean;
        hasFullContent?: boolean;
        hasShareToken?: boolean;
        subscriptionId?: number;
        search?: string;
        sort?: 'newest' | 'oldest';
    }): Promise<{
        list: (ArticleResponse & {
            subscriptionTitle?: string | null;
        })[];
        total: number;
    }>;
    getUnreadCount(userId: number): Promise<{
        total: number;
        bySubscription: Record<number, number>;
    }>;
    markAllAsReadGlobal(userId: number): Promise<number>;
    getArticle(articleId: number): Promise<ArticleResponse | null>;
    markAsRead(articleId: number, isRead?: boolean): Promise<boolean>;
    markAllAsRead(subscriptionId: number): Promise<number>;
    batchMarkAsRead(articleIds: number[], isRead?: boolean): Promise<number>;
    toggleFavorite(articleId: number): Promise<boolean>;
    verifyOwnership(articleId: number, userId: number): Promise<boolean>;
    private toIsoDate;
    getAdjacentArticles(articleId: number, userId: number): Promise<{
        prev: ArticleResponse | null;
        next: ArticleResponse | null;
    }>;
    generateShareToken(articleId: number, userId: number): Promise<{
        success: boolean;
        shareToken?: string;
        shareUrl?: string;
    }>;
    getArticleByShareToken(token: string): Promise<{
        id: number;
        title: string | null;
        content: string | null;
        author: string | null;
        published: string | null;
        subscriptionTitle: string;
        link: string | null;
    } | null>;
    private generateToken;
    private toResponse;
}
export declare const rssService: RssService;
//# sourceMappingURL=rss.service.d.ts.map