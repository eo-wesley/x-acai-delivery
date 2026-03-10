import { getDb } from '../db.client';
import { randomUUID } from 'crypto';

export class FranchiseRepo {
    async createFranchise(payload: { name: string, owner_id: string }) {
        const db = await getDb();
        const id = randomUUID();
        // A própria franquia pode ser tratada como um 'restaurant' especial ou apenas um registro lógico
        // Aqui vamos focar na relação de locations
        return id;
    }

    async addLocation(franchiseId: string, restaurantId: string, name: string, slug: string) {
        const db = await getDb();
        const id = randomUUID();
        await db.run(
            `INSERT INTO franchise_locations (id, franchise_id, restaurant_id, name, slug) VALUES (?, ?, ?, ?, ?)`,
            [id, franchiseId, restaurantId, name, slug]
        );
        // Atualiza o restaurante para vincular à franquia
        await db.run(`UPDATE restaurants SET franchise_id = ? WHERE id = ?`, [franchiseId, restaurantId]);
        return id;
    }

    async getFranchiseLocations(franchiseId: string) {
        const db = await getDb();
        return db.all(`SELECT * FROM franchise_locations WHERE franchise_id = ?`, [franchiseId]);
    }

    async getGlobalStats() {
        const db = await getDb();
        const stats = await db.get(`
            SELECT 
                COUNT(DISTINCT id) as total_restaurants,
                SUM(yield_balance_cents) as total_gmv_cents, -- Simplificado
                (SELECT COUNT(*) FROM orders) as total_orders
            FROM restaurants
        `);

        // Busca pedidos do último mês para crescimento
        const lastMonth = await db.get(`
            SELECT COUNT(*) as count 
            FROM orders 
            WHERE created_at >= date('now', '-30 days')
        `);

        return {
            ...stats,
            last_30_days_orders: lastMonth.count
        };
    }

    async listPlans() {
        const db = await getDb();
        return db.all(`SELECT * FROM franchise_plans WHERE active = 1`);
    }

    async createBilling(payload: { franchise_id: string, restaurant_id: string, period_start: string, period_end: string, base_fee_cents: number, commission_cents: number }) {
        const db = await getDb();
        const id = randomUUID();
        const total = payload.base_fee_cents + payload.commission_cents;
        await db.run(
            `INSERT INTO franchise_billing (id, franchise_id, restaurant_id, period_start, period_end, base_fee_cents, commission_cents, total_cents)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, payload.franchise_id, payload.restaurant_id, payload.period_start, payload.period_end, payload.base_fee_cents, payload.commission_cents, total]
        );
        return id;
    }
}

export const franchiseRepo = new FranchiseRepo();
