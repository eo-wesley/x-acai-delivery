import { Router } from 'express';
import { tenantMiddleware } from '../middlewares/tenant.middleware';
import { menuCacheService } from '../services/cache/menu.cache';
import { AuditService } from '../services/audit.service';

export const inventoryRouter = Router();

inventoryRouter.get('/admin/inventory', tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const { inventoryRepo } = await import('../db/repositories/inventory.repo');
        const items = await inventoryRepo.listItems(tenantId);
        res.json(items);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

inventoryRouter.post('/admin/inventory', tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const { inventoryRepo } = await import('../db/repositories/inventory.repo');
        const id = await inventoryRepo.createItem(tenantId, req.body);
        await AuditService.log({
            restaurant_id: tenantId,
            user_id: (req as any).user?.id || 'admin',
            action: 'CREATE_INVENTORY_ITEM',
            resource: 'inventory_items',
            resource_id: id,
            payload: req.body
        });
        menuCacheService.invalidate(tenantId);
        res.status(201).json({ success: true, id });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

inventoryRouter.put('/admin/inventory/:id', tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const { inventoryRepo } = await import('../db/repositories/inventory.repo');
        const success = await inventoryRepo.updateItem(tenantId, req.params.id, req.body);
        if (success) {
            await AuditService.log({
                restaurant_id: tenantId,
                user_id: (req as any).user?.id || 'admin',
                action: 'UPDATE_INVENTORY_ITEM',
                resource: 'inventory_items',
                resource_id: req.params.id,
                payload: req.body
            });
            menuCacheService.invalidate(tenantId);
            res.json({ success: true });
        }
        else res.status(404).json({ error: 'Item not found' });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

inventoryRouter.post('/admin/inventory/:id/adjust', tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const { inventoryRepo } = await import('../db/repositories/inventory.repo');
        const { qty, reason } = req.body;

        await inventoryRepo.recordMovement(tenantId, req.params.id, 'adjust', qty, reason || 'manual_adjust');
        await AuditService.log({
            restaurant_id: tenantId,
            user_id: (req as any).user?.id || 'admin',
            action: 'ADJUST_STOCK',
            resource: 'inventory_items',
            resource_id: req.params.id,
            payload: { qty, reason }
        });
        menuCacheService.invalidate(tenantId);
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

inventoryRouter.get('/admin/inventory/alerts', tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const { inventoryRepo } = await import('../db/repositories/inventory.repo');
        const alerts = await inventoryRepo.getAlerts(tenantId);
        res.json(alerts);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

inventoryRouter.get('/admin/inventory/movements', tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const { inventoryRepo } = await import('../db/repositories/inventory.repo');
        const movements = await inventoryRepo.getMovements(tenantId);
        res.json(movements);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

inventoryRouter.get('/admin/recipes', tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const { recipesRepo } = await import('../db/repositories/recipes.repo');
        const recipes = await recipesRepo.listRecipes(tenantId);
        res.json(recipes);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

inventoryRouter.get('/admin/recipes/:menuItemId', tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const { recipesRepo } = await import('../db/repositories/recipes.repo');
        const recipe = await recipesRepo.getRecipeForMenuItem(tenantId, req.params.menuItemId);
        res.json(recipe || { id: null, items: [] });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

inventoryRouter.post('/admin/recipes', tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const { recipesRepo } = await import('../db/repositories/recipes.repo');
        const { menuItemId, name, items } = req.body;

        const recipeId = await recipesRepo.createRecipe(tenantId, menuItemId, name);
        if (items && Array.isArray(items)) {
            await recipesRepo.upsertRecipeItems(tenantId, recipeId, items);
        }
        menuCacheService.invalidate(tenantId);
        res.status(201).json({ success: true, recipeId });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

inventoryRouter.get('/admin/inventory/consumption-by-channel', tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const { inventoryRepo } = await import('../db/repositories/inventory.repo');
        const consumption = await inventoryRepo.getConsumptionByChannel(tenantId);
        res.json(consumption);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});
