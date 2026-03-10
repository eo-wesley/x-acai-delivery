import { getDb } from '../db/db.client';
import { randomUUID } from 'crypto';
import { cacheService } from './cache.service';

export interface QRCampaign {
    id: string;
    restaurant_id: string;
    name: string;
    discount_value: number;
    discount_type: 'amount' | 'percentage';
    landing_slug: string;
    scan_count: number;
    conversions: number;
    created_at: string;
}

export class MigrationService {

    async createQRCampaign(data: Omit<QRCampaign, 'id' | 'scan_count' | 'conversions' | 'created_at'>): Promise<string> {
        const db = await getDb();
        const id = randomUUID();
        await db.run(
            `INSERT INTO qr_campaigns (id, restaurant_id, name, discount_value, discount_type, landing_slug)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [id, data.restaurant_id, data.name, data.discount_value, data.discount_type, data.landing_slug]
        );
        return id;
    }

    async trackScan(campaignId: string, metadata: { ip: string, ua: string }) {
        const db = await getDb();
        const id = randomUUID();

        await db.run(
            `INSERT INTO qr_scans (id, campaign_id, ip_address, user_agent) VALUES (?, ?, ?, ?)`,
            [id, campaignId, metadata.ip, metadata.ua]
        );

        await db.run(
            `UPDATE qr_campaigns SET scan_count = scan_count + 1 WHERE id = ?`,
            [campaignId]
        );
    }

    async createCoupon(restaurantId: string, value: number, type: 'amount' | 'percentage', codePrefix: string = 'VEMPRODIRETO'): Promise<string> {
        const db = await getDb();
        const code = `${codePrefix}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        const id = randomUUID();

        await db.run(
            `INSERT INTO coupons (id, restaurant_id, code, discount_value, discount_type, expires_at)
             VALUES (?, ?, ?, ?, ?, datetime('now', '+7 days'))`,
            [id, restaurantId, code, value, type]
        );

        return code;
    }

    async setCustomerSource(customerId: string, source: string, campaignId?: string) {
        const db = await getDb();
        await db.run(
            `INSERT OR REPLACE INTO customer_sources (customer_id, source, campaign_id)
             VALUES (?, ?, ?)`,
            [customerId, source, campaignId || null]
        );

        if (campaignId) {
            await db.run(
                `UPDATE qr_campaigns SET conversions = conversions + 1 WHERE id = ?`,
                [campaignId]
            );
        }
    }

    async getMigrationStats(restaurantId: string) {
        const db = await getDb();

        const totalMigrated = await db.get(
            `SELECT COUNT(*) as count FROM customer_sources cs
             JOIN customers c ON c.id = cs.customer_id
             WHERE c.restaurant_id = ?`,
            [restaurantId]
        );

        const sourceBreakdown = await db.all(
            `SELECT source, COUNT(*) as count FROM customer_sources cs
             JOIN customers c ON c.id = cs.customer_id
             WHERE c.restaurant_id = ?
             GROUP BY source`,
            [restaurantId]
        );

        return {
            totalMigrated: totalMigrated.count,
            sources: sourceBreakdown
        };
    }
}

export const migrationService = new MigrationService();
