import db from '../models/database.js';
import type { Category, CategoryCreateInput, CategoryResponse } from '../models/category.js';

export class CategoryService {
  // 创建分类
  create(input: CategoryCreateInput): CategoryResponse {
    const { userId, name } = input;

    const result = db.prepare(
      'INSERT INTO categories (user_id, name) VALUES (?, ?)'
    ).run(userId, name);

    return this.getById(result.lastInsertRowid as number)!;
  }

  // 获取用户所有分类
  getByUserId(userId: number): CategoryResponse[] {
    const rows = db.prepare(
      'SELECT * FROM categories WHERE user_id = ? ORDER BY created_at DESC'
    ).all(userId) as Category[];

    return rows.map(this.toResponse);
  }

  // 获取单个分类
  getById(id: number): CategoryResponse | null {
    const row = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as Category | undefined;
    if (!row) return null;
    return this.toResponse(row);
  }

  // 更新分类
  update(id: number, userId: number, name: string): CategoryResponse | null {
    db.prepare('UPDATE categories SET name = ? WHERE id = ? AND user_id = ?').run(name, id, userId);
    return this.getById(id);
  }

  // 删除分类
  delete(id: number, userId: number): boolean {
    const result = db.prepare('DELETE FROM categories WHERE id = ? AND user_id = ?').run(id, userId);
    return result.changes > 0;
  }

  // 转换响应格式
  private toResponse(row: Category): CategoryResponse {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      createdAt: row.created_at,
    };
  }
}

export const categoryService = new CategoryService();
