import { getDb } from '../db.client';
import { randomUUID } from 'crypto';

export interface CampaignFilter {
    lastOrderDays?: number;
    minOrders?: number;
    minSpentCents?: number;
    tag?: string;
}

export class MarketingRepo {
    async getSegmentedCustomers(tenantId: string, filters: CampaignFilter) {
        const db = await getDb();
        let query = `SELECT * FROM customers WHERE restaurant_id = ?`;
        const params: any[] = [tenantId];

        if (filters.lastOrderDays !== undefined) {
            query += ` AND last_order_at >= datetime('now', ?)`;
            params.push(`-${filters.lastOrderDays} days`);
        }

        if (filters.minOrders !== undefined) {
            query += ` AND total_orders >= ?`;
            params.push(filters.minOrders);
        }

        if (filters.minSpentCents !== undefined) {
            query += ` AND total_spent_cents >= ?`;
            params.push(filters.minSpentCents);
        }

        if (filters.tag) {
            query += ` AND tags LIKE ?`;
            params.push(`%${filters.tag}%`);
        }

        return db.all(query, params);
    }

    async createCampaign(tenantId: string, name: string, message: string, filters: CampaignFilter, totalTarget: number) {
        const db = await getDb();
        const id = randomUUID();
        await db.run(
            `INSERT INTO marketing_campaigns (id, restaurant_id, name, message, filters, total_target)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [id, tenantId, name, message, JSON.stringify(filters), totalTarget]
        );
        return id;
    }

    async updateCampaignProgress(campaignId: string, results: { sent: number, error: number }) {
        const db = await getDb();
        await db.run(
            `UPDATE marketing_campaigns SET 
                sent_count = sent_count + ?, 
                error_count = error_count + ?
             WHERE id = ?`,
            [results.sent, results.error, campaignId]
        );
    }

    async updateCampaignStatus(campaignId: string, status: 'pending' | 'sending' | 'completed' | 'failed') {
        const db = await getDb();
        await db.run(`UPDATE marketing_campaigns SET status = ? WHERE id = ?`, [status, campaignId]);
    }

    async logDelivery(campaignId: string, customerId: string, status: 'sent' | 'failed', errorMessage?: string) {
        const db = await getDb();
        await db.run(
            `INSERT INTO marketing_campaign_deliveries (id, campaign_id, customer_id, status, error_message)
             VALUES (?, ?, ?, ?, ?)`,
            [randomUUID(), campaignId, customerId, status, errorMessage || null]
        );
    }

    async getCampaigns(tenantId: string) {
        const db = await getDb();
        return db.all(
            `SELECT * FROM marketing_campaigns WHERE restaurant_id = ? ORDER BY created_at DESC`,
            [tenantId]
        );
    }

    async getCampaignDetails(campaignId: string) {
        const db = await getDb();
        const campaign = await db.get(`SELECT * FROM marketing_campaigns WHERE id = ?`, [campaignId]);
        if (!campaign) return null;

        const deliveries = await db.all(
            `SELECT d.*, c.name as customer_name, c.phone as customer_phone 
             FROM marketing_campaign_deliveries d
             JOIN customers c ON d.customer_id = c.id
             WHERE d.campaign_id = ?`,
            [campaignId]
        );

        return { ...campaign, deliveries };
    }
}

export const marketingRepo = new MarketingRepo();
