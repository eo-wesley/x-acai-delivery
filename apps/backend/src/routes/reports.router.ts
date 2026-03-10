import { Router } from 'express';
import { getDb } from '../db/db.client';
import { adminAuthMiddleware } from '../middlewares/auth.middleware';
import { tenantMiddleware } from '../middlewares/tenant.middleware';

const reportsRouter = Router();

// Financial Closing Report
// GET /api/admin/reports/closing?date=YYYY-MM-DD
reportsRouter.get('/closing', adminAuthMiddleware, tenantMiddleware, async (req: any, res) => {
    try {
        const db = await getDb();
        const tenantId = req.tenantId;
        const date = req.query.date || new Date().toISOString().split('T')[0];

        // 1. Total Delivery Orders
        const orders = await db.all(`
            SELECT status, COUNT(*) as count, SUM(total_cents) as total 
            FROM orders 
            WHERE restaurant_id = ? AND date(created_at) = ?
            GROUP BY status
        `, [tenantId, date]);

        // 2. Payments Breakdown (Online vs Manual)
        const payments = await db.all(`
            SELECT method, SUM(amount) as total 
            FROM payments 
            WHERE restaurant_id = ? AND date(created_at) = ?
            GROUP BY method
        `, [tenantId, date]);

        // 3. Expenses
        const expenses = await db.all(`
            SELECT category, SUM(amount) as total 
            FROM expenses 
            WHERE restaurant_id = ? AND date = ?
            GROUP BY category
        `, [tenantId, date]);

        // 4. Most Sold Items today
        const topItems = await db.all(`
            SELECT item_name, SUM(quantity) as qty, SUM(price_cents * quantity) as total
            FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            WHERE o.restaurant_id = ? AND date(o.created_at) = ?
            GROUP BY item_id
            ORDER BY qty DESC
            LIMIT 5
        `, [tenantId, date]);

        // Summary calculation
        const revenue = orders.filter(o => o.status === 'delivered').reduce((acc, curr) => acc + curr.total, 0);
        const totalExpenses = expenses.reduce((acc, curr) => acc + curr.total, 0);

        res.json({
            date,
            summary: {
                revenue_cents: revenue,
                expenses_cents: totalExpenses,
                net_cents: revenue - totalExpenses,
                order_count: orders.reduce((acc, curr) => acc + curr.count, 0)
            },
            details: {
                orders,
                payments,
                expenses,
                top_items: topItems
            }
        });

    } catch (err) {
        console.error('Report generation failed', err);
        res.status(500).json({ error: 'Failed to generate report' });
    }
});

// GET /api/admin/reports/export/orders?start=YYYY-MM-DD&end=YYYY-MM-DD
reportsRouter.get('/export/orders', adminAuthMiddleware, tenantMiddleware, async (req: any, res) => {
    try {
        const db = await getDb();
        const { start, end } = req.query;
        if (!start || !end) return res.status(400).json({ error: 'Start and end dates are required' });

        const orders = await db.all(`
            SELECT id, customer_name, customer_phone, total_cents, status, source, payment_method, created_at
            FROM orders
            WHERE restaurant_id = ? AND date(created_at) BETWEEN ? AND ?
            ORDER BY created_at DESC
        `, [req.tenantId, start, end]);

        // Simple CSV construction
        const headers = 'ID,Data,Cliente,Telefone,Total (R$),Status,Canal,Pagamento\n';
        const rows = orders.map(o => {
            const date = new Date(o.created_at).toLocaleDateString('pt-BR');
            const total = (o.total_cents / 100).toFixed(2).replace('.', ',');
            return `${o.id.substring(0, 8)},${date},"${o.customer_name}",${o.customer_phone},${total},${o.status},${o.source},${o.payment_method}`;
        }).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=pedidos_${start}_${end}.csv`);
        res.status(200).send(headers + rows);

    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/admin/reports/annual-summary?year=YYYY
reportsRouter.get('/annual-summary', adminAuthMiddleware, tenantMiddleware, async (req: any, res) => {
    try {
        const db = await getDb();
        const year = req.query.year || new Date().getFullYear().toString();

        const monthlyData = await db.all(`
            SELECT 
                strftime('%m', created_at) as month,
                COUNT(*) as orders_count,
                SUM(total_cents) as revenue_cents
            FROM orders
            WHERE restaurant_id = ? AND strftime('%Y', created_at) = ? AND status IN ('delivered', 'completed')
            GROUP BY month
            ORDER BY month ASC
        `, [req.tenantId, year]);

        res.json({ year, monthlyData });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default reportsRouter;
