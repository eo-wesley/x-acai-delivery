import { Router } from 'express';
import { tenantMiddleware } from '../middlewares/tenant.middleware';
import { adminAuthMiddleware } from '../middlewares/auth.middleware';
import { loyaltyRepo } from '../db/repositories/loyalty.repo';

export const loyaltyRouter = Router();

// ======================== ADMIN ENDPOINTS ========================

loyaltyRouter.get('/admin/loyalty/:customerId', adminAuthMiddleware, tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const customerId = req.params.customerId;
        const points = await loyaltyRepo.getCustomerPoints(tenantId, customerId);
        const history = await loyaltyRepo.getHistory(tenantId, customerId);
        const rewards = await loyaltyRepo.listAvailableRewards(tenantId, customerId);

        res.json({ points, history, availableRewards: rewards });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

loyaltyRouter.post('/admin/loyalty/:customerId/add', adminAuthMiddleware, tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const customerId = req.params.customerId;
        const { points, description } = req.body;

        const id = await loyaltyRepo.addPoints(tenantId, customerId, points, description);
        res.status(201).json({ success: true, id });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

loyaltyRouter.post('/admin/loyalty/:customerId/reward', adminAuthMiddleware, tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const customerId = req.params.customerId;
        const { rewardName, pointsCost } = req.body;

        const id = await loyaltyRepo.addReward(tenantId, customerId, rewardName, pointsCost);
        res.status(201).json({ success: true, rewardId: id });
    } catch (e: any) {
        if (e.message.includes('Insufficient points')) {
            return res.status(400).json({ error: e.message });
        }
        res.status(500).json({ error: e.message });
    }
});

loyaltyRouter.put('/admin/loyalty/rewards/:rewardId/redeem', adminAuthMiddleware, tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const rewardId = req.params.rewardId;

        const success = await loyaltyRepo.redeemReward(tenantId, rewardId);
        if (success) {
            res.json({ success: true, message: 'Recompensa resgatada com sucesso.' });
        } else {
            res.status(404).json({ error: 'Recompensa não encontrada ou já utilizada.' });
        }
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});
