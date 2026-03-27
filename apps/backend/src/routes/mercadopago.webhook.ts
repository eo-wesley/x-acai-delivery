/**
 * Mercado Pago Webhook Handler - X-Acai Delivery
 *
 * Endpoint: POST /api/payments/mercadopago/webhook/mercadopago
 *
 * Handles payment status updates from Mercado Pago.
 * When payment is approved, auto-confirms the order and emits the operational event.
 */

import { Router, Request, Response } from 'express';
import { pixPaymentService, logPayment } from '../payments/pix.service';
import { getDb } from '../db/db.client';
import { eventBus } from '../core/eventBus';

const mpWebhookRouter = Router();

async function loadOrderForPaymentEvent(orderId: string) {
    const db = await getDb();
    return db.get(
        `SELECT
            o.id,
            o.restaurant_id,
            o.status,
            o.payment_status,
            o.total_cents,
            o.customer_phone,
            o.customer_name,
            c.phone AS fallback_customer_phone,
            c.name AS fallback_customer_name
         FROM orders o
         LEFT JOIN customers c ON c.id = o.customer_id
         WHERE o.id = ?`,
        [orderId]
    );
}

async function emitApprovedPaymentEvent(orderId: string, order: any) {
    if (!order || order.payment_status === 'paid') return;

    const db = await getDb();

    if (order.status === 'pending_payment' || order.status === 'pending') {
        await db.run(
            `UPDATE orders SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [orderId]
        );
        console.log(`[MP Webhook] Order ${orderId.slice(0, 8)} auto-confirmed`);
    }

    eventBus.emit('order_accepted', {
        restaurantId: order.restaurant_id,
        orderId,
        customerPhone: order.customer_phone || order.fallback_customer_phone,
        customerName: order.customer_name || order.fallback_customer_name,
        totalCents: order.total_cents,
        extra: { paymentMethod: 'pix' },
    });
}

mpWebhookRouter.post('/mercadopago', async (req: Request, res: Response) => {
    res.status(200).json({ received: true });

    try {
        const body = req.body as any;
        const action = body?.action || body?.type || '';
        const dataId = body?.data?.id || body?.id;

        console.log(`[MP Webhook] action=${action} dataId=${dataId}`);

        if (!action.startsWith('payment') || !dataId) {
            return;
        }

        const db = await getDb();

        let mpStatus = '';
        let orderId = body?.data?.external_reference || '';

        if (String(dataId).startsWith('mock_')) {
            orderId = String(dataId).replace('mock_', '');
            mpStatus = 'approved';
        } else {
            const paymentInfo = await pixPaymentService.getPaymentStatus(String(dataId));
            mpStatus = paymentInfo.status;

            if (!orderId) {
                const found = await db.get(
                    `SELECT id FROM orders WHERE payment_reference = ? OR transaction_id = ?`,
                    [String(dataId), String(dataId)]
                );
                orderId = found?.id || '';
            }
        }

        await logPayment({
            orderId: orderId || 'unknown',
            provider: 'mercadopago',
            paymentReference: String(dataId),
            status: mpStatus,
            payload: JSON.stringify({ action, dataId, mpStatus }),
        });

        if (!orderId || orderId === 'unknown') {
            console.warn('[MP Webhook] Could not find associated order for payment', dataId);
            return;
        }

        const currentOrder = await loadOrderForPaymentEvent(orderId);
        if (!currentOrder) {
            console.warn('[MP Webhook] Order not found while applying payment update', orderId);
            return;
        }

        let internalStatus = 'pending';
        if (mpStatus === 'approved') internalStatus = 'paid';
        else if (mpStatus === 'rejected' || mpStatus === 'cancelled') internalStatus = 'failed';
        else if (mpStatus === 'pending' || mpStatus === 'in_process') internalStatus = 'waiting_pix';

        await db.run(
            `UPDATE orders SET payment_status = ?, transaction_id = ?,
             paid_at = CASE WHEN ? = 'paid' THEN CURRENT_TIMESTAMP ELSE paid_at END,
             updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [internalStatus, String(dataId), internalStatus, orderId]
        );

        console.log(`[MP Webhook] Order ${orderId.slice(0, 8)} payment_status -> ${internalStatus}`);

        if (internalStatus === 'paid') {
            await emitApprovedPaymentEvent(orderId, currentOrder);
        }
    } catch (e: any) {
        console.error('[MP Webhook] Error processing webhook:', e.message);
    }
});

mpWebhookRouter.post('/mercadopago/simulate/:orderId', async (req: Request, res: Response) => {
    try {
        const { orderId } = req.params;
        const status = (req.body?.status as string) || 'approved';

        const db = await getDb();
        const order = await db.get(`SELECT id FROM orders WHERE id = ? OR id LIKE ?`, [orderId, `${orderId}%`]);
        if (!order) return res.status(404).json({ error: 'Order not found' });

        const currentOrder = await loadOrderForPaymentEvent(order.id);
        if (!currentOrder) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const internalStatus = status === 'approved' ? 'paid' : 'failed';
        const paymentReference = `sim_${Date.now()}`;

        await db.run(
            `UPDATE orders SET payment_status = ?, transaction_id = ?,
             paid_at = CASE WHEN ? = 'paid' THEN CURRENT_TIMESTAMP ELSE paid_at END,
             status = CASE WHEN ? = 'paid' AND status IN ('pending_payment', 'pending') THEN 'confirmed' ELSE status END,
             updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [internalStatus, paymentReference, internalStatus, internalStatus, order.id]
        );

        await logPayment({
            orderId: order.id,
            provider: 'mercadopago_simulation',
            paymentReference,
            status: internalStatus,
            payload: JSON.stringify({ simulated: true, requestedStatus: status }),
        });

        if (internalStatus === 'paid') {
            await emitApprovedPaymentEvent(order.id, currentOrder);
        }

        res.json({
            ok: true,
            orderId: order.id,
            payment_status: internalStatus,
            order_status: internalStatus === 'paid' ? 'confirmed' : 'unchanged',
        });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default mpWebhookRouter;
