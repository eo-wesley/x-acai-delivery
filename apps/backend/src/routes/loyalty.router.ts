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

// ======================== PUBLIC ENDPOINTS ========================

// ======================== PUBLIC ENDPOINTS ========================

// GET /api/:slug/loyalty/me?phone=...
loyaltyRouter.get('/:slug/loyalty/me', tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const phone = req.query.phone;
        if (!phone) return res.status(400).json({ error: 'Telefone é obrigatório' });

        const { getDb } = await import('../db/db.client');
        const db = await getDb();
        const customer = await db.get(`SELECT id, name, referral_code, is_vip, vip_expires_at FROM customers WHERE restaurant_id = ? AND phone = ?`, [tenantId, phone]);

        if (!customer) return res.status(404).json({ error: 'Cliente não encontrado' });

        const points = await loyaltyRepo.getCustomerPoints(tenantId, customer.id);
        const tier = await loyaltyRepo.getCustomerTier(tenantId, customer.id);
        const rewards = await loyaltyRepo.listAvailableRewards(tenantId, customer.id);
        const walletBalance = await loyaltyRepo.getWalletBalance(tenantId, customer.id);

        res.json({
            customerId: customer.id,
            customerName: customer.name,
            referralCode: customer.referral_code,
            isVip: customer.is_vip === 1,
            vipExpiresAt: customer.vip_expires_at,
            points,
            tier,
            availableRewards: rewards,
            walletBalance
        });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/:slug/loyalty/referral/check
loyaltyRouter.post('/:slug/loyalty/referral/check', tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const { referralCode, customerId } = req.body;

        if (!referralCode || !customerId) {
            return res.status(400).json({ error: 'referralCode e customerId são obrigatórios' });
        }

        await loyaltyRepo.processReferral(tenantId, referralCode, customerId);
        res.json({ success: true, message: 'Indicação vinculada com sucesso! Você ganhará o prêmio após o primeiro pedido do seu amigo.' });
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

// POST /api/:slug/loyalty/redeem
loyaltyRouter.post('/:slug/loyalty/redeem', tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const { customerId, rewardName, pointsCost } = req.body;

        if (!customerId || !rewardName || !pointsCost) {
            return res.status(400).json({ error: 'customerId, rewardName e pointsCost são obrigatórios' });
        }

        const rewardId = await loyaltyRepo.addReward(tenantId, customerId, rewardName, pointsCost);

        res.status(201).json({
            success: true,
            rewardId,
            message: `Prêmio "${rewardName}" resgatado! Mostre este código no balcão: LTY-${rewardId.substring(0, 6).toUpperCase()}`
        });
    } catch (e: any) {
        if (e.message.includes('Insufficient points')) {
            return res.status(400).json({ error: e.message });
        }
        res.status(500).json({ error: e.message });
    }
});

// POST /api/admin/loyalty/:customerId/vip
loyaltyRouter.post('/admin/loyalty/:customerId/vip', adminAuthMiddleware, tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const customerId = req.params.customerId;
        const { isVip, durationDays } = req.body;

        await loyaltyRepo.toggleVip(tenantId, customerId, isVip, durationDays);
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});
