import { Router } from 'express';
import { adminAuthMiddleware } from '../middlewares/auth.middleware';
import { tenantMiddleware } from '../middlewares/tenant.middleware';
import { PricingService } from '../services/pricing.service';
import { getDb } from '../db/db.client';

export const pricingAdminRouter = Router();

// Get current pricing rules
pricingAdminRouter.get('/pricing/rules', adminAuthMiddleware, tenantMiddleware, async (req, res) => {
    const tenantId = (req as any).tenantId;
    try {
        const rules = await PricingService.getRules(tenantId);
        res.json(rules);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Update pricing rules
pricingAdminRouter.post('/pricing/rules', adminAuthMiddleware, tenantMiddleware, async (req, res) => {
    const tenantId = (req as any).tenantId;
    const rules = req.body;
    try {
        const db = await getDb();
        await db.run('UPDATE restaurants SET pricing_rules = ? WHERE id = ?', [JSON.stringify(rules), tenantId]);
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Get Yield Management metrics
pricingAdminRouter.get('/pricing/yield', adminAuthMiddleware, tenantMiddleware, async (req, res) => {
    const tenantId = (req as any).tenantId;
    try {
        const db = await getDb();
        const restaurant = await db.get('SELECT yield_balance_cents FROM restaurants WHERE id = ?', [tenantId]);

        // Simulating some historical data for the dashboard charts
        const history = [
            { day: 'Seg', amount: Math.floor(Math.random() * 5000) },
            { day: 'Ter', amount: Math.floor(Math.random() * 4000) },
            { day: 'Qua', amount: Math.floor(Math.random() * 6000) },
            { day: 'Qui', amount: Math.floor(Math.random() * 8000) },
            { day: 'Sex', amount: Math.floor(Math.random() * 15000) },
            { day: 'Sáb', amount: Math.floor(Math.random() * 20000) },
            { day: 'Dom', amount: Math.floor(Math.random() * 18000) },
        ];

        res.json({
            currentBalanceCents: restaurant?.yield_balance_cents || 0,
            history
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});
