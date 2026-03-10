import { Router } from 'express';
import { menuRepo } from '../db/repositories/menu.repo';
import { tenantMiddleware } from '../middlewares/tenant.middleware';
import { menuCacheService } from '../services/cache/menu.cache';
import { getDb } from '../db/db.client';
import { PricingService } from '../services/pricing.service';

export const menuRouter = Router();

// Legado / Default
menuRouter.get('/menu', async (req, res) => {
    try {
        const category = req.query.category as string;
        const tenantId = 'default_tenant';
        const items = category
            ? await menuRepo.getMenuByCategory(tenantId, category, true)
            : await menuCacheService.getMenu(tenantId, true);
        res.json(items);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// SaaS / Tenant
menuRouter.get('/:slug/menu', tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const category = req.query.category as string;
        const items = category
            ? await menuRepo.getMenuByCategory(tenantId, category, true)
            : await menuCacheService.getMenu(tenantId, true);

        // Apply Dynamic Pricing (Happy Hour)
        const enrichedItems = await Promise.all(items.map(async (item: any) => {
            const pricing = await PricingService.calculateItemPrice(tenantId, item);
            return {
                ...item,
                original_price_cents: item.price_cents,
                price_cents: pricing.finalPriceCents,
                is_happy_hour: pricing.isHappyHour
            };
        }));

        res.json(enrichedItems);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

menuRouter.get('/:slug/menu/item/:id', tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const db = await getDb();

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

        const pricing = await PricingService.calculateItemPrice(tenantId, item);
        res.json({
            ...item,
            price_cents: pricing.finalPriceCents,
            original_price_cents: item.price_cents,
            is_happy_hour: pricing.isHappyHour,
            option_groups: enrichedGroups
        });
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
