import { Router } from 'express';
import { z } from 'zod';
import { rssService, subscriptionService, articleService } from '../services/index.js';
import { authMiddleware, validateQuery } from '../middleware/index.js';

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
router.get('/articles', validateQuery(allArticlesSchema), (req, res) => {
  const { page, limit, isRead, isFavorite, hasFullContent, hasShareToken, subscriptionId, search, sort } = req.query as any;

  const result = rssService.getAllArticles(req.user!.userId, page, limit, {
    isRead: isRead !== undefined ? isRead === 'true' : undefined,
    isFavorite: isFavorite !== undefined ? isFavorite === 'true' : undefined,
    hasFullContent: hasFullContent !== undefined ? hasFullContent === 'true' : undefined,
    hasShareToken: hasShareToken !== undefined ? hasShareToken === 'true' : undefined,
    subscriptionId: subscriptionId,
    search: search,
    sort: sort as 'newest' | 'oldest',
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
});

// 获取未读计数
router.get('/unread-count', (req, res) => {
  const result = rssService.getUnreadCount(req.user!.userId);
  res.json({
    success: true,
    data: result,
  });
});

// 全局标记全部已读
router.post('/mark-all-read', (req, res) => {
  const count = rssService.markAllAsReadGlobal(req.user!.userId);
  res.json({
    success: true,
    data: { count },
    message: `已将 ${count} 篇文章标记为已读`,
  });
});

// 批量标记已读/未读
router.post('/batch-read', (req, res) => {
  const { articleIds, isRead } = req.body;

  if (!Array.isArray(articleIds) || articleIds.length === 0) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_PARAMS', message: '请选择要标记的文章' },
    });
  }

  const count = rssService.batchMarkAsRead(articleIds, isRead !== false);
  const action = isRead !== false ? '已读' : '未读';
  res.json({
    success: true,
    data: { count },
    message: `已将 ${count} 篇文章标记为${action}`,
  });
});

// 预览RSS源
router.get('/preview', validateQuery(previewSchema), async (req, res, next) => {
  try {
    const { url } = req.query as { url: string };
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
  } catch (error) {
    next(error);
  }
});

// 同步订阅文章
router.post('/:id/sync', async (req, res, next) => {
  try {
    const subscriptionId = parseInt(req.params.id);
    const subscription = subscriptionService.getById(subscriptionId);

    if (!subscription || subscription.userId !== req.user!.userId) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '订阅不存在',
        },
      });
    }

    const newCount = await rssService.syncSubscription(
      subscriptionId,
      subscription.routeUrl,
      subscription.filterInclude,
      subscription.filterExclude
    );

    res.json({
      success: true,
      data: {
        newCount,
      },
      message: `同步完成，新增 ${newCount} 篇文章`,
    });
  } catch (error) {
    next(error);
  }
});

// 获取订阅的文章列表
router.get('/:id/articles', validateQuery(articlesSchema), (req, res) => {
  const subscriptionId = parseInt(req.params.id);
  const subscription = subscriptionService.getById(subscriptionId);

  if (!subscription || subscription.userId !== req.user!.userId) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: '订阅不存在',
      },
    });
  }

  const { page, limit, isRead, isFavorite, hasFullContent, hasShareToken, sort, search } = req.query as any;

  const result = rssService.getArticles(subscriptionId, page, limit, {
    isRead: isRead !== undefined ? isRead === 'true' : undefined,
    isFavorite: isFavorite !== undefined ? isFavorite === 'true' : undefined,
    hasFullContent: hasFullContent !== undefined ? hasFullContent === 'true' : undefined,
    hasShareToken: hasShareToken !== undefined ? hasShareToken === 'true' : undefined,
    sort: sort as 'newest' | 'oldest',
    search: search as string | undefined,
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
});

// 获取文章详情
router.get('/articles/:articleId', (req, res) => {
  const articleId = parseInt(req.params.articleId);

  if (!rssService.verifyOwnership(articleId, req.user!.userId)) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: '文章不存在',
      },
    });
  }

  const article = rssService.getArticle(articleId);
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
  rssService.markAsRead(articleId, true);

  // 获取相邻文章
  const adjacent = rssService.getAdjacentArticles(articleId, req.user!.userId);

  res.json({
    success: true,
    data: {
      ...article,
      isRead: true,
      prevArticle: adjacent.prev,
      nextArticle: adjacent.next,
    },
  });
});

