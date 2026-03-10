import { getDb } from '../db.client';

export class OperationsRepo {
    async getLiveStatus(tenantId: string) {
        const db = await getDb();

        // Fetch active orders (not completed/cancelled/delivered)
        const activeOrders = await db.all(`
            SELECT 
                o.id, 
                o.status, 
                o.total_cents, 
                o.created_at,
                o.address_text,
                c.name as customer_name,
                (strftime('%s', 'now') - strftime('%s', o.created_at)) / 60 as minutes_elapsed
            FROM orders o
            JOIN customers c ON o.customer_id = c.id
            WHERE o.restaurant_id = ? 
              AND o.status NOT IN ('delivered', 'cancelled', 'completed', 'rejected')
            ORDER BY o.created_at ASC
        `, [tenantId]);

        // Get restaurant settings for thresholds
        const settings = await db.get(`
            SELECT prep_time_minutes FROM restaurants WHERE id = ?
        `, [tenantId]);
        const threshold = settings?.prep_time_minutes || 30;

        const processedOrders = activeOrders.map(o => ({
            ...o,
            is_delayed: o.minutes_elapsed > threshold,
            priority: o.minutes_elapsed > threshold ? 'high' : (o.minutes_elapsed > (threshold * 0.7) ? 'medium' : 'low')
        }));

        // Summary Stats
        const stats = {
            pending: processedOrders.filter(o => ['pending_payment', 'received'].includes(o.status)).length,
            preparing: processedOrders.filter(o => o.status === 'preparing').length,
            delivering: processedOrders.filter(o => o.status === 'delivering').length,
            delayed_count: processedOrders.filter(o => o.is_delayed).length
        };

        return {
            orders: processedOrders,
            stats,
            config: { threshold }
        };
    }

    async getDemandHeatmap(tenantId: string) {
        const db = await getDb();
        // Simplified heatmap by neighborhood (extracting from address_text if possible or just counts)
        // In this implementation, we'll aggregate by a substring of address or just return recent clusters
        const recentOrders = await db.all(`
            SELECT address_text, count(*) as count
            FROM orders
            WHERE restaurant_id = ? AND created_at > datetime('now', '-24 hours')
            GROUP BY address_text
            ORDER BY count DESC
            LIMIT 10
        `, [tenantId]);

        return recentOrders;
    }
}

export const operationsRepo = new OperationsRepo();
