import { Router } from 'express';
import { ordersRepo } from '../db/repositories/orders.repo';
import { z } from 'zod';
import { pixPaymentService } from '../payments/pix.service';
import { mercadoPagoService } from '../payments/mercadopago.service';
import { tenantMiddleware } from '../middlewares/tenant.middleware';
import { eventBus } from '../core/eventBus';

export const ordersRouter = Router();

const createOrderSchema = z.object({
    customerId: z.string(),
    customerName: z.string().optional(),
    customerPhone: z.string().optional(),
    customerEmail: z.string().email().optional(),
    items: z.array(z.object({
        menuItemId: z.string(),
        qty: z.number().positive(),
        notes: z.string().optional(),
        selected_options: z.array(z.object({
            groupId: z.string(),
            groupName: z.string(),
            optionId: z.string(),
            optionName: z.string(),
            price_cents: z.number()
        })).optional()
    })).min(1),
    subtotalCents: z.number().nonnegative(),
    deliveryFeeCents: z.number().nonnegative(),
    totalCents: z.number().nonnegative(),
    addressText: z.string(),
    notes: z.string().optional(),
    paymentMethod: z.enum(['pix', 'card', 'cash']).optional().default('pix'),
    restaurantId: z.string().optional(),
});

ordersRouter.get('/orders/:id', async (req, res) => {
    try {
        const order = await ordersRepo.getOrderById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json(order);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

ordersRouter.get('/:slug/orders/:id', async (req, res) => {
    try {
        const order = await ordersRepo.getOrderById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json(order);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

ordersRouter.post('/orders', async (req, res) => {
    try {
        const data = createOrderSchema.parse(req.body);
        const processedItems = data.items.map(i => ({ ...i, unitPriceCents: 0 }));
        const order = await ordersRepo.createOrder({ ...data, items: processedItems, restaurantId: 'default_tenant' });

        let pixQrCode = '';
        let pixQrBase64 = '';
        let paymentReference = '';
        let paymentUrl = '';

        if (data.paymentMethod === 'pix' || !data.paymentMethod) {
            try {
                const pixResult = await pixPaymentService.createPixPayment({
                    orderId: order.id,
                    totalCents: data.totalCents,
                    customerName: data.customerName || 'Cliente',
                    customerEmail: data.customerEmail,
                });
                pixQrCode = pixResult.qrCode;
                pixQrBase64 = pixResult.qrCodeBase64;
                paymentReference = pixResult.paymentId;

                const db = await (await import('../db/db.client')).getDb();
                await db.run(
                    `UPDATE orders SET payment_qr_code=?, payment_qr_base64=?, payment_reference=?,
                     payment_provider=?, payment_method=?, customer_name=?, customer_phone=? WHERE id=?`,
                    [pixQrCode, pixQrBase64, paymentReference, pixResult.isMock ? 'mercadopago_mock' : 'mercadopago', 'pix', data.customerName || null, data.customerPhone || null, order.id]
                );
            } catch (pixErr: any) {
                console.error('[Orders/PIX] Failed to generate PIX:', pixErr.message);
            }
        } else {
            paymentUrl = await mercadoPagoService.createPreference(order.id, data.totalCents, processedItems);
        }

        eventBus.emit('order_created', {
            orderId: order.id,
            customerPhone: data.customerPhone,
            customerName: data.customerName,
            totalCents: data.totalCents,
            extra: { items: processedItems, paymentMethod: data.paymentMethod, addressText: data.addressText }
        });

        res.status(201).json({
            ...order,
            payment_url: paymentUrl || undefined,
            pix_qr_code: pixQrCode || undefined,
            pix_qr_base64: pixQrBase64 || undefined,
            payment_reference: paymentReference || undefined,
        });
    } catch (e: any) {
        if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues });
        res.status(500).json({ error: e.message });
    }
});

ordersRouter.post('/:slug/orders', tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const data = createOrderSchema.parse(req.body);

        const paymentMethod = (req.body.paymentMethod as string) || 'pix';
        const discountCents = Number(req.body.discountCents) || 0;
        const couponCode = req.body.couponCode;

        const processedItems = data.items.map(i => ({ ...i, unitPriceCents: 0 }));
        const order = await ordersRepo.createOrder({
            ...data,
            items: processedItems,
            restaurantId: tenantId
        });

        const db = await (await import('../db/db.client')).getDb();
        await db.run(
            `UPDATE orders SET payment_method = ?, discount_cents = ?, coupon_code = ? WHERE id = ?`,
            [paymentMethod, discountCents, couponCode || null, order.id]
        );

        if (couponCode) {
            await db.run(
                `UPDATE coupons SET used_count = used_count + 1 WHERE restaurant_id = ? AND code = ?`,
                [tenantId, couponCode.toUpperCase().trim()]
            ).catch(() => { });
        }

        const checkoutUrl = await mercadoPagoService.createPreference(order.id, data.totalCents, processedItems);
        (order as any).payment_url = checkoutUrl;

        res.status(201).json({
            ...order,
            status: (order as any).status || 'pending_payment',
            restaurant_id: tenantId,
            payment_method: paymentMethod,
            discount_cents: discountCents,
            coupon_code: couponCode || null,
        });
    } catch (e: any) {
        if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues });
        res.status(500).json({ error: e.message });
    }
});

ordersRouter.post('/orders/:id/cancel', async (req, res) => {
    try {
        const reason = req.body.reason || 'Requested by customer';
        const success = await ordersRepo.cancelOrder(req.params.id, reason);
        if (success) {
            const order = await ordersRepo.getOrderById(req.params.id);
            if (order) {
                eventBus.emit('order_cancelled', {
                    orderId: req.params.id,
                    customerPhone: (order as any).customer_phone,
                    customerName: (order as any).customer_name,
                    totalCents: (order as any).total_cents,
                });
            }
            res.json({ success: true, message: 'Order cancelled' });
        } else {
            res.status(400).json({ error: 'Failed to cancel order' });
        }
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

ordersRouter.get('/orders/:id/payment-status', async (req, res) => {
    try {
        const db = await (await import('../db/db.client')).getDb();
        const order = await db.get(
            `SELECT id, payment_status, payment_reference, payment_qr_code, payment_qr_base64, paid_at, status
             FROM orders WHERE id=? OR id LIKE ?`,
            [req.params.id, `${req.params.id}%`]
        );
        if (!order) return res.status(404).json({ error: 'Order not found' });

        if (order.payment_status === 'paid') {
            return res.json({ payment_status: 'paid', order_status: order.status, paid_at: order.paid_at });
        }

        if (order.payment_reference && !order.payment_reference.startsWith('mock_')) {
            const liveStatus = await pixPaymentService.getPaymentStatus(order.payment_reference);
            if (liveStatus.status !== order.payment_status) {
                await db.run(`UPDATE orders SET payment_status=? WHERE id=?`, [liveStatus.status, order.id]);
            }
            return res.json({
                payment_status: liveStatus.status,
                order_status: order.status,
                pix_qr_code: order.payment_qr_code,
            });
        }

        res.json({
            payment_status: order.payment_status,
            order_status: order.status,
            pix_qr_code: order.payment_qr_code,
            pix_qr_base64: order.payment_qr_base64,
        });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});
