import { Router } from 'express';
import { SaaSOnboardingService } from '../services/saas-onboarding.service';

export const saasRouter = Router();

saasRouter.post('/onboard', async (req, res) => {
    try {
        const result = await SaaSOnboardingService.createRestaurant(req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

saasRouter.post('/onboard/template', async (req, res) => {
    try {
        const { restaurantId, template } = req.body;
        await SaaSOnboardingService.applyMenuTemplate(restaurantId, template);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

saasRouter.get('/onboard/status', async (req, res) => {
    try {
        const { restaurantId } = req.query;
        const db = await (await import('../db/db.client')).getDb();
        const restaurant = await db.get(`SELECT onboarding_step FROM restaurants WHERE id = ?`, [restaurantId]);
        res.json(restaurant || { onboarding_step: 0 });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

saasRouter.get('/plans', (req, res) => {
    res.json([
        { id: 'starter', name: 'Plano Pro (Starter)', price_cents: 9900 },
        { id: 'pro', name: 'Plano Master (Pro)', price_cents: 19900 },
        { id: 'enterprise', name: 'Plano Ultimate (Enterprise)', price_cents: 49900 }
    ]);
});
