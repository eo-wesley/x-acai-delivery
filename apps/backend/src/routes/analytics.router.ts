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

analyticsRouter.get('/admin/analytics/export', adminAuthMiddleware, tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const dashboard = await analyticsRepo.getTenantDashboard(tenantId, 90); // Últimos 90 dias para export

        // Simular export CSV simplificado
        let csv = 'Data,Receita,Pedidos\n';
        dashboard.dailyRevenue.forEach((d: any) => {
            csv += `${d.day},${(d.revenue / 100).toFixed(2)},${d.orders_count}\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=relatorio_vendas_${tenantId}.csv`);
        res.send(csv);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});
