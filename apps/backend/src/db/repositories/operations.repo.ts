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
                c.name as customer_name
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

        const now = Date.now();
        const processedOrders = activeOrders.map((o: any) => {
            const createdAt = new Date(o.created_at).getTime();
            const minutesElapsed = Math.max(0, Math.round((now - createdAt) / 60000));
            return {
                ...o,
                minutes_elapsed: minutesElapsed,
                is_delayed: minutesElapsed > threshold,
                priority: minutesElapsed > threshold ? 'high' : (minutesElapsed > (threshold * 0.7) ? 'medium' : 'low')
            };
        });

        // Summary Stats
        const stats = {
            pending: processedOrders.filter(o => ['pending_payment', 'pending', 'received', 'accepted', 'confirmed'].includes(o.status)).length,
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
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        // Simplified heatmap by neighborhood (extracting from address_text if possible or just counts)
        // In this implementation, we'll aggregate by a substring of address or just return recent clusters
        const recentOrders = await db.all(`
            SELECT address_text, count(*) as count
            FROM orders
            WHERE restaurant_id = ? AND created_at > ?
            GROUP BY address_text
            ORDER BY count DESC
            LIMIT 10
        `, [tenantId, cutoff]);

        return recentOrders;
    }
}

export const operationsRepo = new OperationsRepo();