// 生成分享链接
router.post('/articles/:articleId/share', (req, res) => {
  const articleId = parseInt(req.params.articleId);
  const userId = req.user!.userId;

  const result = rssService.generateShareToken(articleId, userId);

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
});

// 标记文章已读/未读
router.patch('/articles/:articleId/read', (req, res) => {
  const articleId = parseInt(req.params.articleId);
  const { isRead } = req.body;

  if (!rssService.verifyOwnership(articleId, req.user!.userId)) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: '文章不存在',
      },
    });
  }

  const success = rssService.markAsRead(articleId, isRead !== false);
  res.json({
    success,
    message: success ? (isRead !== false ? '已标记为已读' : '已标记为未读') : '操作失败',
  });
});

// 全部标记已读
router.post('/:id/mark-all-read', (req, res) => {
  const subscriptionId = parseInt(req.params.id);
  const subscription = subscriptionService.getById(subscriptionId);

  if (!subscription || subscription.userId !== req.user!.userId) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: '订阅不存在',
      },
    });
  }

  const count = rssService.markAllAsRead(subscriptionId);
  res.json({
    success: true,
    data: { count },
    message: `已将 ${count} 篇文章标记为已读`,
  });
});

// 收藏/取消收藏
router.patch('/articles/:articleId/favorite', (req, res) => {
  const articleId = parseInt(req.params.articleId);

  if (!rssService.verifyOwnership(articleId, req.user!.userId)) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: '文章不存在',
      },
    });
  }

  const isFavorite = rssService.toggleFavorite(articleId);
  res.json({
    success: true,
    data: { isFavorite },
    message: isFavorite ? '已收藏' : '已取消收藏',
  });
});

// 提取全文
router.post('/articles/:articleId/extract', async (req, res) => {
  const articleId = parseInt(req.params.articleId);

  if (!rssService.verifyOwnership(articleId, req.user!.userId)) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: '文章不存在',
      },
    });
  }

  try {
    const result = await articleService.extractFullContent(articleId, req.user!.userId);
    if (result.success) {
      res.json({
        success: true,
        data: { 
          content: result.content,
          source: result.source,
        },
        message: result.source === 'rss' ? '已从 RSS 内容提取全文' : '全文提取成功',
      });
    } else {
      res.status(400).json({
        success: false,
        error: { code: 'EXTRACT_FAILED', message: result.error || '提取失败' },
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message },
    });
  }
});

// 下载文章
router.get('/articles/:articleId/download', async (req, res) => {
  const articleId = parseInt(req.params.articleId);
  const format = (req.query.format as string) || 'md';

  if (!rssService.verifyOwnership(articleId, req.user!.userId)) {
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

  try {
    const result = await articleService.generateDownload(articleId, req.user!.userId, format as 'md' | 'html' | 'docx');
    if (result.success) {
      const contentType = result.contentType || 'text/plain; charset=utf-8';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(result.filename!)}`);
      res.send(result.content);
    } else {
      res.status(400).json({
        success: false,
        error: { code: 'DOWNLOAD_FAILED', message: result.error || '下载失败' },
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message },
    });
  }
});

// 删除单篇文章
router.delete('/articles/:articleId', (req, res) => {
  const articleId = parseInt(req.params.articleId);
  const success = rssService.deleteArticle(articleId, req.user!.userId);

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
});

// 批量删除文章
router.post('/articles/batch-delete', (req, res) => {
  const { articleIds } = req.body;

  if (!Array.isArray(articleIds) || articleIds.length === 0) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_PARAMS', message: '请选择要删除的文章' },
    });
  }

  const count = rssService.deleteArticles(articleIds, req.user!.userId);
  res.json({
    success: true,
    data: { count },
    message: `已删除 ${count} 篇文章`,
  });
});

// 按条件删除文章
router.post('/articles/cleanup', (req, res) => {
  const { isRead, isFavorite, hasFullContent, olderThanDays, subscriptionId } = req.body;

  const count = rssService.deleteArticlesByCondition(req.user!.userId, {
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
});

// 获取文章统计信息
router.get('/stats', (req, res) => {
  const stats = rssService.getArticleStats();
  res.json({
    success: true,
    data: stats,
  });
});

export default router;
