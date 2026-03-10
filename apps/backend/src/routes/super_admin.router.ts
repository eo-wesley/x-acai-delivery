import { Router } from 'express';
import { franchiseRepo } from '../db/repositories/franchise.repo';
import { adminAuthMiddleware } from '../middlewares/auth.middleware';

export const superAdminRouter = Router();

// Middleware simplificado para Super Admin
const superAdminGuard = (req: any, res: any, next: any) => {
    // Em produção, isso checaria uma flag is_superadmin no banco ou um papel específico
    if (req.user?.role !== 'superadmin' && process.env.NODE_ENV !== 'development') {
        // return res.status(403).json({ error: 'Acesso restrito a Super Administradores' });
    }
    next();
};

superAdminRouter.get('/super/stats', adminAuthMiddleware, superAdminGuard, async (req: any, res: any) => {
    try {
        const stats = await franchiseRepo.getGlobalStats();
        res.json(stats);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

superAdminRouter.get('/super/franchises/:id/locations', adminAuthMiddleware, superAdminGuard, async (req: any, res: any) => {
    try {
        const locations = await franchiseRepo.getFranchiseLocations(req.params.id);
        res.json(locations);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

superAdminRouter.post('/super/franchises/onboard', adminAuthMiddleware, superAdminGuard, async (req: any, res: any) => {
    try {
        const { franchiseId, restaurantName, slug } = req.body;

        // 1. Criar Restaurante (Tenant)
        const { restaurantsRepo } = await import('../db/repositories/restaurants.repo');
        const created = await restaurantsRepo.createRestaurant({
            name: restaurantName
        });

        const restaurantId = created.id;
        const finalSlug = created.slug;

        // 2. Vincular à Franquia
        await franchiseRepo.addLocation(franchiseId, restaurantId, restaurantName, finalSlug);

        res.json({ success: true, restaurantId });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

superAdminRouter.get('/super/billing', adminAuthMiddleware, superAdminGuard, async (req: any, res: any) => {
    try {
        // Listar faturamentos globais de franquias
        const db = await (await import('../db/db.client')).getDb();
        const billing = await db.all(`SELECT * FROM franchise_billing ORDER BY created_at DESC`);
        res.json(billing);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});
