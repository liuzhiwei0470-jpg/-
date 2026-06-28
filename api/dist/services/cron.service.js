import cron from 'node-cron';
import { getAllRows } from '../models/database.js';
import { rssService } from './rss.service.js';
const lastSyncMap = new Map();
export function startCronJobs() {
    refreshAllSubscriptions();
    cleanupOldArticles();
    cron.schedule('* * * * *', async () => {
        await checkAndRefreshSubscriptions();
    });
    cron.schedule('0 2 * * *', () => {
        cleanupOldArticles();
    });
    console.log('⏰ 定时任务已启动（间隔轮询模式）');
}
async function checkAndRefreshSubscriptions() {
    try {
        const subscriptions = await getAllRows('SELECT id, route_url, filter_include, filter_exclude, refresh_interval FROM subscriptions');
        const now = Date.now();
        let refreshCount = 0;
        let totalNew = 0;
        for (const sub of subscriptions) {
            const intervalMs = (sub.refresh_interval || 120) * 60 * 1000;
            const lastSync = lastSyncMap.get(sub.id) || 0;
            if (now - lastSync >= intervalMs) {
                try {
                    const count = await rssService.syncSubscription(sub.id, sub.route_url, sub.filter_include, sub.filter_exclude);
                    lastSyncMap.set(sub.id, now);
                    totalNew += count;
                    refreshCount++;
                    if (count > 0) {
                        console.log(`  订阅 ${sub.id}: 新增 ${count} 篇`);
                    }
                }
                catch (error) {
                    console.error(`  订阅 ${sub.id} 刷新失败:`, error);
                }
            }
        }
        if (refreshCount > 0) {
            console.log(`✅ [${new Date().toLocaleTimeString('zh-CN')}] 已刷新 ${refreshCount} 个订阅, 新增 ${totalNew} 篇文章`);
        }
    }
    catch (error) {
        console.error('检查刷新订阅失败:', error);
    }
}
async function refreshAllSubscriptions() {
    try {
        const subscriptions = await getAllRows('SELECT id, route_url, filter_include, filter_exclude FROM subscriptions');
        console.log(`⏰ 启动时全量刷新 ${subscriptions.length} 个订阅...`);
        let totalNew = 0;
        for (const sub of subscriptions) {
            try {
                const count = await rssService.syncSubscription(sub.id, sub.route_url, sub.filter_include, sub.filter_exclude);
                lastSyncMap.set(sub.id, Date.now());
                totalNew += count;
                if (count > 0) {
                    console.log(`  订阅 ${sub.id}: 新增 ${count} 篇`);
                }
            }
            catch (error) {
                console.error(`  订阅 ${sub.id} 刷新失败:`, error);
            }
        }
        console.log(`✅ 启动全量刷新完成, 新增 ${totalNew} 篇文章`);
    }
    catch (error) {
        console.error('启动全量刷新失败:', error);
    }
}
async function cleanupOldArticles() {
    try {
        const userSettings = await getAllRows('SELECT user_id, auto_cleanup_enabled, auto_cleanup_days FROM user_settings WHERE auto_cleanup_enabled = 1');
        if (userSettings.length === 0) {
            console.log('✅ 自动清理已关闭，跳过清理');
            return;
        }
        let totalDeleted = 0;
        for (const settings of userSettings) {
            const deleted = await rssService.cleanupOldArticles(settings.auto_cleanup_days, undefined, settings.user_id);
            totalDeleted += deleted;
            if (deleted > 0) {
                console.log(`🧹 用户 ${settings.user_id}: 清理了 ${deleted} 篇超过 ${settings.auto_cleanup_days} 天的旧文章`);
            }
        }
        if (totalDeleted > 0) {
            console.log(`✅ 清理完成，共删除了 ${totalDeleted} 篇旧文章`);
        }
        else {
            console.log(`✅ 没有需要清理的旧文章`);
        }
    }
    catch (error) {
        console.error('清理旧文章失败:', error);
    }
}
//# sourceMappingURL=cron.service.js.map