import { getDb } from '../db.client';
import { randomUUID } from 'crypto';

export class DriversRepo {
    async listDrivers(tenantId: string) {
        const db = await getDb();
        return db.all(`SELECT * FROM drivers WHERE restaurant_id = ? ORDER BY name ASC`, [tenantId]);
    }

    async createDriver(tenantId: string, payload: { name: string, phone: string, vehicle?: string, access_code?: string }) {
        const db = await getDb();
        const id = randomUUID();
        await db.run(
            `INSERT INTO drivers (id, restaurant_id, name, phone, vehicle, access_code) VALUES (?, ?, ?, ?, ?, ?)`,
            [id, tenantId, payload.name, payload.phone, payload.vehicle || null, payload.access_code || null]
        );
        return id;
    }

    async updateDriver(tenantId: string, id: string, payload: { name?: string, phone?: string, vehicle?: string, status?: string, access_code?: string }) {
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

    async updateDriverOrderStatus(tenantId: string, driverOrderId: string, status: 'picked_up' | 'delivered' | 'returned') {
        const db = await getDb();
        const res = await db.run(
            `UPDATE driver_orders SET status = ?, ${status === 'delivered' ? 'completed_at = CURRENT_TIMESTAMP' : ''} WHERE restaurant_id = ? AND id = ?`,
            [status, tenantId, driverOrderId].filter(v => v !== '')
        );

        // Se entregue ou coletado, atualizar status do pedido principal também
        if (res.changes && res.changes > 0) {
            const assignment = await db.get(`SELECT order_id FROM driver_orders WHERE id = ?`, [driverOrderId]);
            if (assignment) {
                const { ordersRepo } = await import('./orders.repo');
                if (status === 'delivered') {
                    await ordersRepo.updateOrderStatus(assignment.order_id, 'completed');
                } else if (status === 'picked_up') {
                    await ordersRepo.updateOrderStatus(assignment.order_id, 'delivering');
                }
            }
        }

        return res.changes !== undefined && res.changes > 0;
    }

    async authenticateDriver(slug: string, phone: string, accessCode: string) {
        const db = await getDb();
        const res = await db.get(`
            SELECT d.*, r.id as restaurant_id 
            FROM drivers d
            JOIN restaurants r ON d.restaurant_id = r.id
            WHERE r.slug = ? AND d.phone = ? AND d.access_code = ?
        `, [slug, phone, accessCode]);
        return res;
    }

    async getDriverStats(tenantId: string, driverId: string) {
        const db = await getDb();
        const stats = await db.get(`
            SELECT 
                COUNT(*) as total_deliveries,
                SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as completed_deliveries,
                SUM(CASE WHEN settled = 0 AND status = 'delivered' THEN delivery_fee_cents ELSE 0 END) as pending_settlement_cents,
                SUM(CASE WHEN settled = 1 THEN delivery_fee_cents ELSE 0 END) as total_paid_cents,
                AVG(CASE WHEN status = 'delivered' AND completed_at IS NOT NULL THEN 
                    (strftime('%s', completed_at) - strftime('%s', assigned_at)) / 60.0 
                ELSE NULL END) as avg_delivery_time_mins
            FROM driver_orders 
            WHERE restaurant_id = ? AND driver_id = ?
        `, [tenantId, driverId]);

        const driverInfo = await db.get(`SELECT rating FROM drivers WHERE id = ?`, [driverId]);

        return {
            ...stats,
            rating: driverInfo?.rating || 5.0
        };
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
                SELECT do.*, o.customer_name, o.address_text as customer_address, o.customer_phone, o.total_cents 
                FROM driver_orders do
                JOIN orders o ON do.order_id = o.id
                WHERE do.restaurant_id = ? AND do.driver_id = ?
                ORDER BY do.assigned_at DESC
            `, [tenantId, driverId]);
        }
        return db.all(`
            SELECT do.*, d.name as driver_name, o.customer_name, o.address_text as customer_address 
            FROM driver_orders do
            JOIN drivers d ON do.driver_id = d.id
            JOIN orders o ON do.order_id = o.id
            WHERE do.restaurant_id = ?
            ORDER BY do.assigned_at DESC LIMIT 100
        `, [tenantId]);
    }

    /**
     * Atualiza o status de presença do entregador
     */
    async setPresence(tenantId: string, driverId: string, isOnline: boolean) {
        const db = await getDb();
        await db.run(
            `UPDATE drivers SET is_online = ? WHERE restaurant_id = ? AND id = ?`,
            [isOnline ? 1 : 0, tenantId, driverId]
        );
        return true;
    }

    /**
     * Busca o melhor entregador disponível (online, ativo e com menos entregas pendentes)
     * No futuro integrará com proximidade GPS
     */
    async findOptimalDriver(tenantId: string, orderId?: string) {
        const db = await getDb();
        // 1. Busca motoristas online e ativos
        // 2. Ordena pelos que tem menos pedidos em andamento
        // 3. Ordena pelo tempo desde o último despacho
        return db.get(`
            SELECT d.*, COUNT(do.id) as active_orders
            FROM drivers d
            LEFT JOIN driver_orders do ON d.id = do.driver_id AND do.status IN ('assigned', 'picked_up')
            WHERE d.restaurant_id = ? AND d.status = 'active' AND d.is_online = 1
            GROUP BY d.id
            ORDER BY active_orders ASC, d.last_dispatch_at ASC NULLS FIRST
            LIMIT 1
        `, [tenantId]);
    }

    async markDispatched(tenantId: string, driverId: string) {
        const db = await getDb();
        await db.run(
            `UPDATE drivers SET last_dispatch_at = CURRENT_TIMESTAMP WHERE restaurant_id = ? AND id = ?`,
            [tenantId, driverId]
        );
    }

    /**
     * Calcula estimativas de entrega (Simulado)
     */
    async calculateDeliveryEstimate(orderId: string) {
        // Simulação básica baseada no ID do pedido para variabilidade
        const seed = orderId.length;
        const distance = (seed % 5) + 1.5; // 1.5km a 6.5km
        const time = Math.floor(distance * 4) + 5; // 5-30 min

        return {
            distanceKm: parseFloat(distance.toFixed(1)),
            estimatedMinutes: time
        };
    }

    /**
     * Retorna o resumo da atividade dos entregadores (Frota)
     */
    async getDriverActivity(tenantId: string) {
        const db = await getDb();
        return db.all(`
            SELECT 
                d.id, d.name, d.status, d.phone,
                COUNT(CASE WHEN do.status = 'assigned' OR do.status = 'picked_up' THEN 1 END) as active_orders_count
            FROM drivers d
            LEFT JOIN driver_orders do ON d.id = do.driver_id
            WHERE d.restaurant_id = ?
            GROUP BY d.id
        `, [tenantId]);
    }

    /**
     * Lista pedidos prontos para despacho (otimizado para agrupamento)
     */
    async getOrdersReadyForDispatch(tenantId: string) {
        const db = await getDb();
        return db.all(`
            SELECT id, customer_name, address_text, total_cents, status, created_at
            FROM orders 
            WHERE restaurant_id = ? AND status IN ('preparing', 'ready')
            ORDER BY created_at ASC
        `, [tenantId]);
    }
}

export const driversRepo = new DriversRepo();
