import Database, { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from '../config/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 确保data目录存在
const dbDir = path.dirname(config.database.path);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// 创建数据库连接
const db: DatabaseType = new Database(config.database.path);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// 初始化数据库表
export function initDatabase() {
  // 用户表
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 分类表
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 订阅表
  db.exec(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      category_id INTEGER,
      route_url TEXT NOT NULL,
      title TEXT,
      config TEXT,
      filter_keywords TEXT,
      tags TEXT,
      filter_include TEXT,
      filter_exclude TEXT,
      refresh_times TEXT,
      refresh_interval INTEGER DEFAULT 120,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    )
  `);

  // 文章表
  db.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subscription_id INTEGER NOT NULL,
      guid TEXT NOT NULL,
      title TEXT,
      link TEXT,
      content TEXT,
      content_snippet TEXT,
      author TEXT,
      published DATETIME,
      is_read INTEGER DEFAULT 0,
      is_favorite INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
      UNIQUE(subscription_id, guid)
    )
  `);

  // 兼容旧数据库：如果没有content_snippet字段则添加
  const columns = db.prepare("PRAGMA table_info(articles)").all() as { name: string }[];
  const hasSnippet = columns.some(c => c.name === 'content_snippet');
  if (!hasSnippet) {
    db.exec('ALTER TABLE articles ADD COLUMN content_snippet TEXT');
  }

  // 给没有摘要的旧文章补全摘要（从content截取前200字纯文本）
  const emptySnippetCount = db.prepare("SELECT COUNT(*) as count FROM articles WHERE content_snippet IS NULL OR content_snippet = ''").get() as { count: number };
  if (emptySnippetCount.count > 0) {
    const articles = db.prepare("SELECT id, content FROM articles WHERE content_snippet IS NULL OR content_snippet = ''").all() as { id: number; content: string | null }[];
    const updateStmt = db.prepare('UPDATE articles SET content_snippet = ? WHERE id = ?');
    const transaction = db.transaction((rows: typeof articles) => {
      for (const a of rows) {
        if (a.content) {
          // 简单去除HTML标签，截取前200字
          const text = a.content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
          const snippet = text.slice(0, 200);
          updateStmt.run(snippet, a.id);
        } else {
          updateStmt.run('', a.id);
        }
      }
    });
    transaction(articles);
    console.log(`📝 已为 ${emptySnippetCount.count} 篇旧文章补全摘要`);
  }

  // 兼容旧数据库：如果没有 full_content 字段则添加
  const hasFullContent = columns.some(c => c.name === 'full_content');
  if (!hasFullContent) {
    db.exec('ALTER TABLE articles ADD COLUMN full_content TEXT');
    console.log('📝 已添加 full_content 字段到文章表');
  }

  // 兼容旧数据库：如果没有 share_token 字段则添加
  const hasShareToken = columns.some(c => c.name === 'share_token');
  if (!hasShareToken) {
    db.exec('ALTER TABLE articles ADD COLUMN share_token TEXT');
    console.log('📝 已添加 share_token 字段到文章表');
  }

  // 用户设置表
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      auto_cleanup_enabled INTEGER DEFAULT 1,
      auto_cleanup_days INTEGER DEFAULT 30,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  console.log('✅ 数据库初始化完成');
}

