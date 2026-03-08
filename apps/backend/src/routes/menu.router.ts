import { Router } from 'express';
import { menuRepo } from '../db/repositories/menu.repo';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant.middleware';
import { menuCacheService } from '../services/cache/menu.cache';

export const menuRouter = Router();

// Public: legacy default tenant
menuRouter.get('/menu', async (req, res) => {
    try {
        const category = req.query.category as string;
        let items = [];
        const tenantId = 'default_tenant';
        if (category) {
            items = await menuRepo.getMenuByCategory(tenantId, category, true);
        } else {
            items = await menuCacheService.getMenu(tenantId, true);
        }
        res.json(items);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

menuRouter.get('/menu/search', async (req, res) => {
    try {
        const q = req.query.q as string;
        if (!q) return res.status(400).json({ error: "Missing 'q' query parameter" });
        const items = await menuRepo.searchMenu('default_tenant', q);
        res.json(items);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// SaaS Tenant Menu
menuRouter.get('/:slug/menu', tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const category = req.query.category as string;
        let items = [];
        if (category) {
            items = await menuRepo.getMenuByCategory(tenantId, category, true);
        } else {
            items = await menuCacheService.getMenu(tenantId, true);
        }
        res.json(items);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

menuRouter.get('/:slug/menu/item/:id', tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const db = await (await import('../db/db.client')).getDb();

        const item = await db.get(
            `SELECT * FROM menu_items WHERE id = ? AND restaurant_id = ? AND hidden != 1`,
            [req.params.id, tenantId]
        );
        if (!item) return res.status(404).json({ error: 'Item not found' });

        const groups = await db.all(
            `SELECT * FROM option_groups WHERE menu_item_id = ? ORDER BY sort_order ASC`,
            [req.params.id]
        );

        const enrichedGroups = await Promise.all(groups.map(async (g: any) => {
            const options = await db.all(
                `SELECT * FROM option_items WHERE option_group_id = ? AND available = 1 ORDER BY sort_order ASC`,
                [g.id]
            );
            return { ...g, options };
        }));

        res.json({ ...item, option_groups: enrichedGroups });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

menuRouter.get('/:slug/menu/categories', tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const cats = await menuCacheService.getCategories(tenantId);
        res.json(cats);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

menuRouter.get('/:slug/menu/search', tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const q = req.query.q as string;
        if (!q) return res.status(400).json({ error: "Missing 'q' query parameter" });
        const items = await menuRepo.searchMenu(tenantId, q);
        res.json(items);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});
