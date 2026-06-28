import { getRow, getAllRows, runSql } from '../models/database';
export class CategoryService {
    async create(input) {
        const { userId, name } = input;
        const result = await runSql('INSERT INTO categories (user_id, name) VALUES (?, ?)', userId, name);
        return (await this.getById(result.lastInsertRowid));
    }
    async getByUserId(userId) {
        const rows = await getAllRows('SELECT * FROM categories WHERE user_id = ? ORDER BY created_at DESC', userId);
        return rows.map(this.toResponse);
    }
    async getById(id) {
        const row = await getRow('SELECT * FROM categories WHERE id = ?', id);
        if (!row)
            return null;
        return this.toResponse(row);
    }
    async update(id, userId, name) {
        await runSql('UPDATE categories SET name = ? WHERE id = ? AND user_id = ?', name, id, userId);
        return this.getById(id);
    }
    async delete(id, userId) {
        const result = await runSql('DELETE FROM categories WHERE id = ? AND user_id = ?', id, userId);
        return result.changes > 0;
    }
    toResponse(row) {
        return {
            id: row.id,
            userId: row.user_id,
            name: row.name,
            createdAt: row.created_at,
        };
    }
}
export const categoryService = new CategoryService();
//# sourceMappingURL=category.service.js.map