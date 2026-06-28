import { Router } from 'express';
import { rssService } from '../services/index';
const router = Router();
// 公开API：获取分享文章内容（无需登录）
router.get('/share/:token', async (req, res, next) => {
    try {
        const { token } = req.params;
        const article = await rssService.getArticleByShareToken(token);
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
    }
    catch (error) {
        next(error);
    }
});
export default router;
//# sourceMappingURL=share.routes.js.map