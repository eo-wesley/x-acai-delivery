import { getDb } from '../db/db.client';

export class FinanceService {
    async getFinancialReport(restaurantId: string, startDate?: string, endDate?: string) {
        const db = await getDb();

        let dateFilter = "";
        const params: any[] = [restaurantId];

        if (startDate && endDate) {
            dateFilter = " AND created_at BETWEEN ? AND ?";
            params.push(startDate, endDate);
        }

        // 1. Get Revenue (completed orders)
        const revenueRes = await db.get(
            `SELECT SUM(total_cents) as total_revenue, COUNT(id) as order_count 
             FROM orders 
             WHERE restaurant_id = ? AND (status = 'completed' OR status = 'delivering') ${dateFilter}`,
            params
        );

        const totalRevenue = revenueRes?.total_revenue || 0;
        const orderCount = revenueRes?.order_count || 0;

        // 2. Calculate CMV (Cost of Goods Sold)
        // This is complex because we need to join order_items -> recipes -> recipe_items -> inventory_items
        // For simplicity in SQLite, we might do it in a few steps or one big query if possible.

        const orders = await db.all(
            `SELECT items FROM orders 
             WHERE restaurant_id = ? AND (status = 'completed' OR status = 'delivering') ${dateFilter}`,
            params
        );

        let totalCmv = 0;

        // Let's pre-calculate the cost of each menu item based on its recipe
        // Price per item = sum(recipe_item.qty * inventory_item.cost_cents)
        const menuCosts = await db.all(`
            SELECT r.menu_item_id, SUM(ri.qty * i.cost_cents) as recipe_cost
            FROM recipes r
            JOIN recipe_items ri ON r.id = ri.recipe_id
            JOIN inventory_items i ON ri.inventory_item_id = i.id
            WHERE r.restaurant_id = ?
            GROUP BY r.menu_item_id
        `, [restaurantId]);

        const costMap: Record<string, number> = {};
        menuCosts.forEach(m => {
            costMap[m.menu_item_id] = m.recipe_cost || 0;
        });

        // Sum CMV based on orders
        orders.forEach(order => {
            try {
                const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
                items.forEach((item: any) => {
                    const itemCost = costMap[item.menuItemId] || 0;
                    totalCmv += (itemCost * item.qty);
                });
            } catch (e) {
                console.error("Error parsing order items for finance", e);
            }
        });

        // 3. Get Expenses
        const expensesRes = await db.get(
            `SELECT SUM(amount) as total_expenses FROM expenses 
             WHERE restaurant_id = ? ${dateFilter.replace('created_at', 'date')}`,
            params
        );
        const totalExpenses = expensesRes?.total_expenses || 0;

        const grossProfit = totalRevenue - totalCmv;

        // 4. Group by Channel with Fee deduction
        const channelAnalytics = await this.getChannelAnalytics(restaurantId, startDate, endDate);

        // Net profit considering marketplace fees + expenses
        const netRevenueAfterFees = channelAnalytics.reduce((acc, c) => acc + c.net_revenue, 0);
        const netProfit = netRevenueAfterFees - totalCmv - totalExpenses;

        return {
            period: { start: startDate, end: endDate },
            revenue: totalRevenue,
            netRevenueAfterFees, // New: Actual money collected after commissions
            cmv: totalCmv,
            grossProfit,
            expenses: totalExpenses,
            netProfit,
            orderCount,
            channelAnalytics,
            margin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0
        };
    }

    async getChannelAnalytics(restaurantId: string, startDate?: string, endDate?: string) {
        const db = await getDb();
        const params: any[] = [restaurantId];
        let dateFilter = "";

        if (startDate && endDate) {
            dateFilter = " AND created_at BETWEEN ? AND ?";
            params.push(startDate, endDate);
        }

        const rows = await db.all(`
            SELECT source, SUM(total_cents) as total_revenue, COUNT(id) as order_count
            FROM orders
            WHERE restaurant_id = ? AND (status = 'completed' OR status = 'delivering') ${dateFilter}
            GROUP BY source
        `, params);

        const fees: Record<string, number> = {
            'ifood': 0.27,
            'rappi': 0.25,
            'internal': 0.02,
            'pdv': 0.02
        };

        return rows.map(r => {
            const source = r.source || 'internal';
            const feeRate = fees[source] || 0.02;
            const commission = Math.round(r.total_revenue * feeRate);
            return {
                source,
                total_revenue: r.total_revenue,
                order_count: r.order_count,
                commission,
                net_revenue: r.total_revenue - commission,
                fee_rate_percent: feeRate * 100
            };
        });
    }

    async getDetailedFeeAudit(restaurantId: string, days: number = 30) {
        const db = await getDb();

        // 1. Get recent orders with status completed
        const orders = await db.all(`
            SELECT id, source, total_cents, created_at, marketplace_fee_cents
            FROM orders
            WHERE restaurant_id = ? 
            AND status = 'completed'
            AND created_at >= date('now', '-' || ? || ' days')
            ORDER BY created_at DESC
        `, [restaurantId, days]);

        const standardFees: Record<string, number> = {
            'ifood': 0.27,
            'rappi': 0.25,
            'internal': 0.02,
            'pdv': 0.02
        };

        let totalExpectedFees = 0;
        let totalRecordedFees = 0;
        const discrepancies = [];

        for (const order of orders) {
            const source = order.source || 'internal';
            const rate = standardFees[source] || 0.02;
            const expectedFee = Math.round(order.total_cents * rate);
            const recordedFee = order.marketplace_fee_cents || 0;

            totalExpectedFees += expectedFee;
            totalRecordedFees += recordedFee;

            if (Math.abs(expectedFee - recordedFee) > 100) { // Discrepancy > R$ 1,00
                discrepancies.push({
                    orderId: order.id,
                    date: order.created_at,
                    source,
                    amount: order.total_cents,
                    expectedFee,
                    recordedFee,
                    diff: expectedFee - recordedFee
                });
            }
        }

        return {
            summary: {
                totalOrdersAudit: orders.length,
                totalExpectedFees,
                totalRecordedFees,
                discrepancyTotal: totalExpectedFees - totalRecordedFees,
                discrepancyCount: discrepancies.length
            },
            discrepancies: discrepancies.slice(0, 50) // Limit to 50 for UI
        };
    }
}

export const financeService = new FinanceService();
