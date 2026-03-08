import { getDb } from '../db.client';
import { randomUUID } from 'crypto';

export interface CustomerPayload {
    name: string;
    phone: string;
    email?: string;
    tags?: string;
    notes?: string;
}

export class CustomersRepo {
    async upsertCustomer(restaurantId: string, payload: CustomerPayload): Promise<string> {
        const db = await getDb();
        const existing = await this.getCustomerByPhone(restaurantId, payload.phone);

        if (existing) {
            // Update basic info if changed, but keep stats intact
            await db.run(
                `UPDATE customers SET 
                    name = COALESCE(?, name),
                    email = COALESCE(?, email),
                    tags = COALESCE(?, tags),
                    notes = COALESCE(?, notes)
                 WHERE id = ? AND restaurant_id = ?`,
                [payload.name, payload.email || null, payload.tags || null, payload.notes || null, existing.id, restaurantId]
            );
            return existing.id;
        }

        const id = randomUUID();
        await db.run(
            `INSERT INTO customers (id, restaurant_id, name, phone, email, tags, notes) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, restaurantId, payload.name, payload.phone, payload.email || null, payload.tags || null, payload.notes || null]
        );
        return id;
    }

    async getCustomerByPhone(restaurantId: string, phone: string): Promise<any> {
        const db = await getDb();
        return db.get(`SELECT * FROM customers WHERE restaurant_id = ? AND phone = ?`, [restaurantId, phone]);
    }

    async getCustomerById(restaurantId: string, id: string): Promise<any> {
        const db = await getDb();
        return db.get(`SELECT * FROM customers WHERE restaurant_id = ? AND id = ?`, [restaurantId, id]);
    }

    async listCustomers(restaurantId: string, filters: { q?: string, tag?: string } = {}): Promise<any[]> {
        const db = await getDb();
        let query = `SELECT * FROM customers WHERE restaurant_id = ?`;
        const params: any[] = [restaurantId];

        if (filters.q) {
            query += ` AND (name LIKE ? OR phone LIKE ?)`;
            params.push(`%${filters.q}%`, `%${filters.q}%`);
        }
        if (filters.tag) {
            query += ` AND tags LIKE ?`;
            params.push(`%${filters.tag}%`);
        }

        query += ` ORDER BY last_order_at DESC NULLS LAST, created_at DESC`;

        return db.all(query, params);
    }

    async updateCustomer(restaurantId: string, id: string, patch: Partial<CustomerPayload>): Promise<boolean> {
        const db = await getDb();
        const setClauses: string[] = [];
        const params: any[] = [];

        for (const [key, value] of Object.entries(patch)) {
            setClauses.push(`${key} = ?`);
            params.push(value);
        }

        if (setClauses.length === 0) return false;

        params.push(id, restaurantId);
        const setQuery = setClauses.join(', ');

        const res = await db.run(
            `UPDATE customers SET ${setQuery} WHERE id = ? AND restaurant_id = ?`,
            params
        );
        return res.changes ? res.changes > 0 : false;
    }

    async registerOrderStats(restaurantId: string, customerId: string, orderTotalCents: number) {
        const db = await getDb();
        await db.run(
            `UPDATE customers SET 
                last_order_at = CURRENT_TIMESTAMP,
                total_orders = total_orders + 1,
                total_spent_cents = total_spent_cents + ?
             WHERE id = ? AND restaurant_id = ?`,
            [orderTotalCents, customerId, restaurantId]
        );
    }

    async customerStats(restaurantId: string): Promise<any> {
        const db = await getDb();
        const row = await db.get(
            `SELECT COUNT(*) as total_customers, SUM(total_spent_cents) as lifetime_value 
             FROM customers WHERE restaurant_id = ?`,
            [restaurantId]
        );
        return {
            totalCustomers: row?.total_customers || 0,
            lifetimeValueCents: row?.lifetime_value || 0
        };
    }
}

export const customersRepo = new CustomersRepo();
