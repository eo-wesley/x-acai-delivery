import { getDb } from '../db.client';
import { randomUUID } from 'crypto';

export class LoyaltyRepo {
    async getCustomerPoints(tenantId: string, customerId: string): Promise<number> {
        const db = await getDb();
        const res = await db.get(
            `SELECT SUM(points) as total FROM loyalty_points WHERE restaurant_id = ? AND customer_id = ?`,
            [tenantId, customerId]
        );
        return res?.total || 0;
    }

    async getCustomerTier(tenantId: string, customerId: string): Promise<{ name: string, multiplier: number }> {
        const db = await getDb();
        const customer = await db.get(
            `SELECT total_spent_cents FROM customers WHERE restaurant_id = ? AND id = ?`,
            [tenantId, customerId]
        );

        const spent = customer?.total_spent_cents || 0;

        if (spent >= 150000) return { name: 'Gold', multiplier: 1.5 };
        if (spent >= 50000) return { name: 'Silver', multiplier: 1.2 };
        return { name: 'Bronze', multiplier: 1.0 };
    }

    async addPoints(tenantId: string, customerId: string, points: number, description: string, orderId?: string) {
        if (points === 0) return;
        const db = await getDb();

        let finalPoints = points;
        // Apply tier multiplier for positive points (earning)
        if (points > 0) {
            const tier = await this.getCustomerTier(tenantId, customerId);
            finalPoints = Math.floor(points * tier.multiplier);
        }

        const id = randomUUID();
        await db.run(
            `INSERT INTO loyalty_points (id, restaurant_id, customer_id, order_id, points, description) VALUES (?, ?, ?, ?, ?, ?)`,
            [id, tenantId, customerId, orderId || null, finalPoints, description]
        );
        return id;
    }

    async getHistory(tenantId: string, customerId: string) {
        const db = await getDb();
        return db.all(
            `SELECT * FROM loyalty_points WHERE restaurant_id = ? AND customer_id = ? ORDER BY created_at DESC`,
            [tenantId, customerId]
        );
    }

    async addReward(tenantId: string, customerId: string, rewardName: string, pointsCost: number) {
        const db = await getDb();
        const availablePoints = await this.getCustomerPoints(tenantId, customerId);
        if (availablePoints < pointsCost) {
            throw new Error(`Insufficient points. Available: ${availablePoints}, Required: ${pointsCost}`);
        }

        const rewardId = randomUUID();
        // 1. Deduct points
        await this.addPoints(tenantId, customerId, -pointsCost, `Resgate: ${rewardName}`);

        // 2. Grant reward
        await db.run(
            `INSERT INTO customer_rewards (id, restaurant_id, customer_id, reward_name, points_cost) VALUES (?, ?, ?, ?, ?)`,
            [rewardId, tenantId, customerId, rewardName, pointsCost]
        );

        return rewardId;
    }

    async redeemReward(tenantId: string, rewardId: string) {
        const db = await getDb();
        const res = await db.run(
            `UPDATE customer_rewards SET status = 'redeemed', redeemed_at = CURRENT_TIMESTAMP WHERE restaurant_id = ? AND id = ? AND status = 'available'`,
            [tenantId, rewardId]
        );
        return res.changes !== undefined && res.changes > 0;
    }

    async listAvailableRewards(tenantId: string, customerId: string) {
        const db = await getDb();
        return db.all(
            `SELECT * FROM customer_rewards WHERE restaurant_id = ? AND customer_id = ? AND status = 'available' ORDER BY created_at DESC`,
            [tenantId, customerId]
        );
    }
}

export const loyaltyRepo = new LoyaltyRepo();
