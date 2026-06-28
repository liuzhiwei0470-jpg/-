import { getRow, getAllRows, runSql } from '../models/database';
import type { Category, CategoryCreateInput, CategoryResponse } from '../models/category';

export class CategoryService {
  async create(input: CategoryCreateInput): Promise<CategoryResponse> {
    const { userId, name } = input;

    const result = await runSql(
      'INSERT INTO categories (user_id, name) VALUES (?, ?)',
      userId,
      name
    );

    return (await this.getById(result.lastInsertRowid))!;
  }

  async getByUserId(userId: number): Promise<CategoryResponse[]> {
    const rows = await getAllRows(
      'SELECT * FROM categories WHERE user_id = ? ORDER BY created_at DESC',
      userId
    ) as Category[];

    return rows.map(this.toResponse);
  }

  async getById(id: number): Promise<CategoryResponse | null> {
    const row = await getRow('SELECT * FROM categories WHERE id = ?', id) as Category | undefined;
    if (!row) return null;
    return this.toResponse(row);
  }

  async update(id: number, userId: number, name: string): Promise<CategoryResponse | null> {
    await runSql('UPDATE categories SET name = ? WHERE id = ? AND user_id = ?', name, id, userId);
    return this.getById(id);
  }

  async delete(id: number, userId: number): Promise<boolean> {
    const result = await runSql('DELETE FROM categories WHERE id = ? AND user_id = ?', id, userId);
    return result.changes > 0;
  }

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
