import type { Article } from '../models/article';
declare function getArticleContent(articleId: number): Promise<Article | null>;
declare function verifyOwnership(articleId: number, userId: number): Promise<boolean>;
declare function extractFullContent(articleId: number, userId: number): Promise<{
    success: boolean;
    content?: string;
    error?: string;
    source?: 'web' | 'rss';
}>;
declare function generateDownload(articleId: number, userId: number, format: 'md' | 'html' | 'docx'): Promise<{
    success: boolean;
    content?: string | Buffer;
    filename?: string;
    error?: string;
    contentType?: string;
}>;
export declare const articleService: {
    getArticleContent: typeof getArticleContent;
    verifyOwnership: typeof verifyOwnership;
    extractFullContent: typeof extractFullContent;
    generateDownload: typeof generateDownload;
};
export {};
//# sourceMappingURL=article.service.d.ts.map