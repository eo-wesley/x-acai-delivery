import { getDb } from '../db.client';
import { randomUUID } from 'crypto';

export class LoyaltyRepo {
    // ======================== POINTS SYSTEM (PHASE 4) ========================

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

    // ======================== WALLET SYSTEM (PHASE 50) ========================

    async getWalletBalance(tenantId: string, customerId: string): Promise<number> {
        const db = await getDb();
        const res = await db.get(
            `SELECT balance_cents FROM customer_wallets WHERE restaurant_id = ? AND customer_id = ?`,
            [tenantId, customerId]
        );
        return res?.balance_cents || 0;
    }

    async updateWalletBalance(
        tenantId: string,
        customerId: string,
        amountCents: number,
        type: 'credit' | 'debit',
        reason: string,
        refOrderId?: string
    ) {
        const db = await getDb();
        const id = randomUUID();

        // 1. Record movement
        await db.run(
            `INSERT INTO wallet_movements (id, restaurant_id, customer_id, type, amount_cents, reason, ref_order_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, tenantId, customerId, type, Math.abs(amountCents), reason, refOrderId || null]
        );

        // 2. Update actual balance
        const delta = type === 'credit' ? Math.abs(amountCents) : -Math.abs(amountCents);

        await db.run(`
            INSERT INTO customer_wallets (id, restaurant_id, customer_id, balance_cents)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(restaurant_id, customer_id) DO UPDATE SET
                balance_cents = balance_cents + ?,
                updated_at = CURRENT_TIMESTAMP
        `, [randomUUID(), tenantId, customerId, delta, delta]);

        return id;
    }

    // ======================== REFERRAL SYSTEM (PHASE 50) ========================

    async processReferral(tenantId: string, referralCode: string, referredCustomerId: string) {
        const db = await getDb();

        const referrer = await db.get(
            `SELECT id FROM customers WHERE restaurant_id = ? AND referral_code = ?`,
            [tenantId, referralCode]
        );

        if (!referrer) throw new Error('Código de indicação inválido.');
        if (referrer.id === referredCustomerId) throw new Error('Você não pode indicar a si mesmo.');

        try {
            await db.run(
                `INSERT INTO referrals (id, restaurant_id, referrer_id, referred_id, status)
                 VALUES (?, ?, ?, ?, 'pending')`,
                [randomUUID(), tenantId, referrer.id, referredCustomerId]
            );
        } catch (e: any) {
            if (e.message.includes('UNIQUE constraint failed')) {
                throw new Error('Este cliente já foi indicado anteriormente.');
            }
            throw e;
        }
    }

    async rewardReferral(tenantId: string, referredCustomerId: string) {
        const db = await getDb();

        const referral = await db.get(
            `SELECT referrer_id FROM referrals WHERE restaurant_id = ? AND referred_id = ? AND status = 'pending'`,
            [tenantId, referredCustomerId]
        );

        if (referral) {
            const rewardAmount = 500;

            await this.updateWalletBalance(
                tenantId,
                referral.referrer_id,
                rewardAmount,
                'credit',
                'Bônus de Indicação'
            );

            await db.run(
                `UPDATE referrals SET status = 'rewarded' WHERE restaurant_id = ? AND referred_id = ?`,
                [tenantId, referredCustomerId]
            );
        }
    }

    // ======================== VIP CLUB (PHASE 50) ========================

    async toggleVip(tenantId: string, customerId: string, isVip: boolean, durationDays = 30) {
        const db = await getDb();
        const expiresAt = isVip
            ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString()
            : null;

        await db.run(
            `UPDATE customers SET is_vip = ?, vip_expires_at = ? WHERE id = ? AND restaurant_id = ?`,
            [isVip ? 1 : 0, expiresAt, customerId, tenantId]
        );
    }
}

export const loyaltyRepo = new LoyaltyRepo();
