import { Router } from 'express';
import { fiscalRepo } from '../db/repositories/fiscal.repo';
import { FiscalService } from '../services/fiscal.service';
import { adminAuthMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// GET /api/admin/fiscal/pending
router.get('/pending', adminAuthMiddleware, async (req: any, res) => {
    try {
        const tenantId = req.tenantId || 'default_tenant';
        const orders = await fiscalRepo.getPendingFiscalOrders(tenantId);
        res.json(orders);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/admin/fiscal/history
router.get('/history', adminAuthMiddleware, async (req: any, res) => {
    try {
        const tenantId = req.tenantId || 'default_tenant';
        const orders = await fiscalRepo.getFiscalHistory(tenantId);
        res.json(orders);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/admin/fiscal/issue/:orderId
router.post('/issue/:orderId', adminAuthMiddleware, async (req: any, res) => {
    try {
        const { orderId } = req.params;
        const tenantId = req.tenantId || 'default_tenant';
        const result = await FiscalService.issueInvoice(orderId, tenantId);
        res.json(result);
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

// GET /api/admin/fiscal/config
router.get('/config', adminAuthMiddleware, async (req: any, res) => {
    try {
        const tenantId = req.tenantId || 'default_tenant';
        const config = await fiscalRepo.getRestaurantFiscalConfig(tenantId);
        res.json(config);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/admin/fiscal/config
router.post('/config', adminAuthMiddleware, async (req: any, res) => {
    try {
        const tenantId = req.tenantId || 'default_tenant';
        await fiscalRepo.updateRestaurantFiscalConfig(tenantId, req.body);
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
