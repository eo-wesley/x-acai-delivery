import { Router } from 'express';
import { adminAuthMiddleware } from '../middlewares/auth.middleware';
import { tenantMiddleware } from '../middlewares/tenant.middleware';
import { getDb } from '../db/db.client';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

export const pdvRouter = Router();

// Checkout Rápido PDV (venda de balcão)
pdvRouter.post('/admin/pdv/orders', adminAuthMiddleware, tenantMiddleware, async (req: any, res: any) => {
    const {
        items,
        totalCents,
        subtotalCents,
        deliveryFeeCents,
        paymentMethod,
        customerName,
        customerPhone,
        customerId,
        addressText
    } = req.body;

    // Support slug from query if not in body (validate.js uses query ?slug=default)
    const slug = req.query.slug || req.body.slug || 'default';
    const tenantId = req.tenantId || 'default_tenant';

    try {
        const db = await getDb();
        const orderId = randomUUID();
        const finalCustomerId = customerId || 'pdv_guest';

        // 1. Ensure customer exists
        const existingCustomer = await db.get(
            `SELECT id FROM customers WHERE id = ? AND restaurant_id = ?`,
            [finalCustomerId, tenantId]
        );
        if (!existingCustomer) {
            await db.run(
                `INSERT INTO customers (id, restaurant_id, name, phone) 
                 VALUES (?, ?, ?, ?)`,
                [finalCustomerId, tenantId, customerName || 'Cliente PDV', customerPhone || '11900000000']
            );
        }

        // 2. Create order
        await db.run(
            `INSERT INTO orders (
                id, customer_id, status, items, subtotal_cents, delivery_fee_cents, total_cents,
                restaurant_id, address_text, payment_method, payment_status, customer_name, customer_phone
            ) VALUES (?, ?, 'completed', ?, ?, ?, ?, ?, ?, ?, 'paid', ?, ?)`,
            [
                orderId,
                finalCustomerId,
                JSON.stringify(items || []),
                subtotalCents || totalCents || 0,
                deliveryFeeCents || 0,
                totalCents || 0,
                tenantId,
                addressText || 'Venda de Balcão',
                paymentMethod || 'cash',
                customerName || 'Cliente PDV',
                customerPhone || '11900000000'
            ]
        );

        res.status(201).json({ success: true, orderId });
    } catch (error: any) {
        console.error('[PDV-SQL-FATAL]', error);
        res.status(500).json({ error: error.message, code: error.code, stack: error.stack });
    }
});
