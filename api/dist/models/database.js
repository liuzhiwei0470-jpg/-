import { createClient } from '@libsql/client';
import { config } from '../config/index.js';
let db;
export function getDb() {
    if (!db) {
        db = createClient({
            url: config.database.url || 'file:./data/database.db',
            authToken: config.database.token || undefined,
        });
    }
    return db;
}
export async function getRow(sql, ...args) {
    const client = getDb();
    const result = await client.execute({ sql, args });
    return result.rows[0] || null;
}
export async function getAllRows(sql, ...args) {
    const client = getDb();
    const result = await client.execute({ sql, args });
    return result.rows;
}
export async function runSql(sql, ...args) {
    const client = getDb();
    const result = await client.execute({ sql, args });
    return {
        lastInsertRowid: Number(result.lastInsertRowid) || 0,
        changes: result.rowsAffected || 0,
    };
}
export async function initDatabase() {
    const client = getDb();
    await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
    await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
    await client.executeMultiple(`
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
    );
  `);
    try {
        await client.execute('ALTER TABLE subscriptions ADD COLUMN filter_include TEXT');
    }
    catch (e) { }
    try {
        await client.execute('ALTER TABLE subscriptions ADD COLUMN filter_exclude TEXT');
    }
    catch (e) { }
    try {
        await client.execute('ALTER TABLE subscriptions ADD COLUMN refresh_times TEXT');
    }
    catch (e) { }
    try {
        await client.execute('ALTER TABLE subscriptions ADD COLUMN refresh_interval INTEGER DEFAULT 120');
    }
    catch (e) { }
    try {
        await client.execute('ALTER TABLE subscriptions ADD COLUMN tags TEXT');
    }
    catch (e) { }
    await client.executeMultiple(`
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
      full_content TEXT,
      share_token TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
      UNIQUE(subscription_id, guid)
    );
  `);
    await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS user_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      auto_cleanup_enabled INTEGER DEFAULT 1,
      auto_cleanup_days INTEGER DEFAULT 30,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
    console.log('✅ 数据库初始化完成');
}
export default { getDb, getRow, getAllRows, runSql, initDatabase };
//# sourceMappingURL=database.js.map