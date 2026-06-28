import { authService } from '../services/auth.service';
// JWT认证中间件
export function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            error: {
                code: 'UNAUTHORIZED',
                message: '请先登录',
            },
        });
    }
    const token = authHeader.substring(7);
    try {
        const payload = authService.verifyToken(token);
        req.user = payload;
        next();
    }
    catch (error) {
        return res.status(401).json({
            success: false,
            error: {
                code: 'INVALID_TOKEN',
                message: 'Token已失效，请重新登录',
            },
        });
    }
}
// 可选认证中间件（不强制登录）
export function optionalAuthMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
            const payload = authService.verifyToken(token);
            req.user = payload;
        }
        catch (error) {
            // 忽略错误，继续执行
        }
    }
    next();
}
//# sourceMappingURL=auth.middleware.js.map