// 路由预设标签映射
export const ROUTE_TAGS: Record<string, string[]> = {
  // 科技资讯
  '/zhihu/hot': ['social', 'internet'],
  '/zhihu/daily': ['news', 'blog'],
  '/36kr/news/latest': ['tech', 'business'],
  '/huxiu/article': ['tech', 'news'],
  '/thepaper/featured': ['news'],
  '/readhub/topic': ['tech', 'news'],
  '/ifanr/app': ['tech', 'blog'],
  '/pingwest/category/kuaibao': ['tech', 'news'],
  '/ithome/news/rank': ['tech', 'internet'],
  '/sspai/index': ['tech', 'blog'],
  '/geekpark/news': ['tech', 'news'],

  // 财经商业
  '/caixin/latest': ['finance', 'business'],
  '/wallstreetcn/news/latest': ['finance', 'business'],
  '/cls/telegraph': ['finance', 'business'],
  '/yicai/news/latest': ['finance', 'news'],
  '/jiemian/news/latest': ['finance', 'news'],
  '/eeo/latest': ['finance', 'business'],
  '/xueqiu/hot': ['finance', 'social'],

  // 社区热榜
  '/weibo/search/hot': ['social', 'news'],
  '/v2ex/topics/hot': ['tech', 'internet'],
  '/bilibili/ranking/0/1': ['video', 'social'],
  '/douban/movie/playing': ['social', 'blog'],
  '/tieba/tbindex/frs-sign/forumid-5': ['social'],

  // 技术开发
  '/juejin/category/frontend': ['coding', 'tech'],
  '/juejin/category/backend': ['coding', 'tech'],
  '/hackernews': ['coding', 'tech'],
  '/github/trending/daily': ['coding', 'tech'],
  '/infoq/recommend': ['coding', 'tech'],
  '/cnblogs/best': ['coding', 'blog'],
  '/linuxct/article': ['coding', 'tech'],

  // 阅读文化
  '/guokr/scientific': ['tech', 'blog'],
  '/douban/book/latest': ['blog'],
  '/jianshu/popular': ['blog', 'social'],
  '/woshipm/aiye': ['business', 'blog'],
  '/niaoge/yunying': ['business', 'blog'],
  'https://www.ruanyifeng.com/blog/atom.xml': ['blog', 'tech'],

  // 生活方式
  '/smzdm/youxuan': ['blog'],
  '/xiachufang/popular': ['blog'],
  '/mafengwo/note': ['blog', 'social'],
};

// 兼容旧数据库：为已有订阅表添加新字段
export function migrateSubscriptionsTable() {
  const columns = db.prepare("PRAGMA table_info(subscriptions)").all() as { name: string }[];

  if (!columns.some(c => c.name === 'tags')) {
    db.exec('ALTER TABLE subscriptions ADD COLUMN tags TEXT');
    console.log('📝 已添加 tags 字段到订阅表');
  }
  if (!columns.some(c => c.name === 'filter_include')) {
    db.exec('ALTER TABLE subscriptions ADD COLUMN filter_include TEXT');
    console.log('📝 已添加 filter_include 字段到订阅表');
  }
  if (!columns.some(c => c.name === 'filter_exclude')) {
    db.exec('ALTER TABLE subscriptions ADD COLUMN filter_exclude TEXT');
    console.log('📝 已添加 filter_exclude 字段到订阅表');
  }
  if (!columns.some(c => c.name === 'refresh_times')) {
    db.exec('ALTER TABLE subscriptions ADD COLUMN refresh_times TEXT');
    console.log('📝 已添加 refresh_times 字段到订阅表');
  }
  if (!columns.some(c => c.name === 'refresh_interval')) {
    db.exec('ALTER TABLE subscriptions ADD COLUMN refresh_interval INTEGER DEFAULT 120');
    console.log('📝 已添加 refresh_interval 字段到订阅表');
  }
  // 迁移旧数据：refresh_times -> refresh_interval
  const hasRefreshTimes = columns.some(c => c.name === 'refresh_times');
  const hasRefreshInterval = columns.some(c => c.name === 'refresh_interval');
  if (hasRefreshTimes && hasRefreshInterval) {
    const oldSubs = db.prepare(
      "SELECT id, refresh_times FROM subscriptions WHERE refresh_interval = 120 AND refresh_times IS NOT NULL"
    ).all() as { id: number; refresh_times: string }[];
    if (oldSubs.length > 0) {
      const updateStmt = db.prepare('UPDATE subscriptions SET refresh_interval = ? WHERE id = ?');
      for (const s of oldSubs) {
        const interval = convertTimesToInterval(s.refresh_times);
        updateStmt.run(interval, s.id);
      }
      console.log(`📝 已迁移 ${oldSubs.length} 条订阅的刷新时间为间隔值`);
    }
  }
}

// 根据间隔分钟数生成默认刷新时间点
function generateTimesFromRate(rateMinutes: number): string[] {
  if (rateMinutes <= 60) {
    return ['08:00', '12:00', '18:00', '22:00'];
  }
  if (rateMinutes <= 180) {
    return ['08:00', '18:00'];
  }
  return ['09:00'];
}

// 根据时间点数组推断间隔分钟数
function convertTimesToInterval(refreshTimes: string): number {
  try {
    const times: string[] = JSON.parse(refreshTimes);
    if (!Array.isArray(times) || times.length === 0) return 120;
    if (times.length >= 4) return 120;      // 4次/天 → 2小时
    if (times.length === 3) return 240;     // 3次/天 → 4小时
    if (times.length === 2) return 360;     // 2次/天 → 6小时
    return 720;                              // 1次/天 → 12小时
  } catch {
    return 120;
  }
}

export default db;
