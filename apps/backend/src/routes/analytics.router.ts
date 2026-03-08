import { Router } from 'express';
import { adminAuthMiddleware } from '../middlewares/auth.middleware';
import { tenantMiddleware } from '../middlewares/tenant.middleware';
import { analyticsRepo } from '../db/repositories/analytics.repo';
import { restaurantsRepo } from '../db/repositories/restaurants.repo';


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

        // 1. Buscar plano do restaurante
        const restaurant = await restaurantsRepo.getRestaurantById(tenantId);
        const plan = restaurant?.plan?.toLowerCase() || 'starter';

        // 2. Buscar dados do dashboard
        const dashboard = await analyticsRepo.getTenantDashboard(tenantId, days);

        // 3. Filtrar baseado no plano
        if (plan === 'starter' || plan === 'trial') {
            return res.json({
                summary: dashboard.summary,
                info: 'Upgrade para PRO para liberar Heatmaps, Retenção e Top Produtos.'
            });
        }

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
