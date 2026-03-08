import { Router } from 'express';
import { adminAuthMiddleware } from '../middlewares/auth.middleware';
import { tenantMiddleware } from '../middlewares/tenant.middleware';
import { analyticsRepo } from '../db/repositories/analytics.repo';

export const analyticsRouter = Router();

// ======================== SUPER ADMIN ENDPOINTS ========================
analyticsRouter.get('/super/analytics', adminAuthMiddleware, async (req: any, res: any) => {
    try {
        const stats = await analyticsRepo.getGlobalPlatformStats();
        res.json(stats);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// ======================== TENANT ENDPOINTS ========================
analyticsRouter.get('/admin/analytics', adminAuthMiddleware, tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const days = parseInt(req.query.days || '30');
        const dashboard = await analyticsRepo.getTenantDashboard(tenantId, days);
        res.json(dashboard);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});
