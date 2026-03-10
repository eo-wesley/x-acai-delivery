import { Router } from 'express';
import { marketingRepo } from '../db/repositories/marketing.repo';
import { campaignService } from '../marketing/campaign.service';
import { adminAuthMiddleware } from '../middlewares/auth.middleware';
import { z } from 'zod';

const router = Router();

const campaignSchema = z.object({
    name: z.string().min(3),
    message: z.string().min(5),
    filters: z.object({
        lastOrderDays: z.number().optional(),
        minOrders: z.number().optional(),
        minSpentCents: z.number().optional(),
        tag: z.string().optional()
    })
});

// GET /api/admin/marketing/segmented-count - Calculate potential audience
router.get('/segmented-count', adminAuthMiddleware, async (req, res) => {
    try {
        const tenantId = req.headers['x-tenant-id'] as string;
        const filters = {
            lastOrderDays: req.query.lastOrderDays ? parseInt(req.query.lastOrderDays as string) : undefined,
            minOrders: req.query.minOrders ? parseInt(req.query.minOrders as string) : undefined,
            minSpentCents: req.query.minSpentCents ? parseInt(req.query.minSpentCents as string) : undefined,
            tag: req.query.tag as string
        };

        const customers = await marketingRepo.getSegmentedCustomers(tenantId, filters);
        res.json({ count: customers.length });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/admin/marketing/campaigns - Create and Start Campaign
router.post('/campaigns', adminAuthMiddleware, async (req, res) => {
    try {
        const tenantId = req.headers['x-tenant-id'] as string;
        const body = campaignSchema.parse(req.body);

        const customers = await marketingRepo.getSegmentedCustomers(tenantId, body.filters);

        if (customers.length === 0) {
            return res.status(400).json({ error: 'Nenhum cliente encontrado para estes filtros.' });
        }

        const campaignId = await marketingRepo.createCampaign(
            tenantId,
            body.name,
            body.message,
            body.filters,
            customers.length
        );

        // Execute in background
        campaignService.executeCampaign(tenantId, campaignId);

        res.json({ id: campaignId, totalTarget: customers.length });
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

// GET /api/admin/marketing/campaigns - List campaigns
router.get('/campaigns', adminAuthMiddleware, async (req, res) => {
    try {
        const tenantId = req.headers['x-tenant-id'] as string;
        const campaigns = await marketingRepo.getCampaigns(tenantId);
        res.json(campaigns);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/admin/marketing/campaigns/:id - Details
router.get('/campaigns/:id', adminAuthMiddleware, async (req, res) => {
    try {
        const campaign = await marketingRepo.getCampaignDetails(req.params.id);
        if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada.' });
        res.json(campaign);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
