export interface Article {
    id: number;
    subscription_id: number;
    guid: string;
    title: string | null;
    link: string | null;
    content: string | null;
    content_snippet: string | null;
    full_content: string | null;
    share_token: string | null;
    author: string | null;
    published: string | null;
    is_read: number;
    is_favorite: number;
    created_at: string;
}
export interface ArticleResponse {
    id: number;
    subscriptionId: number;
    guid: string;
    title: string | null;
    link: string | null;
    content: string | null;
    contentSnippet: string | null;
    fullContent: string | null;
    shareToken: string | null;
    hasFullContent: boolean;
    author: string | null;
    published: string | null;
    isRead: boolean;
    isFavorite: boolean;
    createdAt: string;
}
//# sourceMappingURL=article.d.ts.map