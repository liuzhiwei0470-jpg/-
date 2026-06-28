import { Router } from 'express';
import { rssService } from '../services/index.js';

const router = Router();

// 公开API：获取分享文章内容（无需登录）
router.get('/share/:token', (req, res) => {
  const { token } = req.params;

  const article = rssService.getArticleByShareToken(token);

  if (!article) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: '分享链接不存在或已失效',
      },
    });
  }

  res.json({
    success: true,
    data: article,
  });
});

export default router;
