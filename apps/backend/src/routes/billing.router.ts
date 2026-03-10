import { Router } from 'express';
import { getDb } from '../db/db.client';
import { tenantMiddleware } from '../middlewares/tenant.middleware';

export const billingRouter = Router();

// GET /api/:slug/billing/info
billingRouter.get('/info', tenantMiddleware, async (req: any, res: any) => {
    try {
        const db = await getDb();
        const restaurant = await db.get(`
            SELECT subscription_plan, subscription_status, plan, mode 
            FROM restaurants WHERE id = ?
        `, [req.tenantId]);
        res.json(restaurant);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/:slug/billing/upgrade
billingRouter.post('/upgrade', tenantMiddleware, async (req: any, res: any) => {
    try {
        const { planId } = req.body;
        const db = await getDb();

        // In a real app, verify payment status here via Stripe Webhook
        await db.run(`
            UPDATE restaurants 
            SET subscription_plan = ?, subscription_status = 'active' 
            WHERE id = ?
        `, [planId, req.tenantId]);

        res.json({ success: true, message: `Upgrade para o plano ${planId} realizado com sucesso!` });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});
