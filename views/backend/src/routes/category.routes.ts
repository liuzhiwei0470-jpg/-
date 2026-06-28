import { Router } from 'express';
import { z } from 'zod';
import { categoryService } from '../services/index.js';
import { authMiddleware, validateBody } from '../middleware/index.js';

const router = Router();

// 所有分类路由都需要登录
router.use(authMiddleware);

// 创建分类验证
const createSchema = z.object({
  name: z.string().min(1, '请输入分类名称'),
});

// 更新分类验证
const updateSchema = z.object({
  name: z.string().min(1, '请输入分类名称'),
});

// 获取分类列表
router.get('/', (req, res) => {
  const categories = categoryService.getByUserId(req.user!.userId);
  res.json({
    success: true,
    data: categories,
  });
});

// 创建分类
router.post('/', validateBody(createSchema), (req, res) => {
  const category = categoryService.create({
    userId: req.user!.userId,
    name: req.body.name,
  });
  res.status(201).json({
    success: true,
    data: category,
    message: '分类创建成功',
  });
});

// 更新分类
router.put('/:id', validateBody(updateSchema), (req, res) => {
  const category = categoryService.update(
    parseInt(req.params.id),
    req.user!.userId,
    req.body.name
  );
  if (!category) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: '分类不存在',
      },
    });
  }
  res.json({
    success: true,
    data: category,
    message: '分类更新成功',
  });
});

// 删除分类
router.delete('/:id', (req, res) => {
  const deleted = categoryService.delete(parseInt(req.params.id), req.user!.userId);
  if (!deleted) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: '分类不存在',
      },
    });
  }
  res.json({
    success: true,
    message: '分类删除成功',
  });
});

export default router;
