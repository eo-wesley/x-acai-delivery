import { Router } from 'express';
import { marketingService } from '../services/marketing.service';
import { getDb } from '../db/db.client';
import { randomUUID } from 'crypto';

const marketingRouter = Router();

// Listar triggers configurados
marketingRouter.get('/admin/marketing/triggers', async (req: any, res: any) => {
    try {
        const restaurantId = req.query.slug || 'default';
        const db = await getDb();
        const triggers = await db.all(`SELECT * FROM marketing_triggers WHERE restaurant_id = ?`, [restaurantId]);
        res.json(triggers);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Upsert trigger
marketingRouter.post('/admin/marketing/triggers', async (req: any, res: any) => {
    try {
        const { type, name, days_inactive, order_count, discount_type, discount_value, active } = req.body;
        const restaurantId = req.query.slug || 'default';
        const db = await getDb();

        const id = randomUUID();
        await db.run(
            `INSERT INTO marketing_triggers (id, restaurant_id, name, type, days_inactive, order_count, discount_type, discount_value, active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(restaurant_id, type) DO UPDATE SET
                name = excluded.name,
                days_inactive = excluded.days_inactive,
                order_count = excluded.order_count,
                discount_type = excluded.discount_type,
                discount_value = excluded.discount_value,
                active = excluded.active`,
            [id, restaurantId, name, type, days_inactive || null, order_count || null, discount_type || 'flat', discount_value || 0, active !== undefined ? active : 1]
        );

        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Executar verificação de winback manualmente (Trigger via Job/CRON)
marketingRouter.post('/admin/marketing/run-winback', async (req: any, res: any) => {
    try {
        const restaurantId = req.query.slug || 'default';
        await marketingService.processWinback(restaurantId);
        res.json({ success: true, message: 'Winback process started' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Executar verificação de aniversariantes manualmente
marketingRouter.post('/admin/marketing/run-birthdays', async (req: any, res: any) => {
    try {
        const restaurantId = req.query.slug || 'default';
        await marketingService.processBirthdays(restaurantId);
        res.json({ success: true, message: 'Birthday check started' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Listar campanhas enviadas
marketingRouter.get('/admin/marketing/history', async (req: any, res: any) => {
    try {
        const restaurantId = req.query.slug || 'default';
        const db = await getDb();
        const history = await db.all(
            `SELECT c.*, cust.name as customer_name, coup.code as coupon_code 
             FROM customer_campaigns c
             JOIN customers cust ON c.customer_id = cust.id
             LEFT JOIN coupons coup ON c.coupon_id = coup.id
             WHERE c.restaurant_id = ?
             ORDER BY c.created_at DESC LIMIT 100`,
            [restaurantId]
        );
        res.json(history);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export { marketingRouter };
