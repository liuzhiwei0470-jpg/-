// 统一错误处理
export function errorHandler(err, req, res, next) {
    console.error('Error:', err);
    // 已知错误类型
    if (err.message === 'EMAIL_EXISTS') {
        return res.status(400).json({
            success: false,
            error: {
                code: 'EMAIL_EXISTS',
                message: '该邮箱已被注册',
            },
        });
    }
    if (err.message === 'INVALID_CREDENTIALS') {
        return res.status(401).json({
            success: false,
            error: {
                code: 'INVALID_CREDENTIALS',
                message: '邮箱或密码错误',
            },
        });
    }
    // 默认错误响应
    res.status(500).json({
        success: false,
        error: {
            code: 'INTERNAL_ERROR',
            message: '服务器内部错误',
        },
    });
}
// 404处理
export function notFoundHandler(req, res) {
    res.status(404).json({
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: '接口不存在',
        },
    });
}
//# sourceMappingURL=error.middleware.js.map