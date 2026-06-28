import { getRow, getAllRows, runSql } from '../models/database.js';
const DEFAULT_REFRESH_INTERVAL = 120;
export class SubscriptionService {
    async create(input) {
        const { userId, categoryId, routeUrl, title, config, filterKeywords, tags, filterInclude, filterExclude, refreshInterval } = input;
        const result = await runSql(`
      INSERT INTO subscriptions (user_id, category_id, route_url, title, config, filter_keywords, tags, filter_include, filter_exclude, refresh_interval)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, userId, categoryId ?? null, routeUrl, title ?? routeUrl, config ? JSON.stringify(config) : null, filterKeywords ?? null, tags ? JSON.stringify(tags) : null, filterInclude ?? null, filterExclude ?? null, refreshInterval ?? DEFAULT_REFRESH_INTERVAL);
        return (await this.getById(result.lastInsertRowid));
    }
    async getByUserId(userId, categoryId) {
        let query = 'SELECT * FROM subscriptions WHERE user_id = ?';
        const params = [userId];
        if (categoryId) {
            query += ' AND category_id = ?';
            params.push(categoryId);
        }
        query += ' ORDER BY created_at DESC';
        const rows = await getAllRows(query, ...params);
        const responses = [];
        for (const row of rows) {
            responses.push(await this.toResponse(row));
        }
        return responses;
    }
    async getById(id) {
        const row = await getRow('SELECT * FROM subscriptions WHERE id = ?', id);
        if (!row)
            return null;
        return this.toResponse(row);
    }
    async update(id, userId, input) {
        const updates = [];
        const params = [];
        if (input.categoryId !== undefined) {
            updates.push('category_id = ?');
            params.push(input.categoryId);
        }
        if (input.title !== undefined) {
            updates.push('title = ?');
            params.push(input.title);
        }
        if (input.config !== undefined) {
            updates.push('config = ?');
            params.push(JSON.stringify(input.config));
        }
        if (input.filterKeywords !== undefined) {
            updates.push('filter_keywords = ?');
            params.push(input.filterKeywords);
        }
        if (input.tags !== undefined) {
            updates.push('tags = ?');
            params.push(input.tags.length > 0 ? JSON.stringify(input.tags) : null);
        }
        if (input.filterInclude !== undefined) {
            updates.push('filter_include = ?');
            params.push(input.filterInclude);
        }
        if (input.filterExclude !== undefined) {
            updates.push('filter_exclude = ?');
            params.push(input.filterExclude);
        }
        if (input.refreshInterval !== undefined) {
            updates.push('refresh_interval = ?');
            params.push(input.refreshInterval > 0 ? input.refreshInterval : DEFAULT_REFRESH_INTERVAL);
        }
        if (updates.length === 0) {
            return this.getById(id);
        }
        params.push(id, userId);
        await runSql(`
      UPDATE subscriptions SET ${updates.join(', ')} WHERE id = ? AND user_id = ?
    `, ...params);
        return this.getById(id);
    }
    async delete(id, userId) {
        const result = await runSql('DELETE FROM subscriptions WHERE id = ? AND user_id = ?', id, userId);
        return result.changes > 0;
    }
    async getArticleStats(subscriptionId) {
        const totalResult = await getRow('SELECT COUNT(*) as count FROM articles WHERE subscription_id = ?', subscriptionId);
        const unreadResult = await getRow('SELECT COUNT(*) as count FROM articles WHERE subscription_id = ? AND is_read = 0', subscriptionId);
        return {
            total: totalResult?.count || 0,
            unread: unreadResult?.count || 0,
        };
    }
    async toResponse(row) {
        const stats = await this.getArticleStats(row.id);
        return {
            id: row.id,
            userId: row.user_id,
            categoryId: row.category_id,
            routeUrl: row.route_url,
            title: row.title,
            config: row.config ? JSON.parse(row.config) : null,
            filterKeywords: row.filter_keywords,
            tags: row.tags ? JSON.parse(row.tags) : [],
            filterInclude: row.filter_include,
            filterExclude: row.filter_exclude,
            refreshInterval: row.refresh_interval ?? DEFAULT_REFRESH_INTERVAL,
            createdAt: row.created_at,
            articleCount: stats.total,
            unreadCount: stats.unread,
        };
    }
}
export const subscriptionService = new SubscriptionService();
//# sourceMappingURL=subscription.service.js.map