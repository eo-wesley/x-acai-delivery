import { Router } from 'express';
import { ordersRepo } from '../db/repositories/orders.repo';
import { z } from 'zod';
import { pixPaymentService } from '../payments/pix.service';
import { mercadoPagoService } from '../payments/mercadopago.service';
import { tenantMiddleware } from '../middlewares/tenant.middleware';
import { eventBus } from '../core/eventBus';
import { loyaltyRepo } from '../db/repositories/loyalty.repo';
import { PricingService } from '../services/pricing.service';
import { menuRepo } from '../db/repositories/menu.repo';

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
    paymentMethod: z.enum(['pix', 'card', 'cash', 'wallet']).optional().default('pix'),
    restaurantId: z.string().optional(),
});

function emitOrderCreatedEvent(payload: {
    orderId: string;
    restaurantId: string;
    customerId?: string;
    customerPhone?: string;
    customerName?: string;
    totalCents: number;
    paymentMethod?: string;
    addressText?: string;
    items?: unknown[];
}) {
    eventBus.emit('order_created', {
        orderId: payload.orderId,
        restaurantId: payload.restaurantId,
        customerId: payload.customerId,
        customerPhone: payload.customerPhone,
        customerName: payload.customerName,
        totalCents: payload.totalCents,
        extra: {
            paymentMethod: payload.paymentMethod,
            addressText: payload.addressText,
            items: payload.items,
        }
    });
}

