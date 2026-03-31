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
            `SELECT DATE(created_at) as day, SUM(total_cents) as revenue, COUNT(id) as orders_count
             FROM orders
             WHERE restaurant_id = ? AND status = 'completed' AND created_at >= ?
             GROUP BY DATE(created_at)
             ORDER BY DATE(created_at) ASC`,
            [tenantId, dateStr]
        );

        // Hourly Heatmap (dialect-safe aggregation in JS)
        const completedOrders = await db.all<{ created_at: string }>(
            `SELECT created_at
             FROM orders
             WHERE restaurant_id = ? AND status = 'completed' AND created_at >= ?`,
            [tenantId, dateStr]
        );
        const hourlyMap = new Map<string, number>();
        for (const order of completedOrders) {
            const hour = new Date(order.created_at).getHours().toString().padStart(2, '0');
            hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);
        }
        const hourlyHeatmap = Array.from(hourlyMap.entries())
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([hour, count]) => ({ hour, count }));

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
            payment_methods: paymentMethods
        };
    }

    async getConsolidatedKPIs(tenantId: string) {
        const db = await getDb();

        // 1. Hoje
        let todayOrders = 0, todayRevenue = 0;
        try {
            const todayStr = new Date().toISOString().split('T')[0];
            const today = await db.get(`
                SELECT COUNT(id) as orders, SUM(total_cents) as revenue 
                FROM orders 
                WHERE restaurant_id = ? AND status = 'completed' 
                AND created_at >= ?
            `, [tenantId, todayStr]);
            todayOrders = today?.orders || 0;
            todayRevenue = today?.revenue || 0;
        } catch (e) {
            console.warn('[KPI] Falha ao buscar vendas de hoje:', (e as any).message);
        }

        // 2. Caixa
        let currentCash = 0;
        try {
            const session = await db.get(`
                SELECT initial_value_cents FROM cash_sessions 
                WHERE restaurant_id = ? AND status = 'open'
            `, [tenantId]);

            const entriesIn = await db.get(`
                SELECT SUM(value_cents) as total FROM financial_entries 
                WHERE restaurant_id = ? AND type = 'in' AND cash_session_id IS NOT NULL
            `, [tenantId]);

            const entriesOut = await db.get(`
                SELECT SUM(value_cents) as total FROM financial_entries 
                WHERE restaurant_id = ? AND type = 'out' AND cash_session_id IS NOT NULL
            `, [tenantId]);

            currentCash = (session?.initial_value_cents || 0) + (entriesIn?.total || 0) - (entriesOut?.total || 0);
        } catch (e) {
            console.warn('[KPI] Falha ao buscar caixa:', (e as any).message);
        }

        // 3. Logística
        let activeDriversCount = 0;
        try {
            const activeDrivers = await db.get(`SELECT COUNT(id) as total FROM drivers WHERE restaurant_id = ? AND status = 'active'`, [tenantId]);
            activeDriversCount = activeDrivers?.total || 0;
        } catch (e) {
            console.warn('[KPI] Falha ao buscar drivers:', (e as any).message);
        }

        // 4. Operação
        let pendingOrdersCount = 0;
        try {
            const pendingOrders = await db.get(`SELECT COUNT(id) as total FROM orders WHERE restaurant_id = ? AND status IN ('pending', 'accepted', 'preparing')`, [tenantId]);
            pendingOrdersCount = pendingOrders?.total || 0;
        } catch (e) {
            console.warn('[KPI] Falha ao buscar pedidos pendentes:', (e as any).message);
        }

        // 5. Saúde dos Clientes (Churn Prediction)
        let health = { total: 0, healthy: 0, atRisk: 0, inactive: 0, ranges: { healthy: '0-15 dias', atRisk: '16-30 dias', inactive: '+30 dias' } };
        try {
            health = await this.getCustomerHealthStats(tenantId);
        } catch (e) {
            console.warn('[KPI] Falha ao buscar saúde dos clientes:', (e as any).message);
        }

        // 6. Yield Management
        let yieldCents = 0;
        try {
            const yieldData = await db.get('SELECT yield_balance_cents FROM restaurants WHERE id = ?', [tenantId]);
            yieldCents = yieldData?.yield_balance_cents || 0;
        } catch (e) {
            console.warn('[KPI] Falha ao buscar yield:', (e as any).message);
        }

        return {
            today: {
                orders: todayOrders,
                revenue_cents: todayRevenue
            },
            current_cash_cents: currentCash,
            active_drivers: activeDriversCount,
            pending_orders: pendingOrdersCount,
            customer_health: health,
            yield_cents: yieldCents
        };
    }

    async getCustomerHealthStats(tenantId: string) {
        const db = await getDb();

        // Define ranges
        const now = new Date();
        const fifteenDaysAgo = new Date(now.getTime() - (15 * 24 * 60 * 60 * 1000)).toISOString();
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)).toISOString();

        const stats = await db.get(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN last_order_at >= ? THEN 1 ELSE 0 END) as healthy,
                SUM(CASE WHEN last_order_at < ? AND last_order_at >= ? THEN 1 ELSE 0 END) as at_risk,
                SUM(CASE WHEN last_order_at < ? OR last_order_at IS NULL THEN 1 ELSE 0 END) as inactive
            FROM customers 
            WHERE restaurant_id = ?
        `, [fifteenDaysAgo, fifteenDaysAgo, thirtyDaysAgo, thirtyDaysAgo, tenantId]);

        return {
            total: stats.total || 0,
            healthy: stats.healthy || 0,
            atRisk: stats.at_risk || 0,
            inactive: stats.inactive || 0,
            ranges: {
                healthy: '0-15 dias',
                atRisk: '16-30 dias',
                inactive: '+30 dias'
            }
        };
    }

    async getOperationalPerformance(tenantId: string, days = 30) {
        const db = await getDb();
        const dateStr = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

        // Orders per Staff (Audit logs)
        const staffActivity = await db.all(`
            SELECT u.name, COUNT(a.id) as actions_count
            FROM audit_logs a
            JOIN users u ON a.user_id = u.id
            WHERE a.restaurant_id = ? AND a.created_at >= ?
            GROUP BY u.id, u.name
            ORDER BY actions_count DESC
            LIMIT 10
        `, [tenantId, dateStr]);

        return {
            staffActivity
        };
    }

    async getLTVRanking(tenantId: string, limit = 10) {
        const db = await getDb();
        return await db.all(`
            SELECT 
                id, name, phone, 
                total_spent_cents as ltv_cents,
                total_orders as orders_count
            FROM customers
            WHERE restaurant_id = ?
            ORDER BY total_spent_cents DESC
            LIMIT ?
        `, [tenantId, limit]);
    }
}

export const analyticsRepo = new AnalyticsRepo();
