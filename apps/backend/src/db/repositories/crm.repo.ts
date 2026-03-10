import { getDb } from '../db.client';

export class CRMRepo {
    /**
     * RFM Analysis (Recency, Frequency, Monetary)
     * Groups customers based on their buying behavior.
     */
    async getRFMAnalysis(restaurantId: string) {
        const db = await getDb();

        // Calculate raw RFM metrics per customer
        const customers = await db.all(`
            SELECT 
                c.id,
                c.name,
                c.phone,
                c.last_order_at,
                c.total_orders as frequency,
                c.total_spent_cents as monetary,
                (julianday('now') - julianday(c.last_order_at)) as recency_days
            FROM customers c
            WHERE c.restaurant_id = ? AND c.total_orders > 0
        `, [restaurantId]);

        if (customers.length === 0) return { champions: [], churn_risk: [], promising: [], hibernating: [] };

        const analysis = {
            champions: [] as any[],    // High frequency, high monetary, recent
            churn_risk: [] as any[],   // High total spent, but not seen in a long time
            promising: [] as any[],    // Recent customers with good potential
            hibernating: [] as any[]   // Low everything
        };

        customers.forEach(c => {
            if (c.recency_days <= 7 && c.frequency >= 3) analysis.champions.push(c);
            else if (c.recency_days > 30 && c.monetary > 10000) analysis.churn_risk.push(c);
            else if (c.recency_days <= 15 && c.frequency < 3) analysis.promising.push(c);
            else analysis.hibernating.push(c);
        });

        return analysis;
    }

    async getTopSpenders(restaurantId: string, limit = 10) {
        const db = await getDb();
        return db.all(`
            SELECT id, name, phone, total_spent_cents, total_orders
            FROM customers
            WHERE restaurant_id = ?
            ORDER BY total_spent_cents DESC
            LIMIT ?
        `, [restaurantId, limit]);
    }

    async getPromoStats(restaurantId: string) {
        const db = await getDb();
        return db.all(`
            SELECT code, used_count as uses, usage_limit as max_uses, active
            FROM promo_codes
            WHERE restaurant_id = ?
        `, [restaurantId]);
    }
}

export const crmRepo = new CRMRepo();
