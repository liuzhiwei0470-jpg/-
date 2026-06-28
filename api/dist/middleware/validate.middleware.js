import { ZodError } from 'zod';
// 验证请求体
export function validateBody(schema) {
    return (req, res, next) => {
        try {
            req.body = schema.parse(req.body);
            next();
        }
        catch (error) {
            if (error instanceof ZodError) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
                    },
                });
            }
            next(error);
        }
    };
}
// 验证查询参数
export function validateQuery(schema) {
    return (req, res, next) => {
        try {
            req.query = schema.parse(req.query);
            next();
        }
        catch (error) {
            if (error instanceof ZodError) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
                    },
                });
            }
            next(error);
        }
    };
}
//# sourceMappingURL=validate.middleware.js.map