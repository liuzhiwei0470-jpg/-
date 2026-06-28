import Parser from 'rss-parser';
import db from '../models/database.js';
import type { Article, ArticleResponse } from '../models/article.js';
import { config } from '../config/index.js';

const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; GerenQingbaoguan/1.0)',
  },
});

const DEFAULT_RSSHUB_BASE = config.rsshub.baseUrl;

export interface ParsedFeed {
  title: string;
  description: string;
  link: string;
  items: ParsedItem[];
}

export interface ParsedItem {
  title: string;
  link: string;
  pubDate: string;
  content: string;
  contentSnippet: string;
  guid: string;
  author: string;
}

export class RssService {
  // 解析RSS源
  async parseFeed(url: string): Promise<ParsedFeed> {
    // 如果是路由路径，补全RSSHub地址
    let fullUrl = url;
    if (url.startsWith('/')) {
      fullUrl = DEFAULT_RSSHUB_BASE + url;
    }

    const feed = await parser.parseURL(fullUrl);

    return {
      title: feed.title || '',
      description: feed.description || '',
      link: feed.link || '',
      items: (feed.items || []).map((item: any) => ({
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

  // 检查文章是否匹配关键词过滤规则
  private matchFilters(title: string, contentSnippet: string, filterInclude: string | null, filterExclude: string | null): boolean {
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

  // 同步订阅文章到数据库
  async syncSubscription(subscriptionId: number, routeUrl: string, filterInclude?: string | null, filterExclude?: string | null): Promise<number> {
    try {
      const feed = await this.parseFeed(routeUrl);
      let newCount = 0;

      for (const item of feed.items) {
        if (!this.matchFilters(item.title, item.contentSnippet, filterInclude || null, filterExclude || null)) {
          continue;
        }

        const existing = db.prepare(
          'SELECT id FROM articles WHERE subscription_id = ? AND guid = ?'
        ).get(subscriptionId, item.guid);

        if (!existing) {
          db.prepare(`
            INSERT INTO articles (subscription_id, guid, title, link, content, content_snippet, author, published)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            subscriptionId,
            item.guid,
            item.title,
            item.link,
            item.content,
            item.contentSnippet || '',
            item.author,
            item.pubDate ? new Date(item.pubDate).toISOString() : null
          );
          newCount++;
        }
      }

      return newCount;
    } catch (error) {
      console.error(`同步订阅 ${subscriptionId} 失败:`, error);
      throw error;
    }
  }

  // 清理旧文章（保留收藏和已提取的）
  cleanupOldArticles(days: number = 30, subscriptionId?: number, userId?: number): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffStr = cutoffDate.toISOString();

    let whereClause = `WHERE is_favorite = 0
      AND (full_content IS NULL OR full_content = '')
      AND published < ?`;
    const params: any[] = [cutoffStr];

    if (subscriptionId !== undefined) {
      whereClause += ' AND subscription_id = ?';
      params.push(subscriptionId);
    }

    // 如果指定了用户ID，只清理该用户的订阅文章
    if (userId !== undefined) {
      whereClause += ` AND subscription_id IN (
        SELECT id FROM subscriptions WHERE user_id = ?
      )`;
      params.push(userId);
    }

    const result = db.prepare(
      `DELETE FROM articles ${whereClause}`
    ).run(...params);

    return result.changes || 0;
  }

  // 获取文章统计信息
  getArticleStats(): { total: number; favorite: number; shared: number; old: number } {
    const total = (db.prepare('SELECT COUNT(*) as count FROM articles').get() as any).count;
    const favorite = (db.prepare('SELECT COUNT(*) as count FROM articles WHERE is_favorite = 1').get() as any).count;
    const shared = (db.prepare("SELECT COUNT(*) as count FROM articles WHERE share_token IS NOT NULL AND share_token != ''").get() as any).count;
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const old = (db.prepare('SELECT COUNT(*) as count FROM articles WHERE is_favorite = 0 AND (full_content IS NULL OR full_content = \'\') AND (share_token IS NULL OR share_token = \'\') AND published < ?').get(thirtyDaysAgo.toISOString()) as any).count;

    return { total, favorite, shared, old };
  }

  // 删除单篇文章
  deleteArticle(articleId: number, userId: number): boolean {
    const article = db.prepare(
      'SELECT a.* FROM articles a JOIN subscriptions s ON a.subscription_id = s.id WHERE a.id = ? AND s.user_id = ?'
    ).get(articleId, userId) as any;

    if (!article) {
      return false;
    }

    db.prepare('DELETE FROM articles WHERE id = ?').run(articleId);
    return true;
  }

  // 批量删除文章
  deleteArticles(articleIds: number[], userId: number): number {
    if (articleIds.length === 0) return 0;

    const placeholders = articleIds.map(() => '?').join(',');
    const result = db.prepare(
      `DELETE FROM articles WHERE id IN (${placeholders}) AND subscription_id IN (
        SELECT id FROM subscriptions WHERE user_id = ?
      )`
    ).run(...articleIds, userId);

    return result.changes || 0;
  }

  // 按条件删除文章
  deleteArticlesByCondition(userId: number, condition: {
    isRead?: boolean;
    isFavorite?: boolean;
    hasFullContent?: boolean;
    olderThanDays?: number;
    subscriptionId?: number;
  }): number {
    let whereClause = 'WHERE subscription_id IN (SELECT id FROM subscriptions WHERE user_id = ?)';
    const params: any[] = [userId];

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
      } else {
        whereClause += " AND (full_content IS NULL OR full_content = '')";
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

    const result = db.prepare(
      `DELETE FROM articles ${whereClause}`
    ).run(...params);

    return result.changes || 0;
  }

  // 获取文章列表
  getArticles(
    subscriptionId: number,
    page: number = 1,
    limit: number = 20,
    filters: { isRead?: boolean; isFavorite?: boolean; hasFullContent?: boolean; hasShareToken?: boolean; sort?: 'newest' | 'oldest'; search?: string } = {}
  ): { list: ArticleResponse[]; total: number } {
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE subscription_id = ?';
    const params: any[] = [subscriptionId];

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
        whereClause += ' AND full_content IS NOT NULL AND full_content != \'\'';
      } else {
        whereClause += ' AND (full_content IS NULL OR full_content = \'\')';
      }
    }
    if (filters.hasShareToken !== undefined) {
      if (filters.hasShareToken) {
        whereClause += ' AND share_token IS NOT NULL AND share_token != \'\'';
      } else {
        whereClause += ' AND (share_token IS NULL OR share_token = \'\')';
      }
    }
    if (filters.search) {
      whereClause += ' AND (title LIKE ? OR content LIKE ?)';
      const searchPattern = `%${filters.search}%`;
      params.push(searchPattern, searchPattern);
    }

    const totalResult = db.prepare(
      `SELECT COUNT(*) as count FROM articles ${whereClause}`
    ).get(...params) as { count: number };

    const sortOrder = filters.sort === 'oldest' ? 'ASC' : 'DESC';

    const rows = db.prepare(
      `SELECT * FROM articles ${whereClause} ORDER BY published ${sortOrder}, id ${sortOrder} LIMIT ? OFFSET ?`
    ).all(...params, limit, offset) as Article[];

    return {
      list: rows.map(row => this.toResponse(row)),
      total: totalResult.count,
    };
  }

  // 获取用户全部文章（跨订阅源）
  getAllArticles(
    userId: number,
    page: number = 1,
    limit: number = 20,
    filters: {
      isRead?: boolean;
      isFavorite?: boolean;
      hasFullContent?: boolean;
      hasShareToken?: boolean;
      subscriptionId?: number;
      search?: string;
      sort?: 'newest' | 'oldest';
    } = {}
  ): { list: (ArticleResponse & { subscriptionTitle?: string | null })[]; total: number } {
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE s.user_id = ?';
    const params: any[] = [userId];

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
        whereClause += ' AND a.full_content IS NOT NULL AND a.full_content != \'\'';
      } else {
        whereClause += ' AND (a.full_content IS NULL OR a.full_content = \'\')';
      }
    }
    if (filters.hasShareToken !== undefined) {
      if (filters.hasShareToken) {
        whereClause += ' AND a.share_token IS NOT NULL AND a.share_token != \'\'';
      } else {
        whereClause += ' AND (a.share_token IS NULL OR a.share_token = \'\')';
      }
    }
    if (filters.search) {
      whereClause += ' AND (a.title LIKE ? OR a.content LIKE ? OR a.author LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    const totalResult = db.prepare(
      `SELECT COUNT(*) as count FROM articles a
       JOIN subscriptions s ON a.subscription_id = s.id
       ${whereClause}`
    ).get(...params) as { count: number };

    const sortOrder = filters.sort === 'oldest' ? 'ASC' : 'DESC';

    const rows = db.prepare(
      `SELECT a.*, s.title as subscription_title FROM articles a
       JOIN subscriptions s ON a.subscription_id = s.id
       ${whereClause}
       ORDER BY a.published ${sortOrder}, a.id ${sortOrder}
       LIMIT ? OFFSET ?`
    ).all(...params, limit, offset) as (Article & { subscription_title?: string | null })[];

    return {
      list: rows.map(row => ({
        ...this.toResponse(row),
        subscriptionTitle: row.subscription_title,
      })),
      total: totalResult.count,
    };
  }

  // 获取用户未读计数（按订阅源分组）
  getUnreadCount(userId: number): { total: number; bySubscription: Record<number, number> } {
    const rows = db.prepare(`
      SELECT s.id as subscription_id, COUNT(a.id) as count
      FROM subscriptions s
      LEFT JOIN articles a ON s.id = a.subscription_id AND a.is_read = 0
      WHERE s.user_id = ?
      GROUP BY s.id
    `).all(userId) as { subscription_id: number; count: number }[];

    const bySubscription: Record<number, number> = {};
    let total = 0;
    for (const row of rows) {
      bySubscription[row.subscription_id] = row.count;
      total += row.count;
    }

    return { total, bySubscription };
  }

  // 全局标记全部已读（所有订阅的未读文章）
  markAllAsReadGlobal(userId: number): number {
    const result = db.prepare(`
      UPDATE articles
      SET is_read = 1
      WHERE subscription_id IN (
        SELECT id FROM subscriptions WHERE user_id = ?
      ) AND is_read = 0
    `).run(userId);
    return result.changes;
  }

  // 获取单篇文章
  getArticle(articleId: number): ArticleResponse | null {
    const row = db.prepare('SELECT * FROM articles WHERE id = ?').get(articleId) as Article | undefined;
    if (!row) return null;
    return this.toResponse(row);
  }

  // 标记已读/未读
  markAsRead(articleId: number, isRead: boolean = true): boolean {
    const result = db.prepare(
      'UPDATE articles SET is_read = ? WHERE id = ?'
    ).run(isRead ? 1 : 0, articleId);
    return result.changes > 0;
  }

  // 全部标记已读
  markAllAsRead(subscriptionId: number): number {
    const result = db.prepare(
      'UPDATE articles SET is_read = 1 WHERE subscription_id = ? AND is_read = 0'
    ).run(subscriptionId);
    return result.changes;
  }

  // 批量标记已读/未读
  batchMarkAsRead(articleIds: number[], isRead: boolean = true): number {
    if (articleIds.length === 0) return 0;

    const placeholders = articleIds.map(() => '?').join(',');
    const result = db.prepare(
      `UPDATE articles SET is_read = ? WHERE id IN (${placeholders})`
    ).run(isRead ? 1 : 0, ...articleIds);
    return result.changes;
  }

  // 收藏/取消收藏
  toggleFavorite(articleId: number): boolean {
    const article = db.prepare('SELECT is_favorite FROM articles WHERE id = ?').get(articleId) as Article | undefined;
    if (!article) return false;

    const newFavorite = article.is_favorite ? 0 : 1;
    db.prepare('UPDATE articles SET is_favorite = ? WHERE id = ?').run(newFavorite, articleId);
    return !!newFavorite;
  }

  // 验证订阅所有权
  verifyOwnership(articleId: number, userId: number): boolean {
    const row = db.prepare(`
      SELECT a.id FROM articles a
      JOIN subscriptions s ON a.subscription_id = s.id
      WHERE a.id = ? AND s.user_id = ?
    `).get(articleId, userId);
    return !!row;
  }

  // 转换SQLite时间字符串为ISO格式（SQLite的CURRENT_TIMESTAMP是UTC时间）
  private toIsoDate(dateStr: string | null | undefined): string | null {
    if (!dateStr) return null;
    let date: Date;
    if (dateStr.includes('T') && dateStr.endsWith('Z')) {
      date = new Date(dateStr);
    } else if (dateStr.includes('T')) {
      date = new Date(dateStr + 'Z');
    } else {
      date = new Date(dateStr.replace(' ', 'T') + 'Z');
    }
    if (isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString();
  }

  // 获取相邻文章
  getAdjacentArticles(
    articleId: number,
    userId: number
  ): { prev: ArticleResponse | null; next: ArticleResponse | null } {
    const article = db.prepare(`
      SELECT a.* FROM articles a
      JOIN subscriptions s ON a.subscription_id = s.id
      WHERE a.id = ? AND s.user_id = ?
    `).get(articleId, userId) as Article | undefined;

    if (!article) {
      return { prev: null, next: null };
    }

    const prevArticle = db.prepare(`
      SELECT a.* FROM articles a
      JOIN subscriptions s ON a.subscription_id = s.id
      WHERE s.user_id = ?
        AND (a.published > ? OR (a.published = ? AND a.id > ?))
      ORDER BY a.published ASC, a.id ASC
      LIMIT 1
    `).get(userId, article.published, article.published, article.id) as Article | undefined;

    const nextArticle = db.prepare(`
      SELECT a.* FROM articles a
      JOIN subscriptions s ON a.subscription_id = s.id
      WHERE s.user_id = ?
        AND (a.published < ? OR (a.published = ? AND a.id < ?))
      ORDER BY a.published DESC, a.id DESC
      LIMIT 1
    `).get(userId, article.published, article.published, article.id) as Article | undefined;

    return {
      prev: prevArticle ? this.toResponse(prevArticle) : null,
      next: nextArticle ? this.toResponse(nextArticle) : null,
    };
  }

  // 生成分享链接
  generateShareToken(articleId: number, userId: number): { success: boolean; shareToken?: string; shareUrl?: string } {
    // 验证文章所有权
    const article = db.prepare(`
      SELECT a.*, s.user_id, s.title as subscription_title
      FROM articles a
      JOIN subscriptions s ON a.subscription_id = s.id
      WHERE a.id = ?
    `).get(articleId) as (Article & { user_id: number; subscription_title: string }) | undefined;

    if (!article) {
      return { success: false };
    }

    if (article.user_id !== userId) {
      return { success: false };
    }

    // 如果已经有token，直接返回
    if (article.share_token) {
      const baseUrl = config.app.baseUrl || 'http://localhost:6001';
      return {
        success: true,
        shareToken: article.share_token,
        shareUrl: `${baseUrl}/share/${article.share_token}`,
      };
    }

    // 生成新的token
    const token = this.generateToken();
    db.prepare('UPDATE articles SET share_token = ? WHERE id = ?').run(token, articleId);

    const baseUrl = config.app.baseUrl || 'http://localhost:6001';
    return {
      success: true,
      shareToken: token,
      shareUrl: `${baseUrl}/share/${token}`,
    };
  }

  // 根据分享token获取文章（公开接口，无需登录）
  getArticleByShareToken(token: string): {
    id: number;
    title: string | null;
    content: string | null;
    author: string | null;
    published: string | null;
    subscriptionTitle: string;
    link: string | null;
  } | null {
    const article = db.prepare(`
      SELECT a.id, a.title, a.content, a.author, a.published, a.link, s.title as subscription_title
      FROM articles a
      JOIN subscriptions s ON a.subscription_id = s.id
      WHERE a.share_token = ?
    `).get(token) as (Article & { subscription_title: string }) | undefined;

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

  // 生成随机token
  private generateToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 16; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  // 转换响应格式
  private toResponse(row: Article): ArticleResponse {
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
      createdAt: this.toIsoDate(row.created_at)!,
    };
  }
}

export const rssService = new RssService();
