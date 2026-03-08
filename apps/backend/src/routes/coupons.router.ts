import { Router } from 'express';
import { tenantMiddleware } from '../middlewares/tenant.middleware';

export const couponsRouter = Router();

// Public: Validate coupon at checkout
couponsRouter.post('/:slug/coupons/validate', tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const { code, orderTotalCents } = req.body;
        if (!code) return res.status(400).json({ error: 'Coupon code is required' });

        const db = await (await import('../db/db.client')).getDb();
        const coupon = await db.get(
            `SELECT * FROM coupons WHERE restaurant_id = ? AND code = ? AND active = 1`,
            [tenantId, (code as string).toUpperCase().trim()]
        );

        if (!coupon) return res.status(404).json({ error: 'Cupom não encontrado ou inativo' });
        if (coupon.expires_at && new Date(coupon.expires_at) < new Date())
            return res.status(400).json({ error: 'Cupom expirado' });
        if (coupon.max_uses > 0 && coupon.used_count >= coupon.max_uses)
            return res.status(400).json({ error: 'Cupom esgotado' });
        if (orderTotalCents < coupon.min_order_cents)
            return res.status(400).json({ error: `Pedido mínimo de R$ ${(coupon.min_order_cents / 100).toFixed(2)} para usar este cupom` });

        let discountCents = 0;
        if (coupon.type === 'flat') {
            discountCents = Math.min(coupon.discount_value, orderTotalCents);
        } else if (coupon.type === 'percent') {
            discountCents = Math.floor(orderTotalCents * coupon.discount_value / 10000);
        }

        const description = coupon.type === 'percent'
            ? `Desconto de ${coupon.discount_value / 100}% aplicado`
            : `Desconto de R$ ${(discountCents / 100).toFixed(2)} aplicado`;

        res.json({ valid: true, discountCents, message: description, couponId: coupon.id });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Admin: List coupons
couponsRouter.get('/admin/coupons', tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const db = await (await import('../db/db.client')).getDb();
        const coupons = await db.all(
            `SELECT * FROM coupons WHERE restaurant_id = ? ORDER BY created_at DESC`,
            [tenantId]
        );
        res.json(coupons);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Admin: Create coupon
couponsRouter.post('/admin/coupons', tenantMiddleware, async (req: any, res: any) => {
    try {
        const { v4: uuidv4 } = await import('uuid');
        const tenantId = req.tenantId;
        const { code, description, type, discount_value, min_order_cents, max_uses, expires_at } = req.body;

        if (!code || !type || discount_value == null) return res.status(400).json({ error: 'code, type, discount_value required' });

        const db = await (await import('../db/db.client')).getDb();
        const id = uuidv4();
        await db.run(
            `INSERT INTO coupons (id, restaurant_id, code, description, type, discount_value, min_order_cents, max_uses, expires_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, tenantId, (code as string).toUpperCase().trim(), description || null, type, discount_value, min_order_cents || 0, max_uses || 0, expires_at || null]
        );
        res.status(201).json({ success: true, id, code: (code as string).toUpperCase().trim() });
    } catch (e: any) {
        if (e.message?.includes('UNIQUE')) return res.status(409).json({ error: 'Código de cupom já existe' });
        res.status(500).json({ error: e.message });
    }
});

// Admin: Toggle coupon active
couponsRouter.patch('/admin/coupons/:id', async (req, res) => {
    try {
        const db = await (await import('../db/db.client')).getDb();
        const { active, expires_at, max_uses } = req.body;
        await db.run(
            `UPDATE coupons SET active = COALESCE(?, active), expires_at = COALESCE(?, expires_at), max_uses = COALESCE(?, max_uses) WHERE id = ?`,
            [active ?? null, expires_at ?? null, max_uses ?? null, req.params.id]
        );
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Admin: Delete coupon
couponsRouter.delete('/admin/coupons/:id', async (req, res) => {
    try {
        const db = await (await import('../db/db.client')).getDb();
        await db.run(`DELETE FROM coupons WHERE id = ?`, [req.params.id]);
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});
