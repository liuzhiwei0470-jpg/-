import { Router } from 'express';
const router = Router();
// 健康检查
router.get('/health', (req, res) => {
    res.json({
        success: true,
        data: {
            status: 'ok',
            timestamp: new Date().toISOString(),
        },
    });
});
export default router;
//# sourceMappingURL=health.routes.js.map