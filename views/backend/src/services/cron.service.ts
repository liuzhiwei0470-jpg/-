import cron from 'node-cron';
import db from '../models/database.js';
import { rssService } from './rss.service.js';

// 记录每个订阅上次刷新的时间戳
const lastSyncMap = new Map<number, number>();

export function startCronJobs() {
  // 启动时立即刷新所有订阅一次，并记录时间
  refreshAllSubscriptions();

  // 启动时清理一次旧文章
  cleanupOldArticles();

  // 每分钟检查一次哪些订阅需要刷新
  cron.schedule('* * * * *', async () => {
    await checkAndRefreshSubscriptions();
  });

  // 每天凌晨2点清理旧文章
  cron.schedule('0 2 * * *', () => {
    cleanupOldArticles();
  });

  console.log('⏰ 定时任务已启动（间隔轮询模式）');
}

async function checkAndRefreshSubscriptions() {
  try {
    const subscriptions = db.prepare(
      'SELECT id, route_url, filter_include, filter_exclude, refresh_interval FROM subscriptions'
    ).all() as any[];

    const now = Date.now();
    let refreshCount = 0;
    let totalNew = 0;

    for (const sub of subscriptions) {
      const intervalMs = (sub.refresh_interval || 120) * 60 * 1000;
      const lastSync = lastSyncMap.get(sub.id) || 0;

      // 如果距离上次刷新已超过间隔时间，则刷新
      if (now - lastSync >= intervalMs) {
        try {
          const count = await rssService.syncSubscription(
            sub.id,
            sub.route_url,
            sub.filter_include,
            sub.filter_exclude
          );
          lastSyncMap.set(sub.id, now);
          totalNew += count;
          refreshCount++;
          if (count > 0) {
            console.log(`  订阅 ${sub.id}: 新增 ${count} 篇`);
          }
        } catch (error) {
          console.error(`  订阅 ${sub.id} 刷新失败:`, error);
        }
      }
    }

    if (refreshCount > 0) {
      console.log(`✅ [${new Date().toLocaleTimeString('zh-CN')}] 已刷新 ${refreshCount} 个订阅, 新增 ${totalNew} 篇文章`);
    }
  } catch (error) {
    console.error('检查刷新订阅失败:', error);
  }
}

async function refreshAllSubscriptions() {
  try {
    const subscriptions = db.prepare(
      'SELECT id, route_url, filter_include, filter_exclude FROM subscriptions'
    ).all() as any[];

    console.log(`⏰ 启动时全量刷新 ${subscriptions.length} 个订阅...`);
    let totalNew = 0;

    for (const sub of subscriptions) {
      try {
        const count = await rssService.syncSubscription(
          sub.id,
          sub.route_url,
          sub.filter_include,
          sub.filter_exclude
        );
        lastSyncMap.set(sub.id, Date.now());
        totalNew += count;
        if (count > 0) {
          console.log(`  订阅 ${sub.id}: 新增 ${count} 篇`);
        }
      } catch (error) {
        console.error(`  订阅 ${sub.id} 刷新失败:`, error);
      }
    }

    console.log(`✅ 启动全量刷新完成, 新增 ${totalNew} 篇文章`);
  } catch (error) {
    console.error('启动全量刷新失败:', error);
  }
}

function cleanupOldArticles() {
  try {
    // 从数据库读取所有用户设置
    const userSettings = db.prepare(
      'SELECT user_id, auto_cleanup_enabled, auto_cleanup_days FROM user_settings WHERE auto_cleanup_enabled = 1'
    ).all() as { user_id: number; auto_cleanup_enabled: number; auto_cleanup_days: number }[];

    if (userSettings.length === 0) {
      console.log('✅ 自动清理已关闭，跳过清理');
      return;
    }

    let totalDeleted = 0;

    for (const settings of userSettings) {
      const deleted = rssService.cleanupOldArticles(settings.auto_cleanup_days, undefined, settings.user_id);
      totalDeleted += deleted;
      if (deleted > 0) {
        console.log(`🧹 用户 ${settings.user_id}: 清理了 ${deleted} 篇超过 ${settings.auto_cleanup_days} 天的旧文章`);
      }
    }

    if (totalDeleted > 0) {
      console.log(`✅ 清理完成，共删除了 ${totalDeleted} 篇旧文章`);
    } else {
      console.log(`✅ 没有需要清理的旧文章`);
    }
  } catch (error) {
    console.error('清理旧文章失败:', error);
  }
}
