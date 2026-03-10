import { Router } from 'express';
import { operationsRepo } from '../db/repositories/operations.repo';
import { adminAuthMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// GET /api/admin/operations/live
router.get('/live', adminAuthMiddleware, async (req: any, res) => {
    try {
        const tenantId = req.tenantId || 'default_tenant';
        const liveStatus = await operationsRepo.getLiveStatus(tenantId);
        const demandHeatmap = await operationsRepo.getDemandHeatmap(tenantId);

        res.json({
            ...liveStatus,
            heatmap: demandHeatmap,
            timestamp: new Date().toISOString()
        });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
