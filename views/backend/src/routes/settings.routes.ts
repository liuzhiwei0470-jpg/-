import { Router } from 'express';
import db from '../models/database.js';
import { authMiddleware } from '../middleware/index.js';

const router = Router();

router.use(authMiddleware);

// 获取用户设置
router.get('/settings', (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: '请先登录' },
    });
  }

  const settings = db.prepare(
    'SELECT auto_cleanup_enabled, auto_cleanup_days FROM user_settings WHERE user_id = ?'
  ).get(req.user.userId) as { auto_cleanup_enabled: number; auto_cleanup_days: number } | undefined;

  if (settings) {
    res.json({
      success: true,
      data: {
        autoCleanupEnabled: settings.auto_cleanup_enabled === 1,
        autoCleanupDays: settings.auto_cleanup_days,
      },
    });
  } else {
    // 如果没有设置记录，返回默认值
    res.json({
      success: true,
      data: {
        autoCleanupEnabled: true,
        autoCleanupDays: 30,
      },
    });
  }
});

// 更新用户设置
router.put('/settings', (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: '请先登录' },
    });
  }

  const { autoCleanupEnabled, autoCleanupDays } = req.body;

  // 如果没有设置记录，先创建
  const existing = db.prepare(
    'SELECT id FROM user_settings WHERE user_id = ?'
  ).get(req.user.userId);

  if (existing) {
    // 更新现有记录
    db.prepare(`
      UPDATE user_settings
      SET auto_cleanup_enabled = ?,
          auto_cleanup_days = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `).run(
      autoCleanupEnabled ? 1 : 0,
      autoCleanupDays || 30,
      req.user.userId
    );
  } else {
    // 创建新记录
    db.prepare(`
      INSERT INTO user_settings (user_id, auto_cleanup_enabled, auto_cleanup_days)
      VALUES (?, ?, ?)
    `).run(
      req.user.userId,
      autoCleanupEnabled ? 1 : 0,
      autoCleanupDays || 30
    );
  }

  res.json({
    success: true,
    message: '设置已保存',
  });
});

export default router;
