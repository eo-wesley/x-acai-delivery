import { Router } from 'express';
import { adminAuthMiddleware } from '../middlewares/auth.middleware';
import { tenantMiddleware } from '../middlewares/tenant.middleware';
import { getDb } from '../db/db.client';

export const paymentsRouter = Router();

paymentsRouter.get('/admin/payment-logs', adminAuthMiddleware, tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const db = await getDb();
        const logs = await db.all(
            `SELECT pl.* FROM payment_logs pl
             JOIN orders o ON pl.order_id = o.id
             WHERE o.restaurant_id = ?
             ORDER BY pl.created_at DESC LIMIT 50`,
            [tenantId]
        );
        res.json(logs);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

paymentsRouter.post('/admin/finance/expense', adminAuthMiddleware, tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const { financeRepo } = await import('../db/repositories/finance.repo');

        const id = await financeRepo.registerExpense(tenantId, req.body);
        res.status(201).json({ success: true, id });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

paymentsRouter.get('/admin/finance/expenses', adminAuthMiddleware, tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const { financeRepo } = await import('../db/repositories/finance.repo');
        const fromDate = req.query.from as string || '2000-01-01';
        const toDate = req.query.to as string || '2099-12-31';

        const expenses = await financeRepo.listExpenses(tenantId, fromDate, toDate);
        res.json(expenses);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

paymentsRouter.get('/admin/finance/overview', adminAuthMiddleware, tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const { financeRepo } = await import('../db/repositories/finance.repo');
        const fromDate = req.query.from as string || '2000-01-01';
        const toDate = req.query.to as string || '2099-12-31';

        const overview = await financeRepo.getFinancialOverview(tenantId, fromDate, toDate);
        res.json(overview);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});
