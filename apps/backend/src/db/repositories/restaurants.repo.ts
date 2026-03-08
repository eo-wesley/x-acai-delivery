import { getDb } from '../db.client';
import crypto from 'crypto';

export interface Restaurant {
    id: string;
    name: string;
    slug: string;
    phone?: string;
    email?: string;
    status: string;
    plan: string;
    created_at: string;
}

function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .normalize('NFD') // separate accents from letters
        .replace(/[\u0300-\u036f]/g, '') // remove accents
        .replace(/[^a-z0-9 ]/g, '') // remove special chars
        .trim()
        .replace(/\s+/g, '-'); // spaces to dashes
}

export const restaurantsRepo = {
    async createRestaurant(data: { name: string; phone?: string; email?: string; plan?: string }): Promise<{ id: string, slug: string }> {
        const db = await getDb();
        const id = crypto.randomUUID();
        let baseSlug = generateSlug(data.name);

        let slug = baseSlug;
        let counter = 1;
        let isUnique = false;

        // Ensure slug is unique
        while (!isUnique) {
            const existing = await db.get(`SELECT id FROM restaurants WHERE slug = ?`, [slug]);
            if (!existing) {
                isUnique = true;
            } else {
                slug = `${baseSlug}-${counter}`;
                counter++;
            }
        }

        await db.run(
            `INSERT INTO restaurants (id, name, slug, phone, email, plan) VALUES (?, ?, ?, ?, ?, ?)`,
            [id, data.name, slug, data.phone || null, data.email || null, data.plan || 'trial']
        );

        return { id, slug };
    },

    async listRestaurants(): Promise<Restaurant[]> {
        const db = await getDb();
        return db.all(`SELECT * FROM restaurants ORDER BY created_at DESC`);
    },

    async getRestaurantById(id: string): Promise<Restaurant | undefined> {
        const db = await getDb();
        return db.get(`SELECT * FROM restaurants WHERE id = ?`, [id]);
    },

    async updateRestaurant(id: string, data: Partial<Restaurant>): Promise<boolean> {
        const db = await getDb();
        const updates: string[] = [];
        const values: any[] = [];

        for (const [key, value] of Object.entries(data)) {
            if (['name', 'phone', 'email', 'status', 'plan'].includes(key)) {
                updates.push(`${key} = ?`);
                values.push(value);
            }
        }

        if (updates.length === 0) return true;

        values.push(id);
        const result = await db.run(`UPDATE restaurants SET ${updates.join(', ')} WHERE id = ?`, values);
        return (result.changes || 0) > 0;
    },

    async deleteRestaurant(id: string): Promise<boolean> {
        const db = await getDb();
        // MVP logic: Instead of cascading everything natively, we can just mark it as deleted or actually delete it.
        // For physical isolation verification we will delete it.
        const result = await db.run(`DELETE FROM restaurants WHERE id = ?`, [id]);
        return (result.changes || 0) > 0;
    }
};
