import db from '../models/database.js';
import type { Subscription, SubscriptionCreateInput, SubscriptionUpdateInput, SubscriptionResponse } from '../models/subscription.js';

const DEFAULT_REFRESH_INTERVAL = 120; // 默认2小时

export class SubscriptionService {
  // 创建订阅
  create(input: SubscriptionCreateInput): SubscriptionResponse {
    const { userId, categoryId, routeUrl, title, config, filterKeywords, tags, filterInclude, filterExclude, refreshInterval } = input;

    const result = db.prepare(`
      INSERT INTO subscriptions (user_id, category_id, route_url, title, config, filter_keywords, tags, filter_include, filter_exclude, refresh_interval)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      categoryId ?? null,
      routeUrl,
      title ?? routeUrl,
      config ? JSON.stringify(config) : null,
      filterKeywords ?? null,
      tags ? JSON.stringify(tags) : null,
      filterInclude ?? null,
      filterExclude ?? null,
      refreshInterval ?? DEFAULT_REFRESH_INTERVAL
    );

    return this.getById(result.lastInsertRowid as number)!;
  }

  // 获取用户所有订阅
  getByUserId(userId: number, categoryId?: number): SubscriptionResponse[] {
    let query = 'SELECT * FROM subscriptions WHERE user_id = ?';
    const params: any[] = [userId];

    if (categoryId) {
      query += ' AND category_id = ?';
      params.push(categoryId);
    }

    query += ' ORDER BY created_at DESC';

    const rows = db.prepare(query).all(...params) as Subscription[];
    return rows.map(row => this.toResponse(row));
  }

  // 获取单个订阅
  getById(id: number): SubscriptionResponse | null {
    const row = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id) as Subscription | undefined;
    if (!row) return null;
    return this.toResponse(row);
  }

  // 更新订阅
  update(id: number, userId: number, input: SubscriptionUpdateInput): SubscriptionResponse | null {
    const updates: string[] = [];
    const params: any[] = [];

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

    db.prepare(`
      UPDATE subscriptions SET ${updates.join(', ')} WHERE id = ? AND user_id = ?
    `).run(...params);

    return this.getById(id);
  }

  // 删除订阅
  delete(id: number, userId: number): boolean {
    const result = db.prepare('DELETE FROM subscriptions WHERE id = ? AND user_id = ?').run(id, userId);
    return result.changes > 0;
  }

  // 获取订阅的文章统计
  getArticleStats(subscriptionId: number): { total: number; unread: number } {
    const totalResult = db.prepare(
      'SELECT COUNT(*) as count FROM articles WHERE subscription_id = ?'
    ).get(subscriptionId) as { count: number };

    const unreadResult = db.prepare(
      'SELECT COUNT(*) as count FROM articles WHERE subscription_id = ? AND is_read = 0'
    ).get(subscriptionId) as { count: number };

    return {
      total: totalResult.count,
      unread: unreadResult.count,
    };
  }

  // 转换响应格式
  private toResponse(row: Subscription): SubscriptionResponse {
    const stats = this.getArticleStats(row.id);
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
