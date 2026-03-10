import { Router } from 'express';
import { adminAuthMiddleware } from '../middlewares/auth.middleware';
import { tenantMiddleware } from '../middlewares/tenant.middleware';
import { procurementRepo } from '../db/repositories/procurement.repo';
import { procurementAIService } from '../services/procurement_ai.service';

export const procurementRouter = Router();

// ─── Suppliers ────────────────────────────────────────────────────────────
procurementRouter.get('/admin/procurement/suppliers', adminAuthMiddleware, tenantMiddleware, async (req: any, res) => {
    try {
        const suppliers = await procurementRepo.getSuppliers(req.tenantId);
        res.json(suppliers);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

procurementRouter.post('/admin/procurement/suppliers', adminAuthMiddleware, tenantMiddleware, async (req: any, res) => {
    try {
        const supplier = await procurementRepo.createSupplier(req.tenantId, req.body);
        res.json(supplier);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// ─── Purchases ────────────────────────────────────────────────────────────
procurementRouter.get('/admin/procurement/purchases', adminAuthMiddleware, tenantMiddleware, async (req: any, res) => {
    try {
        const purchases = await procurementRepo.getPurchases(req.tenantId);
        res.json(purchases);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

procurementRouter.post('/admin/procurement/purchases', adminAuthMiddleware, tenantMiddleware, async (req: any, res) => {
    try {
        const result = await procurementRepo.recordPurchase(req.tenantId, req.body);
        res.json(result);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// ─── AI Supply Chain ───────────────────────────────────────────────────────
procurementRouter.get('/admin/procurement/suggestions', adminAuthMiddleware, tenantMiddleware, async (req: any, res) => {
    try {
        const suggestions = await procurementAIService.getSmartOrderSuggestions(req.tenantId);
        res.json(suggestions);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

procurementRouter.get('/admin/procurement/waste', adminAuthMiddleware, tenantMiddleware, async (req: any, res) => {
    try {
        const days = parseInt(req.query.days || '30');
        const waste = await procurementAIService.getWasteAnalysis(req.tenantId, days);
        res.json(waste);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

procurementRouter.post('/admin/procurement/rfq', adminAuthMiddleware, tenantMiddleware, async (req: any, res) => {
    try {
        const { supplierId, items } = req.body;
        const result = await procurementAIService.requestSupplierQuote(req.tenantId, supplierId, items);
        res.json(result);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});
