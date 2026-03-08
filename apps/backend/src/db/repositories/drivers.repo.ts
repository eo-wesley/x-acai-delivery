import { getDb } from '../db.client';
import { randomUUID } from 'crypto';

export class DriversRepo {
    async listDrivers(tenantId: string) {
        const db = await getDb();
        return db.all(`SELECT * FROM drivers WHERE restaurant_id = ? ORDER BY name ASC`, [tenantId]);
    }

    async createDriver(tenantId: string, payload: { name: string, phone: string, vehicle?: string }) {
        const db = await getDb();
        const id = randomUUID();
        await db.run(
            `INSERT INTO drivers (id, restaurant_id, name, phone, vehicle) VALUES (?, ?, ?, ?, ?)`,
            [id, tenantId, payload.name, payload.phone, payload.vehicle || null]
        );
        return id;
    }

    async updateDriver(tenantId: string, id: string, payload: { name?: string, phone?: string, vehicle?: string, status?: string }) {
        const db = await getDb();
        const updates: string[] = [];
        const values: any[] = [];
        for (const [k, v] of Object.entries(payload)) {
            if (v !== undefined) {
                updates.push(`${k} = ?`);
                values.push(v);
            }
        }
        if (updates.length === 0) return false;
        values.push(tenantId, id);

        const res = await db.run(
            `UPDATE drivers SET ${updates.join(', ')} WHERE restaurant_id = ? AND id = ?`,
            values
        );
        return res.changes !== undefined && res.changes > 0;
    }

    async assignOrder(tenantId: string, driverId: string, orderId: string, feeCents: number) {
        const db = await getDb();
        const id = randomUUID();
        await db.run(
            `INSERT INTO driver_orders (id, restaurant_id, driver_id, order_id, delivery_fee_cents) VALUES (?, ?, ?, ?, ?)`,
            [id, tenantId, driverId, orderId, feeCents]
        );
        return id;
    }

    async updateDriverOrderStatus(tenantId: string, driverOrderId: string, status: 'delivered' | 'returned') {
        const db = await getDb();
        const res = await db.run(
            `UPDATE driver_orders SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE restaurant_id = ? AND id = ?`,
            [status, tenantId, driverOrderId]
        );

        // Se entregue, atualizar status do pedido principal também
        if (status === 'delivered' && res.changes && res.changes > 0) {
            const assignment = await db.get(`SELECT order_id FROM driver_orders WHERE id = ?`, [driverOrderId]);
            if (assignment) {
                const { ordersRepo } = await import('./orders.repo');
                await ordersRepo.updateOrderStatus(assignment.order_id, 'completed');
            }
        }

        return res.changes !== undefined && res.changes > 0;
    }

    async getDriverStats(tenantId: string, driverId: string) {
        const db = await getDb();
        const stats = await db.get(`
            SELECT 
                COUNT(*) as total_deliveries,
                SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as completed_deliveries,
                SUM(CASE WHEN settled = 0 AND status = 'delivered' THEN delivery_fee_cents ELSE 0 END) as pending_settlement_cents,
                SUM(CASE WHEN settled = 1 THEN delivery_fee_cents ELSE 0 END) as total_paid_cents
            FROM driver_orders 
            WHERE restaurant_id = ? AND driver_id = ?
        `, [tenantId, driverId]);

        return stats;
    }

    async settleDriverPayments(tenantId: string, driverId: string) {
        const db = await getDb();
        const res = await db.run(`
            UPDATE driver_orders SET settled = 1 
            WHERE restaurant_id = ? AND driver_id = ? AND status = 'delivered' AND settled = 0
        `, [tenantId, driverId]);
        return res.changes || 0;
    }

    async listDriverOrders(tenantId: string, driverId?: string) {
        const db = await getDb();
        if (driverId) {
            return db.all(`
                SELECT do.*, o.customer_name, o.customer_address, o.customer_phone, o.total_cents 
                FROM driver_orders do
                JOIN orders o ON do.order_id = o.id
                WHERE do.restaurant_id = ? AND do.driver_id = ?
                ORDER BY do.assigned_at DESC
            `, [tenantId, driverId]);
        }
        return db.all(`
            SELECT do.*, d.name as driver_name, o.customer_name, o.customer_address 
            FROM driver_orders do
            JOIN drivers d ON do.driver_id = d.id
            JOIN orders o ON do.order_id = o.id
            WHERE do.restaurant_id = ?
            ORDER BY do.assigned_at DESC LIMIT 100
        `, [tenantId]);
    }
}

export const driversRepo = new DriversRepo();
