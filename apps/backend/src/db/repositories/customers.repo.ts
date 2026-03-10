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
        const referralCode = id.substring(0, 6).toUpperCase(); // Simple referral code

        await db.run(
            `INSERT INTO customers (id, restaurant_id, name, phone, email, tags, notes, referral_code) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, restaurantId, payload.name, payload.phone, payload.email || null, payload.tags || null, payload.notes || null, referralCode]
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

    async listCustomersWithHealth(restaurantId: string, filters: { q?: string, status?: 'healthy' | 'at_risk' | 'inactive' } = {}): Promise<any[]> {
        const db = await getDb();
        const now = new Date();
        const fifteenDaysAgo = new Date(now.getTime() - (15 * 24 * 60 * 60 * 1000)).toISOString();
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)).toISOString();

        let query = `
            SELECT *,
                CASE 
                    WHEN last_order_at >= ? THEN 'healthy'
                    WHEN last_order_at < ? AND last_order_at >= ? THEN 'at_risk'
                    ELSE 'inactive'
                END as health_status
            FROM customers 
            WHERE restaurant_id = ?
        `;
        const params: any[] = [fifteenDaysAgo, fifteenDaysAgo, thirtyDaysAgo, restaurantId];

        if (filters.q) {
            query += ` AND (name LIKE ? OR phone LIKE ?)`;
            params.push(`%${filters.q}%`, `%${filters.q}%`);
        }

        if (filters.status) {
            query = `SELECT * FROM (${query}) WHERE health_status = ?`;
            params.push(filters.status);
        } else {
            query += ` ORDER BY last_order_at DESC NULLS LAST`;
        }

        return db.all(query, params);
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

    async updateOTP(restaurantId: string, phone: string, code: string, expiresAt: Date): Promise<void> {
        const db = await getDb();
        await db.run(
            `UPDATE customers SET otp_code = ?, otp_expires_at = ? WHERE restaurant_id = ? AND phone = ?`,
            [code, expiresAt.toISOString(), restaurantId, phone]
        );
    }

    async getAddresses(customerId: string): Promise<any[]> {
        const db = await getDb();
        return db.all(`SELECT * FROM customer_addresses WHERE customer_id = ? ORDER BY is_default DESC`, [customerId]);
    }

    async addAddress(customerId: string, address: any): Promise<string> {
        const db = await getDb();
        const id = randomUUID();
        if (address.is_default) {
            await db.run(`UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ?`, [customerId]);
        }
        await db.run(
            `INSERT INTO customer_addresses (id, customer_id, label, street, number, complement, neighborhood, city, is_default)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, customerId, address.label || null, address.street, address.number, address.complement || null, address.neighborhood, address.city, address.is_default ? 1 : 0]
        );
        return id;
    }
}

export const customersRepo = new CustomersRepo();
