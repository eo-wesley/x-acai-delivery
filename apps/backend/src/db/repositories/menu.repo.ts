import { getDb } from '../db.client';
import { randomUUID } from 'crypto';
import { cacheService } from '../../services/cache.service';

export interface MenuItem {
    id: string;
    name: string;
    description: string | null;
    price_cents: number;
    category: string | null;
    tags: string[];
    available: boolean;
    image_url: string | null;
    sort_order: number;
    restaurant_id: string;
    created_at: string;
    updated_at: string;
}

export class MenuRepo {

    // SQLite stores arrays/booleans differently so we parse them softly on return
    private mapToModel(row: any): MenuItem {
        return {
            ...row,
            available: row.available === 1,
            tags: row.tags ? JSON.parse(row.tags) : []
        };
    }

    async listMenu(restaurantId: string, availableOnly: boolean = true): Promise<MenuItem[]> {
        const cacheKey = `menu:${restaurantId}:${availableOnly}`;
        const cached = await cacheService.get(cacheKey);
        if (cached) return cached;

        const db = await getDb();
        const query = availableOnly
            ? 'SELECT * FROM menu_items WHERE restaurant_id = ? AND available = 1 ORDER BY sort_order ASC, created_at ASC'
            : 'SELECT * FROM menu_items WHERE restaurant_id = ? ORDER BY sort_order ASC, created_at ASC';

        const rows = await db.all(query, [restaurantId]);
        const result = rows.map(this.mapToModel);

        // Cache por 5 minutos para Enterprise
        await cacheService.set(cacheKey, result, 300);
        return result;
    }

    async searchMenu(restaurantId: string, query: string): Promise<MenuItem[]> {
        const db = await getDb();
        const searchTerm = `%${query.toLowerCase()}%`;

        // Very basic wildcard search 
        const rows = await db.all(
            `SELECT * FROM menu_items WHERE restaurant_id = ? AND available = 1 AND (LOWER(name) LIKE ? OR LOWER(description) LIKE ?)`,
            [restaurantId, searchTerm, searchTerm]
        );
        return rows.map(this.mapToModel);
    }

    async getById(id: string): Promise<MenuItem | null> {
        const db = await getDb();
        const row = await db.get(`SELECT * FROM menu_items WHERE id = ?`, [id]);
        if (!row) return null;
        return this.mapToModel(row);
    }

    async getMenuItemById(restaurantId: string, id: string): Promise<MenuItem | null> {
        const db = await getDb();
        const row = await db.get(`SELECT * FROM menu_items WHERE id = ? AND restaurant_id = ?`, [id, restaurantId]);
        if (!row) return null;
        return this.mapToModel(row);
    }

    async getMenuByCategory(restaurantId: string, category: string, availableOnly: boolean = true): Promise<MenuItem[]> {
        const db = await getDb();
        const availableClause = availableOnly ? 'AND available = 1' : '';
        const rows = await db.all(`SELECT * FROM menu_items WHERE restaurant_id = ? AND category = ? ${availableClause} ORDER BY sort_order ASC, created_at ASC`, [restaurantId, category]);
        return rows.map(this.mapToModel);
    }

    async createMenuItem(data: Omit<MenuItem, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
        const db = await getDb();
        const id = randomUUID();
        const tagsJson = JSON.stringify(data.tags || []);

        await db.run(
            `INSERT INTO menu_items (id, name, description, price_cents, category, tags, available, image_url, sort_order, restaurant_id, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [id, data.name, data.description || null, data.price_cents, data.category || null, tagsJson, data.available ? 1 : 0, data.image_url || null, data.sort_order ?? 0, data.restaurant_id || 'default_tenant']
        );

        // Invalidação de Cache
        await cacheService.del(`menu:${data.restaurant_id}:true`);
        await cacheService.del(`menu:${data.restaurant_id}:false`);

        return id;
    }

    async updateMenuItem(id: string, restaurantId: string, data: Partial<MenuItem>): Promise<boolean> {
        const db = await getDb();
        const fields = [];
        const values: any[] = [];

        if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
        if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
        if (data.price_cents !== undefined) { fields.push('price_cents = ?'); values.push(data.price_cents); }
        if (data.category !== undefined) { fields.push('category = ?'); values.push(data.category); }
        if (data.tags !== undefined) { fields.push('tags = ?'); values.push(JSON.stringify(data.tags)); }
        if (data.available !== undefined) { fields.push('available = ?'); values.push(data.available ? 1 : 0); }
        if (data.image_url !== undefined) { fields.push('image_url = ?'); values.push(data.image_url); }
        if (data.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(data.sort_order); }

        if (fields.length === 0) return true;

        fields.push("updated_at = CURRENT_TIMESTAMP");
        values.push(id, restaurantId);

        const result = await db.run(`UPDATE menu_items SET ${fields.join(', ')} WHERE id = ? AND restaurant_id = ?`, values);
        const success = result.changes !== undefined && result.changes > 0;

        if (success) {
            await cacheService.del(`menu:${restaurantId}:true`);
            await cacheService.del(`menu:${restaurantId}:false`);
        }

        return success;
    }

    async deleteMenuItem(id: string, restaurantId: string): Promise<boolean> {
        const db = await getDb();
        const result = await db.run(`DELETE FROM menu_items WHERE id = ? AND restaurant_id = ?`, [id, restaurantId]);
        return result.changes !== undefined && result.changes > 0;
    }
}

export const menuRepo = new MenuRepo();
