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
            `SELECT oi.item_name, SUM(oi.quantity) as qty, SUM(oi.price_cents * oi.quantity) as revenue 
             FROM order_items oi
             JOIN orders o ON oi.order_id = o.id
             WHERE o.restaurant_id = ? AND o.status = 'completed' AND o.created_at >= ?
             GROUP BY oi.item_id, oi.item_name
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

        // Hourly Heatmap (Pedidos por Hora)
        const hourlyHeatmap = await db.all(
            `SELECT strftime('%H', created_at) as hour, COUNT(id) as count
             FROM orders
             WHERE restaurant_id = ? AND status = 'completed' AND created_at >= ?
             GROUP BY hour
             ORDER BY hour ASC`,
            [tenantId, dateStr]
        );

        // Revenue by Payment Method
        const paymentMethods = await db.all(
            `SELECT payment_method, SUM(total_cents) as revenue, COUNT(id) as count
             FROM orders
             WHERE restaurant_id = ? AND status = 'completed' AND created_at >= ?
             GROUP BY payment_method`,
            [tenantId, dateStr]
        );

        // Customer Retention (New vs Recurring)
        const customerStats = await db.get(
            `SELECT 
                COUNT(DISTINCT customer_phone) as total_customers,
                SUM(CASE WHEN order_count > 1 THEN 1 ELSE 0 END) as recurring_customers
             FROM (
                SELECT customer_phone, COUNT(id) as order_count 
                FROM orders 
                WHERE restaurant_id = ? AND status = 'completed' AND created_at >= ?
                GROUP BY customer_phone
             )`,
            [tenantId, dateStr]
        );

        const totalRevenue = orders.revenue || 0;
        const totalOrders = orders.total || 0;
        const avgTicket = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
        const retentionRate = customerStats.total_customers > 0
            ? (customerStats.recurring_customers / customerStats.total_customers) * 100
            : 0;

        return {
            summary: {
                totalOrders,
                totalRevenue,
                avgTicketCents: avgTicket,
                retentionRate: Math.round(retentionRate * 100) / 100,
                totalCustomers: customerStats.total_customers || 0,
                recurringCustomers: customerStats.recurring_customers || 0
            },
            topItems,
            dailyRevenue,
            hourlyHeatmap,
            paymentMethods
        };
    }
}

export const analyticsRepo = new AnalyticsRepo();
