import { Router } from 'express';
import { adminAuthMiddleware } from '../middlewares/auth.middleware';
import { tenantMiddleware } from '../middlewares/tenant.middleware';
import { PricingService } from '../services/pricing.service';
import { getDb } from '../db/db.client';
import { buildCostingReport, CostingReportRow } from '../domain/pricing/costing-report';

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

// Diagnóstico read-only de custo e preço. Não altera ficha, estoque ou cardápio.
pricingAdminRouter.get('/pricing/costing-report', adminAuthMiddleware, tenantMiddleware, async (req, res) => {
    const tenantId = (req as any).tenantId;
    const feeRate = Number(req.query.feeRate ?? 0.05);
    const targetContributionRate = Number(req.query.targetContributionRate ?? 0.35);

    if (!Number.isFinite(feeRate) || !Number.isFinite(targetContributionRate)
        || feeRate < 0 || targetContributionRate < 0
        || feeRate + targetContributionRate >= 1) {
        res.status(400).json({ error: 'Taxa e contribuição devem ser positivas e somar menos de 100%.' });
        return;
    }

    try {
        const db = await getDb();
        const rows = await db.all<CostingReportRow>(`
            SELECT
                m.id AS menu_item_id,
                m.name AS menu_name,
                m.price_cents,
                r.id AS recipe_id,
                ri.id AS recipe_item_id,
                ri.inventory_item_id,
                i.name AS inventory_name,
                ri.qty AS recipe_qty,
                ri.unit AS recipe_unit,
                i.unit AS inventory_unit,
                i.cost_cents AS inventory_cost_cents,
                i.purchase_price_cents,
                i.purchase_quantity,
                i.purchase_unit,
                i.yield_percent,
                i.cost_evidence_state
            FROM menu_items m
            LEFT JOIN recipes r
                ON r.menu_item_id = m.id AND r.restaurant_id = m.restaurant_id
            LEFT JOIN recipe_items ri
                ON ri.recipe_id = r.id AND ri.restaurant_id = r.restaurant_id
            LEFT JOIN inventory_items i
                ON i.id = ri.inventory_item_id AND i.restaurant_id = ri.restaurant_id
            WHERE m.restaurant_id = ? AND m.available = 1
            ORDER BY m.name, ri.created_at
        `, [tenantId]);

        const products = buildCostingReport(rows, feeRate, targetContributionRate);
        res.json({
            mode: 'read-only',
            feeRate,
            targetContributionRate,
            costBasis: 'purchase-profile-with-legacy-fallback',
            warning: 'Somente produtos com todos os perfis de compra completos estão prontos. Linhas legadas são provisórias. Este relatório não altera preços nem representa lucro líquido.',
            products
        });
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
