import { randomUUID } from 'crypto';
import { getDb } from '../db.client';

export class TablesRepo {
    async getTables(tenantId: string) {
        const db = await getDb();
        return db.all(`
            SELECT t.*, 
            (SELECT COUNT(*) FROM table_orders to_link JOIN orders o ON to_link.order_id = o.id WHERE to_link.table_id = t.id AND o.status NOT IN ('completed', 'cancelled')) as active_orders_count
            FROM restaurant_tables t 
            WHERE t.restaurant_id = ? 
            ORDER BY t.number ASC
        `, [tenantId]);
    }

    async createTable(tenantId: string, data: { number: string; capacity: number; location?: string }) {
        const db = await getDb();
        const id = randomUUID();
        const qr_code_token = randomUUID();
        await db.run(
            `INSERT INTO restaurant_tables (id, restaurant_id, number, capacity, location, qr_code_token) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [id, tenantId, data.number, data.capacity, data.location || 'Salão', qr_code_token]
        );
        return { id, ...data, qr_code_token };
    }

    async getTableWithActiveOrders(tenantId: string, tableId: string) {
        const db = await getDb();
        const table = await db.get('SELECT * FROM restaurant_tables WHERE id = ? AND restaurant_id = ?', [tableId, tenantId]);
        if (!table) return null;

        const activeOrders = await db.all(`
            SELECT o.* 
            FROM table_orders to_link
            JOIN orders o ON to_link.order_id = o.id
            WHERE to_link.table_id = ? AND o.status NOT IN ('completed', 'cancelled')
        `, [tableId]);

        return { ...table, activeOrders };
    }

    async updateTableStatus(tenantId: string, tableId: string, status: string) {
        const db = await getDb();
        await db.run(
            'UPDATE restaurant_tables SET status = ? WHERE id = ? AND restaurant_id = ?',
            [status, tableId, tenantId]
        );
    }

    async linkOrderToTable(tableId: string, orderId: string) {
        const db = await getDb();
        await db.run('INSERT INTO table_orders (table_id, order_id) VALUES (?, ?)', [tableId, orderId]);
        await db.run(`UPDATE restaurant_tables SET status = 'occupied' WHERE id = ?`, [tableId]);
    }
}

export const tablesRepo = new TablesRepo();
