import { Router } from 'express';
import { ordersRepo } from '../db/repositories/orders.repo';
import { tenantMiddleware } from '../middlewares/tenant.middleware';

export const reviewsRouter = Router();

// Public: Submit rating
reviewsRouter.post('/orders/:id/rating', async (req, res) => {
    try {
        const { v4: uuidv4 } = await import('uuid');
        const orderId = req.params.id;
        const { stars, comment, customerName } = req.body;

        if (!stars || stars < 1 || stars > 5) return res.status(400).json({ error: 'Stars must be 1–5' });

        const order = await ordersRepo.getOrderById(orderId);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        if ((order as any).status !== 'completed') return res.status(400).json({ error: 'Só é possível avaliar pedidos concluídos' });

        const db = await (await import('../db/db.client')).getDb();
        const id = uuidv4();
        await db.run(
            `INSERT INTO order_ratings (id, order_id, restaurant_id, customer_name, stars, comment)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [id, orderId, (order as any).restaurant_id || 'default_tenant', customerName || null, stars, comment || null]
        );
        res.status(201).json({ success: true, id });
    } catch (e: any) {
        if (e.message?.includes('UNIQUE')) return res.status(409).json({ error: 'Este pedido já foi avaliado' });
        res.status(500).json({ error: e.message });
    }
});

// Public: Get rating for an order
reviewsRouter.get('/orders/:id/rating', async (req, res) => {
    try {
        const db = await (await import('../db/db.client')).getDb();
        const rating = await db.get(`SELECT * FROM order_ratings WHERE order_id = ?`, [req.params.id]);
        if (!rating) return res.status(404).json({ error: 'No rating found' });
        res.json(rating);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Admin: List all ratings for tenant
reviewsRouter.get('/admin/ratings', tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const db = await (await import('../db/db.client')).getDb();
        const ratings = await db.all(
            `SELECT r.*, o.total_cents, o.created_at as order_date
             FROM order_ratings r
             JOIN orders o ON r.order_id = o.id
             WHERE r.restaurant_id = ?
             ORDER BY r.created_at DESC`,
            [tenantId]
        );
        res.json(ratings);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});
