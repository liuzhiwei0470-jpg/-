import { Router } from 'express';
import { z } from 'zod';
import { rssService, subscriptionService, articleService } from '../services/index';
import { authMiddleware, validateQuery } from '../middleware/index';
const router = Router();
// 所有路由都需要登录
router.use(authMiddleware);
// 预览RSS源验证
const previewSchema = z.object({
    url: z.string().min(1, '请输入RSS地址'),
});
// 文章列表查询验证
const articlesSchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    isRead: z.enum(['true', 'false']).optional(),
    isFavorite: z.enum(['true', 'false']).optional(),
    hasFullContent: z.enum(['true', 'false']).optional(),
    hasShareToken: z.enum(['true', 'false']).optional(),
    sort: z.enum(['newest', 'oldest']).default('newest'),
});
// 全部文章列表查询验证
const allArticlesSchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    isRead: z.enum(['true', 'false']).optional(),
    isFavorite: z.enum(['true', 'false']).optional(),
    hasFullContent: z.enum(['true', 'false']).optional(),
    hasShareToken: z.enum(['true', 'false']).optional(),
    subscriptionId: z.coerce.number().optional(),
    search: z.string().optional(),
    sort: z.enum(['newest', 'oldest']).default('newest'),
});
// 获取全部文章（跨订阅源）
router.get('/articles', validateQuery(allArticlesSchema), async (req, res, next) => {
    try {
        const { page, limit, isRead, isFavorite, hasFullContent, hasShareToken, subscriptionId, search, sort } = req.query;
        const result = await rssService.getAllArticles(req.user.userId, page, limit, {
            isRead: isRead !== undefined ? isRead === 'true' : undefined,
            isFavorite: isFavorite !== undefined ? isFavorite === 'true' : undefined,
            hasFullContent: hasFullContent !== undefined ? hasFullContent === 'true' : undefined,
            hasShareToken: hasShareToken !== undefined ? hasShareToken === 'true' : undefined,
            subscriptionId: subscriptionId,
            search: search,
            sort: sort,
        });
        res.json({
            success: true,
            data: {
                list: result.list,
                pagination: {
                    page,
                    limit,
                    total: result.total,
                    totalPages: Math.ceil(result.total / limit),
                },
            },
        });
    }
    catch (error) {
        next(error);
    }
});
// 获取未读计数
router.get('/unread-count', async (req, res, next) => {
    try {
        const result = await rssService.getUnreadCount(req.user.userId);
        res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        next(error);
    }
});
// 全局标记全部已读
router.post('/mark-all-read', async (req, res, next) => {
    try {
        const count = await rssService.markAllAsReadGlobal(req.user.userId);
        res.json({
            success: true,
            data: { count },
            message: `已将 ${count} 篇文章标记为已读`,
        });
    }
    catch (error) {
        next(error);
    }
});
// 批量标记已读/未读
router.post('/batch-read', async (req, res, next) => {
    try {
        const { articleIds, isRead } = req.body;
        if (!Array.isArray(articleIds) || articleIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_PARAMS', message: '请选择要标记的文章' },
            });
        }
        const count = await rssService.batchMarkAsRead(articleIds, isRead !== false);
        const action = isRead !== false ? '已读' : '未读';
        res.json({
            success: true,
            data: { count },
            message: `已将 ${count} 篇文章标记为${action}`,
        });
    }
    catch (error) {
        next(error);
    }
});
// 预览RSS源
router.get('/preview', validateQuery(previewSchema), async (req, res, next) => {
    try {
        const { url } = req.query;
        const feed = await rssService.parseFeed(url);
        res.json({
            success: true,
            data: {
                title: feed.title,
                description: feed.description,
                link: feed.link,
                items: feed.items.slice(0, 10),
                itemCount: feed.items.length,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
// 同步订阅文章
router.post('/:id/sync', async (req, res, next) => {
    try {
        const subscriptionId = parseInt(req.params.id);
        const subscription = await subscriptionService.getById(subscriptionId);
        if (!subscription || subscription.userId !== req.user.userId) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: '订阅不存在',
                },
            });
        }
        const newCount = await rssService.syncSubscription(subscriptionId, subscription.routeUrl, subscription.filterInclude, subscription.filterExclude);
        res.json({
            success: true,
            data: {
                newCount,
            },
            message: `同步完成，新增 ${newCount} 篇文章`,
        });
    }
    catch (error) {
        next(error);
    }
});
// 获取订阅的文章列表
router.get('/:id/articles', validateQuery(articlesSchema), async (req, res, next) => {
    try {
        const subscriptionId = parseInt(req.params.id);
        const subscription = await subscriptionService.getById(subscriptionId);
        if (!subscription || subscription.userId !== req.user.userId) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: '订阅不存在',
                },
            });
        }
        const { page, limit, isRead, isFavorite, hasFullContent, hasShareToken, sort, search } = req.query;
        const result = await rssService.getArticles(subscriptionId, page, limit, {
            isRead: isRead !== undefined ? isRead === 'true' : undefined,
            isFavorite: isFavorite !== undefined ? isFavorite === 'true' : undefined,
            hasFullContent: hasFullContent !== undefined ? hasFullContent === 'true' : undefined,
            hasShareToken: hasShareToken !== undefined ? hasShareToken === 'true' : undefined,
            sort: sort,
            search: search,
        });
        res.json({
            success: true,
            data: {
                list: result.list,
                pagination: {
                    page,
                    limit,
                    total: result.total,
                    totalPages: Math.ceil(result.total / limit),
                },
            },
        });
    }
    catch (error) {
        next(error);
    }
});
// 获取文章详情
router.get('/articles/:articleId', async (req, res, next) => {
    try {
        const articleId = parseInt(req.params.articleId);
        if (!(await rssService.verifyOwnership(articleId, req.user.userId))) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: '文章不存在',
                },
            });
        }
        const article = await rssService.getArticle(articleId);
        if (!article) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: '文章不存在',
                },
            });
        }
        // 自动标记已读
        await rssService.markAsRead(articleId, true);
        // 获取相邻文章
        const adjacent = await rssService.getAdjacentArticles(articleId, req.user.userId);
        res.json({
            success: true,
            data: {
                ...article,
                isRead: true,
                prevArticle: adjacent.prev,
                nextArticle: adjacent.next,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
// 生成分享链接
router.post('/articles/:articleId/share', async (req, res, next) => {
    try {
        const articleId = parseInt(req.params.articleId);
        const userId = req.user.userId;
        const result = await rssService.generateShareToken(articleId, userId);
        if (!result.success) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: '文章不存在或无权限',
                },
            });
        }
        res.json({
            success: true,
            data: {
                shareToken: result.shareToken,
                shareUrl: result.shareUrl,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
// 标记文章已读/未读
router.patch('/articles/:articleId/read', async (req, res, next) => {
    try {
        const articleId = parseInt(req.params.articleId);
        const { isRead } = req.body;
        if (!(await rssService.verifyOwnership(articleId, req.user.userId))) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: '文章不存在',
                },
            });
        }
        const success = await rssService.markAsRead(articleId, isRead !== false);
        res.json({
            success,
            message: success ? (isRead !== false ? '已标记为已读' : '已标记为未读') : '操作失败',
        });
    }
    catch (error) {
        next(error);
    }
});
// 全部标记已读
router.post('/:id/mark-all-read', async (req, res, next) => {
    try {
        const subscriptionId = parseInt(req.params.id);
        const subscription = await subscriptionService.getById(subscriptionId);
        if (!subscription || subscription.userId !== req.user.userId) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: '订阅不存在',
                },
            });
        }
        const count = await rssService.markAllAsRead(subscriptionId);
        res.json({
            success: true,
            data: { count },
            message: `已将 ${count} 篇文章标记为已读`,
        });
    }
    catch (error) {
        next(error);
    }
});
// 收藏/取消收藏
router.patch('/articles/:articleId/favorite', async (req, res, next) => {
    try {
        const articleId = parseInt(req.params.articleId);
        if (!(await rssService.verifyOwnership(articleId, req.user.userId))) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: '文章不存在',
                },
            });
        }
        const isFavorite = await rssService.toggleFavorite(articleId);
        res.json({
            success: true,
            data: { isFavorite },
            message: isFavorite ? '已收藏' : '已取消收藏',
        });
    }
    catch (error) {
        next(error);
    }
});
// 提取全文
router.post('/articles/:articleId/extract', async (req, res, next) => {
    try {
        const articleId = parseInt(req.params.articleId);
        if (!(await rssService.verifyOwnership(articleId, req.user.userId))) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: '文章不存在',
                },
            });
        }
        const result = await articleService.extractFullContent(articleId, req.user.userId);
        if (result.success) {
            res.json({
                success: true,
                data: {
                    content: result.content,
                    source: result.source,
                },
                message: result.source === 'rss' ? '已从 RSS 内容提取全文' : '全文提取成功',
            });
        }
        else {
            res.status(400).json({
                success: false,
                error: { code: 'EXTRACT_FAILED', message: result.error || '提取失败' },
            });
        }
    }
    catch (error) {
        next(error);
    }
});
// 下载文章
router.get('/articles/:articleId/download', async (req, res, next) => {
    try {
        const articleId = parseInt(req.params.articleId);
        const format = req.query.format || 'md';
        if (!(await rssService.verifyOwnership(articleId, req.user.userId))) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: '文章不存在',
                },
            });
        }
        if (!['md', 'html', 'docx'].includes(format)) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_FORMAT', message: '仅支持 md、html 或 docx 格式' },
            });
        }
        const result = await articleService.generateDownload(articleId, req.user.userId, format);
        if (result.success) {
            const contentType = result.contentType || 'text/plain; charset=utf-8';
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(result.filename)}`);
            res.send(result.content);
        }
        else {
            res.status(400).json({
                success: false,
                error: { code: 'DOWNLOAD_FAILED', message: result.error || '下载失败' },
            });
        }
    }
    catch (error) {
        next(error);
    }
});
// 删除单篇文章
router.delete('/articles/:articleId', async (req, res, next) => {
    try {
        const articleId = parseInt(req.params.articleId);
        const success = await rssService.deleteArticle(articleId, req.user.userId);
        if (!success) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: '文章不存在',
                },
            });
        }
        res.json({
            success: true,
            message: '删除成功',
        });
    }
    catch (error) {
        next(error);
    }
});
// 批量删除文章
router.post('/articles/batch-delete', async (req, res, next) => {
    try {
        const { articleIds } = req.body;
        if (!Array.isArray(articleIds) || articleIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_PARAMS', message: '请选择要删除的文章' },
            });
        }
        const count = await rssService.deleteArticles(articleIds, req.user.userId);
        res.json({
            success: true,
            data: { count },
            message: `已删除 ${count} 篇文章`,
        });
    }
    catch (error) {
        next(error);
    }
});
// 按条件删除文章
router.post('/articles/cleanup', async (req, res, next) => {
    try {
        const { isRead, isFavorite, hasFullContent, olderThanDays, subscriptionId } = req.body;
        const count = await rssService.deleteArticlesByCondition(req.user.userId, {
            isRead: isRead !== undefined ? isRead : undefined,
            isFavorite: isFavorite !== undefined ? isFavorite : undefined,
            hasFullContent: hasFullContent !== undefined ? hasFullContent : undefined,
            olderThanDays: olderThanDays !== undefined ? parseInt(olderThanDays) : undefined,
            subscriptionId: subscriptionId !== undefined ? parseInt(subscriptionId) : undefined,
        });
        res.json({
            success: true,
            data: { count },
            message: `已清理 ${count} 篇文章`,
        });
    }
    catch (error) {
        next(error);
    }
});
// 获取文章统计信息
router.get('/stats', async (req, res, next) => {
    try {
        const stats = await rssService.getArticleStats();
        res.json({
            success: true,
            data: stats,
        });
    }
    catch (error) {
        next(error);
    }
});
export default router;
//# sourceMappingURL=article.routes.js.map