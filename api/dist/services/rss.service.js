import Parser from 'rss-parser';
import { getRow, getAllRows, runSql } from '../models/database';
import { config } from '../config/index';
const parser = new Parser({
    timeout: 15000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GerenQingbaoguan/1.0)',
    },
});
const DEFAULT_RSSHUB_BASE = config.rsshub.baseUrl;
export class RssService {
    async parseFeed(url) {
        let fullUrl = url;
        if (url.startsWith('/')) {
            fullUrl = DEFAULT_RSSHUB_BASE + url;
        }
        const feed = await parser.parseURL(fullUrl);
        return {
            title: feed.title || '',
            description: feed.description || '',
            link: feed.link || '',
            items: (feed.items || []).map((item) => ({
                title: item.title || '',
                link: item.link || '',
                pubDate: item.pubDate || item.isoDate || '',
                content: item.content || item['content:encoded'] || '',
                contentSnippet: item.contentSnippet || '',
                guid: item.guid || item.link || '',
                author: item.creator || item.author || '',
            })),
        };
    }
    matchFilters(title, contentSnippet, filterInclude, filterExclude) {
        const text = (title + ' ' + contentSnippet).toLowerCase();
        if (filterExclude) {
            const excludeKeywords = filterExclude.split(',').map(k => k.trim().toLowerCase()).filter(k => k);
            for (const keyword of excludeKeywords) {
                if (text.includes(keyword)) {
                    return false;
                }
            }
        }
        if (filterInclude) {
            const includeKeywords = filterInclude.split(',').map(k => k.trim().toLowerCase()).filter(k => k);
            if (includeKeywords.length > 0) {
                let matched = false;
                for (const keyword of includeKeywords) {
                    if (text.includes(keyword)) {
                        matched = true;
                        break;
                    }
                }
                if (!matched) {
                    return false;
                }
            }
        }
        return true;
    }
    async syncSubscription(subscriptionId, routeUrl, filterInclude, filterExclude) {
        try {
            const feed = await this.parseFeed(routeUrl);
            let newCount = 0;
            for (const item of feed.items) {
                if (!this.matchFilters(item.title, item.contentSnippet, filterInclude || null, filterExclude || null)) {
                    continue;
                }
                const existing = await getRow('SELECT id FROM articles WHERE subscription_id = ? AND guid = ?', subscriptionId, item.guid);
                if (!existing) {
                    await runSql(`INSERT INTO articles (subscription_id, guid, title, link, content, content_snippet, author, published)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, subscriptionId, item.guid, item.title, item.link, item.content, item.contentSnippet || '', item.author, item.pubDate ? new Date(item.pubDate).toISOString() : null);
                    newCount++;
                }
            }
            return newCount;
        }
        catch (error) {
            console.error(`同步订阅 ${subscriptionId} 失败:`, error);
            throw error;
        }
    }
    async cleanupOldArticles(days = 30, subscriptionId, userId) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const cutoffStr = cutoffDate.toISOString();
        let whereClause = `WHERE is_favorite = 0
      AND (full_content IS NULL OR full_content = '')
      AND (share_token IS NULL OR share_token = '')
      AND published < ?`;
        const params = [cutoffStr];
        if (subscriptionId !== undefined) {
            whereClause += ' AND subscription_id = ?';
            params.push(subscriptionId);
        }
        if (userId !== undefined) {
            whereClause += ` AND subscription_id IN (
        SELECT id FROM subscriptions WHERE user_id = ?
      )`;
            params.push(userId);
        }
        const result = await runSql(`DELETE FROM articles ${whereClause}`, ...params);
        return result.changes || 0;
    }
    async getArticleStats() {
        const totalRow = await getRow('SELECT COUNT(*) as count FROM articles');
        const favoriteRow = await getRow('SELECT COUNT(*) as count FROM articles WHERE is_favorite = 1');
        const sharedRow = await getRow("SELECT COUNT(*) as count FROM articles WHERE share_token IS NOT NULL AND share_token != ''");
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const oldRow = await getRow("SELECT COUNT(*) as count FROM articles WHERE is_favorite = 0 AND (full_content IS NULL OR full_content = '') AND (share_token IS NULL OR share_token = '') AND published < ?", thirtyDaysAgo.toISOString());
        return {
            total: totalRow?.count || 0,
            favorite: favoriteRow?.count || 0,
            shared: sharedRow?.count || 0,
            old: oldRow?.count || 0,
        };
    }
    async deleteArticle(articleId, userId) {
        const article = await getRow('SELECT a.id FROM articles a JOIN subscriptions s ON a.subscription_id = s.id WHERE a.id = ? AND s.user_id = ?', articleId, userId);
        if (!article) {
            return false;
        }
        await runSql('DELETE FROM articles WHERE id = ?', articleId);
        return true;
    }
    async deleteArticles(articleIds, userId) {
        if (articleIds.length === 0)
            return 0;
        const placeholders = articleIds.map(() => '?').join(',');
        const result = await runSql(`DELETE FROM articles WHERE id IN (${placeholders}) AND subscription_id IN (
        SELECT id FROM subscriptions WHERE user_id = ?
      )`, ...articleIds, userId);
        return result.changes || 0;
    }
    async deleteArticlesByCondition(userId, condition) {
        let whereClause = 'WHERE subscription_id IN (SELECT id FROM subscriptions WHERE user_id = ?)';
        const params = [userId];
        if (condition.isRead !== undefined) {
            whereClause += ' AND is_read = ?';
            params.push(condition.isRead ? 1 : 0);
        }
        if (condition.isFavorite !== undefined) {
            whereClause += ' AND is_favorite = ?';
            params.push(condition.isFavorite ? 1 : 0);
        }
        if (condition.hasFullContent !== undefined) {
            if (condition.hasFullContent) {
                whereClause += " AND full_content IS NOT NULL AND full_content != ''";
            }
            else {
                whereClause += " AND (full_content IS NULL OR full_content = '')";
            }
        }
        if (condition.hasShareToken !== undefined) {
            if (condition.hasShareToken) {
                whereClause += " AND share_token IS NOT NULL AND share_token != ''";
            }
            else {
                whereClause += " AND (share_token IS NULL OR share_token = '')";
            }
        }
        if (condition.olderThanDays !== undefined) {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - condition.olderThanDays);
            whereClause += ' AND published < ?';
            params.push(cutoffDate.toISOString());
        }
        if (condition.subscriptionId !== undefined) {
            whereClause += ' AND subscription_id = ?';
            params.push(condition.subscriptionId);
        }
        const result = await runSql(`DELETE FROM articles ${whereClause}`, ...params);
        return result.changes || 0;
    }
    async getArticles(subscriptionId, page = 1, limit = 20, filters = {}) {
        const offset = (page - 1) * limit;
        let whereClause = 'WHERE subscription_id = ?';
        const params = [subscriptionId];
        if (filters.isRead !== undefined) {
            whereClause += ' AND is_read = ?';
            params.push(filters.isRead ? 1 : 0);
        }
        if (filters.isFavorite !== undefined) {
            whereClause += ' AND is_favorite = ?';
            params.push(filters.isFavorite ? 1 : 0);
        }
        if (filters.hasFullContent !== undefined) {
            if (filters.hasFullContent) {
                whereClause += " AND full_content IS NOT NULL AND full_content != ''";
            }
            else {
                whereClause += " AND (full_content IS NULL OR full_content = '')";
            }
        }
        if (filters.hasShareToken !== undefined) {
            if (filters.hasShareToken) {
                whereClause += " AND share_token IS NOT NULL AND share_token != ''";
            }
            else {
                whereClause += " AND (share_token IS NULL OR share_token = '')";
            }
        }
        if (filters.search) {
            whereClause += ' AND (title LIKE ? OR content LIKE ?)';
            const searchPattern = `%${filters.search}%`;
            params.push(searchPattern, searchPattern);
        }
        const totalResult = await getRow(`SELECT COUNT(*) as count FROM articles ${whereClause}`, ...params);
        const sortOrder = filters.sort === 'oldest' ? 'ASC' : 'DESC';
        const rows = await getAllRows(`SELECT * FROM articles ${whereClause} ORDER BY published ${sortOrder}, id ${sortOrder} LIMIT ? OFFSET ?`, ...params, limit, offset);
        return {
            list: rows.map(row => this.toResponse(row)),
            total: totalResult?.count || 0,
        };
    }
    async getAllArticles(userId, page = 1, limit = 20, filters = {}) {
        const offset = (page - 1) * limit;
        let whereClause = 'WHERE s.user_id = ?';
        const params = [userId];
        if (filters.subscriptionId !== undefined) {
            whereClause += ' AND a.subscription_id = ?';
            params.push(filters.subscriptionId);
        }
        if (filters.isRead !== undefined) {
            whereClause += ' AND a.is_read = ?';
            params.push(filters.isRead ? 1 : 0);
        }
        if (filters.isFavorite !== undefined) {
            whereClause += ' AND a.is_favorite = ?';
            params.push(filters.isFavorite ? 1 : 0);
        }
        if (filters.hasFullContent !== undefined) {
            if (filters.hasFullContent) {
                whereClause += " AND a.full_content IS NOT NULL AND a.full_content != ''";
            }
            else {
                whereClause += " AND (a.full_content IS NULL OR a.full_content = '')";
            }
        }
        if (filters.hasShareToken !== undefined) {
            if (filters.hasShareToken) {
                whereClause += " AND a.share_token IS NOT NULL AND a.share_token != ''";
            }
            else {
                whereClause += " AND (a.share_token IS NULL OR a.share_token = '')";
            }
        }
        if (filters.search) {
            whereClause += ' AND (a.title LIKE ? OR a.content LIKE ? OR a.author LIKE ?)';
            const searchTerm = `%${filters.search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }
        const totalResult = await getRow(`SELECT COUNT(*) as count FROM articles a
       JOIN subscriptions s ON a.subscription_id = s.id
       ${whereClause}`, ...params);
        const sortOrder = filters.sort === 'oldest' ? 'ASC' : 'DESC';
        const rows = await getAllRows(`SELECT a.*, s.title as subscription_title FROM articles a
       JOIN subscriptions s ON a.subscription_id = s.id
       ${whereClause}
       ORDER BY a.published ${sortOrder}, a.id ${sortOrder}
       LIMIT ? OFFSET ?`, ...params, limit, offset);
        return {
            list: rows.map(row => ({
                ...this.toResponse(row),
                subscriptionTitle: row.subscription_title,
            })),
            total: totalResult?.count || 0,
        };
    }
    async getUnreadCount(userId) {
        const rows = await getAllRows(`
      SELECT s.id as subscription_id, COUNT(a.id) as count
      FROM subscriptions s
      LEFT JOIN articles a ON s.id = a.subscription_id AND a.is_read = 0
      WHERE s.user_id = ?
      GROUP BY s.id
    `, userId);
        const bySubscription = {};
        let total = 0;
        for (const row of rows) {
            bySubscription[row.subscription_id] = row.count;
            total += row.count;
        }
        return { total, bySubscription };
    }
    async markAllAsReadGlobal(userId) {
        const result = await runSql(`
      UPDATE articles
      SET is_read = 1
      WHERE subscription_id IN (
        SELECT id FROM subscriptions WHERE user_id = ?
      ) AND is_read = 0
    `, userId);
        return result.changes;
    }
    async getArticle(articleId) {
        const row = await getRow('SELECT * FROM articles WHERE id = ?', articleId);
        if (!row)
            return null;
        return this.toResponse(row);
    }
    async markAsRead(articleId, isRead = true) {
        const result = await runSql('UPDATE articles SET is_read = ? WHERE id = ?', isRead ? 1 : 0, articleId);
        return result.changes > 0;
    }
    async markAllAsRead(subscriptionId) {
        const result = await runSql('UPDATE articles SET is_read = 1 WHERE subscription_id = ? AND is_read = 0', subscriptionId);
        return result.changes;
    }
    async batchMarkAsRead(articleIds, isRead = true) {
        if (articleIds.length === 0)
            return 0;
        const placeholders = articleIds.map(() => '?').join(',');
        const result = await runSql(`UPDATE articles SET is_read = ? WHERE id IN (${placeholders})`, isRead ? 1 : 0, ...articleIds);
        return result.changes;
    }
    async toggleFavorite(articleId) {
        const article = await getRow('SELECT is_favorite FROM articles WHERE id = ?', articleId);
        if (!article)
            return false;
        const newFavorite = article.is_favorite ? 0 : 1;
        await runSql('UPDATE articles SET is_favorite = ? WHERE id = ?', newFavorite, articleId);
        return !!newFavorite;
    }
    async verifyOwnership(articleId, userId) {
        const row = await getRow(`
      SELECT a.id FROM articles a
      JOIN subscriptions s ON a.subscription_id = s.id
      WHERE a.id = ? AND s.user_id = ?
    `, articleId, userId);
        return !!row;
    }
    toIsoDate(dateStr) {
        if (!dateStr)
            return null;
        let date;
        if (typeof dateStr !== 'string')
            return null;
        if (dateStr.includes('T') && dateStr.endsWith('Z')) {
            date = new Date(dateStr);
        }
        else if (dateStr.includes('T')) {
            date = new Date(dateStr + 'Z');
        }
        else {
            date = new Date(dateStr.replace(' ', 'T') + 'Z');
        }
        if (isNaN(date.getTime())) {
            return null;
        }
        return date.toISOString();
    }
    async getAdjacentArticles(articleId, userId) {
        const article = await getRow(`
      SELECT a.* FROM articles a
      JOIN subscriptions s ON a.subscription_id = s.id
      WHERE a.id = ? AND s.user_id = ?
    `, articleId, userId);
        if (!article) {
            return { prev: null, next: null };
        }
        const prevArticle = await getRow(`
      SELECT a.* FROM articles a
      JOIN subscriptions s ON a.subscription_id = s.id
      WHERE s.user_id = ?
        AND (a.published > ? OR (a.published = ? AND a.id > ?))
      ORDER BY a.published ASC, a.id ASC
      LIMIT 1
    `, userId, article.published, article.published, article.id);
        const nextArticle = await getRow(`
      SELECT a.* FROM articles a
      JOIN subscriptions s ON a.subscription_id = s.id
      WHERE s.user_id = ?
        AND (a.published < ? OR (a.published = ? AND a.id < ?))
      ORDER BY a.published DESC, a.id DESC
      LIMIT 1
    `, userId, article.published, article.published, article.id);
        return {
            prev: prevArticle ? this.toResponse(prevArticle) : null,
            next: nextArticle ? this.toResponse(nextArticle) : null,
        };
    }
    async generateShareToken(articleId, userId) {
        const article = await getRow(`
      SELECT a.*, s.user_id, s.title as subscription_title
      FROM articles a
      JOIN subscriptions s ON a.subscription_id = s.id
      WHERE a.id = ?
    `, articleId);
        if (!article) {
            return { success: false };
        }
        if (article.user_id !== userId) {
            return { success: false };
        }
        if (article.share_token) {
            const baseUrl = config.app.baseUrl || 'http://localhost:6001';
            return {
                success: true,
                shareToken: article.share_token,
                shareUrl: `${baseUrl}/share/${article.share_token}`,
            };
        }
        const token = this.generateToken();
        await runSql('UPDATE articles SET share_token = ? WHERE id = ?', token, articleId);
        const baseUrl = config.app.baseUrl || 'http://localhost:6001';
        return {
            success: true,
            shareToken: token,
            shareUrl: `${baseUrl}/share/${token}`,
        };
    }
    async getArticleByShareToken(token) {
        const article = await getRow(`
      SELECT a.id, a.title, a.content, a.author, a.published, a.link, s.title as subscription_title
      FROM articles a
      JOIN subscriptions s ON a.subscription_id = s.id
      WHERE a.share_token = ?
    `, token);
        if (!article) {
            return null;
        }
        return {
            id: article.id,
            title: article.title,
            content: article.content,
            author: article.author,
            published: this.toIsoDate(article.published),
            subscriptionTitle: article.subscription_title,
            link: article.link,
        };
    }
    generateToken() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let token = '';
        for (let i = 0; i < 16; i++) {
            token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return token;
    }
    toResponse(row) {
        return {
            id: row.id,
            subscriptionId: row.subscription_id,
            guid: row.guid,
            title: row.title,
            link: row.link,
            content: row.content,
            contentSnippet: row.content_snippet,
            fullContent: row.full_content,
            shareToken: row.share_token,
            hasFullContent: !!row.full_content,
            author: row.author,
            published: this.toIsoDate(row.published),
            isRead: !!row.is_read,
            isFavorite: !!row.is_favorite,
            createdAt: this.toIsoDate(row.created_at),
        };
    }
}
export const rssService = new RssService();
//# sourceMappingURL=rss.service.js.map