async function getPublicPaymentStatus(orderId: string) {
    const db = await (await import('../db/db.client')).getDb();
    const order = await db.get(
        `SELECT id, payment_status, payment_reference, payment_qr_code, payment_qr_base64, paid_at, status
         FROM orders WHERE id=? OR id LIKE ?`,
        [orderId, `${orderId}%`]
    );

    if (!order) {
        return null;
    }

    if (order.payment_status === 'paid') {
        return {
            payment_status: 'paid',
            order_status: order.status,
            paid_at: order.paid_at,
            pix_qr_code: order.payment_qr_code,
            pix_qr_base64: order.payment_qr_base64,
        };
    }

    if (order.payment_reference && !order.payment_reference.startsWith('mock_')) {
        const liveStatus = await pixPaymentService.getPaymentStatus(order.payment_reference);

        if (liveStatus.status !== order.payment_status) {
            await db.run(`UPDATE orders SET payment_status=? WHERE id=?`, [liveStatus.status, order.id]);
        }

        return {
            payment_status: liveStatus.status,
            order_status: order.status,
            paid_at: liveStatus.paidAt || order.paid_at,
            pix_qr_code: order.payment_qr_code,
            pix_qr_base64: order.payment_qr_base64,
        };
    }

    return {
        payment_status: order.payment_status,
        order_status: order.status,
        paid_at: order.paid_at,
        pix_qr_code: order.payment_qr_code,
        pix_qr_base64: order.payment_qr_base64,
    };
}

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
        const order = await ordersRepo.createOrder({
            ...data,
            items: processedItems,
            restaurantId: 'default_tenant',
            paymentMethod: data.paymentMethod,
        });

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

        emitOrderCreatedEvent({
            restaurantId: 'default_tenant',
            orderId: order.id,
            customerId: order.customer_id,
            customerPhone: data.customerPhone,
            customerName: data.customerName,
            totalCents: data.totalCents,
            paymentMethod: data.paymentMethod,
            addressText: data.addressText,
            items: processedItems,
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

        // Apply Dynamic Pricing (Surge & Happy Hour)
        const surge = await PricingService.calculateDeliveryFee(tenantId, data.deliveryFeeCents);
        const finalDeliveryFee = surge.finalFeeCents;

        const processedItems = await Promise.all(data.items.map(async (i) => {
            const itemBase = await menuRepo.getMenuItemById(tenantId, i.menuItemId);
            if (!itemBase) return { ...i, unitPriceCents: 0 };

            const pricing = await PricingService.calculateItemPrice(tenantId, itemBase);
            let unitPrice = pricing.finalPriceCents;

            // Add options price
            if (i.selected_options) {
                unitPrice += i.selected_options.reduce((sum, opt) => sum + opt.price_cents, 0);
            }

            return { ...i, unitPriceCents: unitPrice };
        }));

        const finalSubtotal = processedItems.reduce((sum, i) => sum + (i.unitPriceCents * i.qty), 0);
        const finalTotal = finalSubtotal + finalDeliveryFee - discountCents;

        const order = await ordersRepo.createOrder({
            ...data,
            items: processedItems,
            deliveryFeeCents: finalDeliveryFee,
            subtotalCents: finalSubtotal,
            totalCents: finalTotal,
            restaurantId: tenantId,
            paymentMethod,
        });

        const db = await (await import('../db/db.client')).getDb();
        await db.run(
            `UPDATE orders SET payment_method = ?, discount_cents = ?, coupon_code = ?, is_surge = ?, is_happy_hour = ? WHERE id = ?`,
            [paymentMethod, discountCents, couponCode || null, surge.isSurge ? 1 : 0, 0, order.id] // Simplified HH tracking
        );

        if (couponCode) {
            await db.run(
                `UPDATE coupons SET used_count = used_count + 1 WHERE restaurant_id = ? AND code = ?`,
                [tenantId, couponCode.toUpperCase().trim()]
            ).catch(() => { });
        }

        if (paymentMethod === 'wallet') {
            const balance = await loyaltyRepo.getWalletBalance(tenantId, order.customer_id);
            if (balance < data.totalCents) {
                // We should probably cancel the order here or throw an error before creation
                // But for now, let's just mark it as pending and return an error
                await db.run(`UPDATE orders SET status = 'cancelled' WHERE id = ?`, [order.id]);
                return res.status(400).json({ error: 'Saldo insuficiente na carteira.' });
            }

            await loyaltyRepo.updateWalletBalance(
                tenantId,
                order.customer_id,
                data.totalCents,
                'debit',
                `Pagamento do pedido ${order.id.substring(0, 8)}`,
                order.id
            );

            await db.run(
                `UPDATE orders SET payment_status = 'paid', paid_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [order.id]
            );
            (order as any).status = 'confirmed'; // Auto confirm wallet payments
            await db.run(`UPDATE orders SET status = 'confirmed' WHERE id = ?`, [order.id]);

            eventBus.emit('order_accepted', {
                restaurantId: tenantId,
                orderId: order.id,
                customerId: order.customer_id,
                customerPhone: data.customerPhone,
                customerName: data.customerName,
                totalCents: finalTotal,
                extra: {
                    paymentMethod,
                    addressText: data.addressText,
                    items: processedItems,
                }
            });
        } else if (paymentMethod === 'pix') {
            const pixInfo = await pixPaymentService.createPixPayment({
                orderId: order.id,
                totalCents: finalTotal,
                customerName: data.customerName || 'Cliente X-Açaí',
                customerEmail: data.customerEmail
            });

            await db.run(
                `UPDATE orders SET payment_provider = 'mercadopago_pix', payment_reference = ?, payment_qr_code = ?, payment_qr_base64 = ? WHERE id = ?`,
                [pixInfo.paymentId, pixInfo.qrCode, pixInfo.qrCodeBase64, order.id]
            );

            (order as any).pix_qr_code = pixInfo.qrCode;
            (order as any).pix_qr_base64 = pixInfo.qrCodeBase64;
            (order as any).payment_reference = pixInfo.paymentId;
            (order as any).pix_expires_at = pixInfo.expiresAt;
        } else if (paymentMethod === 'card') {
            const checkoutUrl = await mercadoPagoService.createPreference(order.id, data.totalCents, processedItems);
            (order as any).payment_url = checkoutUrl;
        }

        emitOrderCreatedEvent({
            restaurantId: tenantId,
            orderId: order.id,
            customerId: order.customer_id,
            customerPhone: data.customerPhone,
            customerName: data.customerName,
            totalCents: finalTotal,
            paymentMethod,
            addressText: data.addressText,
            items: processedItems,
        });

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
            res.json({ success: true, message: 'Order cancelled' });
        } else {
            res.status(400).json({ error: 'Failed to cancel order' });
        }
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

ordersRouter.get('/:slug/orders/:id/payment-status', async (req, res) => {
    try {
        const paymentStatus = await getPublicPaymentStatus(req.params.id);
        if (!paymentStatus) return res.status(404).json({ error: 'Order not found' });

        res.json(paymentStatus);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

ordersRouter.get('/orders/:id/payment-status', async (req, res) => {
    try {
        const paymentStatus = await getPublicPaymentStatus(req.params.id);
        if (!paymentStatus) return res.status(404).json({ error: 'Order not found' });

        res.json(paymentStatus);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Rastreamento público de pedido
ordersRouter.get('/track/:id', async (req, res) => {
    try {
        const order = await ordersRepo.getDetailedOrderById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json(order);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

ordersRouter.post('/orders/:id/rate', async (req, res) => {
    try {
        const { rating, feedback } = req.body;
        if (typeof rating !== 'number' || rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }
        const success = await ordersRepo.submitRating(req.params.id, rating, feedback);
        if (success) {
            // Also log event
            await ordersRepo.logOrderEvent(req.params.id, 'order_rated', { rating, feedback });
            res.json({ success: true, message: 'Rating submitted' });
        } else {
            res.status(404).json({ error: 'Order not found' });
        }
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});
