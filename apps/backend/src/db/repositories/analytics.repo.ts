import { getDb } from '../db.client';

export class AnalyticsRepo {

    async getGlobalPlatformStats() {
        const db = await getDb();

        // Count restaurants
        const resCount = await db.get(`SELECT COUNT(id) as total FROM restaurants`);

        // Count orders overall
        const orderCount = await db.get(`SELECT COUNT(id) as total FROM orders`);

        // Sum revenue
        const revenue = await db.get(`SELECT SUM(total_cents) as total FROM orders WHERE status = 'completed'`);

        // Customers
        const custCount = await db.get(`SELECT COUNT(id) as total FROM customers`);

        return {
            totalTenants: resCount.total,
            totalOrders: orderCount.total,
            globalGrossRevenue: (revenue.total || 0),
            totalCustomers: custCount.total
        };
    }

    async getTenantDashboard(tenantId: string, days = 30) {
        const db = await getDb();

        // Date limits
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() - days);
        const dateStr = targetDate.toISOString();

        // Orders count
        const orders = await db.get(
            `SELECT COUNT(id) as total, SUM(total_cents) as revenue FROM orders 
             WHERE restaurant_id = ? AND status = 'completed'`,
            [tenantId]
        );

        // Top Selling Items (Best sellers)
        const topItems = await db.all(
            `SELECT item_name, SUM(quantity) as qty, SUM(price_cents * quantity) as revenue 
             FROM order_items oi
             JOIN orders o ON oi.order_id = o.id
             WHERE o.restaurant_id = ? AND o.status = 'completed' AND o.created_at >= ?
             GROUP BY item_id, item_name
             ORDER BY qty DESC
             LIMIT 5`,
            [tenantId, dateStr]
        );

        // Daily Revenue Chart Data (Last N days)
        const dailyRevenue = await db.all(
            `SELECT date(created_at) as day, SUM(total_cents) as revenue, COUNT(id) as orders_count
             FROM orders
             WHERE restaurant_id = ? AND status = 'completed' AND created_at >= ?
             GROUP BY day
             ORDER BY day ASC`,
            [tenantId, dateStr]
        );

        return {
            summary: {
                totalOrders: orders.total || 0,
                totalRevenue: orders.revenue || 0,
            },
            topItems,
            dailyRevenue
        };
    }
}

export const analyticsRepo = new AnalyticsRepo();
