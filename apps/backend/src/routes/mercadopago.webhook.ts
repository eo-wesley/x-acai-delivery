/**
 * Mercado Pago Webhook Handler — X-Açaí Delivery
 *
 * Endpoint: POST /api/webhooks/mercadopago
 *
 * Handles payment status updates from Mercado Pago.
 * When payment is "approved", auto-confirms order and sends WhatsApp notification.
 */

import { Router, Request, Response } from 'express';
import { pixPaymentService, logPayment } from '../payments/pix.service';
import { sendNotification } from '../notifications/notification.service';
import { getDb } from '../db/db.client';

const mpWebhookRouter = Router();

// ─── Mercado Pago Webhook ─────────────────────────────────────────────────────
mpWebhookRouter.post('/mercadopago', async (req: Request, res: Response) => {
    // Always respond 200 immediately — MP retries if we don't
    res.status(200).json({ received: true });

    try {
        const body = req.body as any;
        const action = body?.action || body?.type || '';
        const dataId = body?.data?.id || body?.id;

        console.log(`[MP Webhook] action=${action} dataId=${dataId}`);

        // We handle payment.updated and payment.created events
        if (!action.startsWith('payment') || !dataId) {
            return; // Not a payment event
        }

        const db = await getDb();

        // Query MP for the actual payment status
        let mpStatus = '';
        let orderId = body?.data?.external_reference || '';

        // If we have an MP payment ID, query their API for full details
        if (String(dataId).startsWith('mock_')) {
            // Local simulation: orderId is the dataId suffix
            orderId = String(dataId).replace('mock_', '');
            mpStatus = 'approved';
        } else {
            const paymentInfo = await pixPaymentService.getPaymentStatus(String(dataId));
            mpStatus = paymentInfo.status;

            // If no external_reference in body, try to find by payment_reference in DB
            if (!orderId) {
                const found = await db.get(
                    `SELECT id FROM orders WHERE payment_reference=? OR transaction_id=?`,
                    [String(dataId), String(dataId)]
                );
                orderId = found?.id || '';
            }
        }

        // Log the webhook event regardless
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

        // Map MP status to internal payment_status
        let internalStatus = 'pending';
        if (mpStatus === 'approved') internalStatus = 'paid';
        else if (mpStatus === 'rejected' || mpStatus === 'cancelled') internalStatus = 'failed';
        else if (mpStatus === 'pending' || mpStatus === 'in_process') internalStatus = 'waiting_pix';

        // Update order payment_status
        await db.run(
            `UPDATE orders SET payment_status=?, transaction_id=?,
             paid_at=CASE WHEN ? = 'paid' THEN CURRENT_TIMESTAMP ELSE paid_at END,
             updated_at=CURRENT_TIMESTAMP
             WHERE id=?`,
            [internalStatus, String(dataId), internalStatus, orderId]
        );

        console.log(`[MP Webhook] Order ${orderId.slice(0, 8)} payment_status → ${internalStatus}`);

        // If approved → auto-confirm order + notify
        if (internalStatus === 'paid') {
            const order = await db.get(
                `SELECT o.status, o.total_cents, o.customer_phone, o.customer_name, c.phone as c_phone, c.name as c_name
                 FROM orders o LEFT JOIN customers c ON c.id=o.customer_id WHERE o.id=?`,
                [orderId]
            );

            if (order && (order.status === 'pending_payment' || order.status === 'pending')) {
                await db.run(
                    `UPDATE orders SET status='confirmed', updated_at=CURRENT_TIMESTAMP WHERE id=?`,
                    [orderId]
                );
                console.log(`[MP Webhook] Order ${orderId.slice(0, 8)} auto-confirmed ✅`);
            }

            // Send WhatsApp notification: PIX confirmed
            const phone = order?.customer_phone || order?.c_phone;
            const name = order?.customer_name || order?.c_name;
            if (phone || name) {
                sendNotification({
                    orderId,
                    event: 'order_accepted',
                    customerPhone: phone,
                    customerName: name,
                    totalCents: order?.total_cents,
                    extra: { paymentMethod: 'pix' },
                });
                console.log(`[MP Webhook] WhatsApp notificado: pagamento PIX confirmado para ${orderId.slice(0, 8)}`);
            }
        }
    } catch (e: any) {
        console.error('[MP Webhook] Error processing webhook:', e.message);
    }
});

// ─── Simulate Webhook Locally ─────────────────────────────────────────────────
// POST /api/webhooks/mercadopago/simulate/:orderId
mpWebhookRouter.post('/mercadopago/simulate/:orderId', async (req: Request, res: Response) => {
    try {
        const { orderId } = req.params;
        const status = (req.body?.status as string) || 'approved';

        const db = await getDb();
        const order = await db.get(`SELECT id FROM orders WHERE id=? OR id LIKE ?`, [orderId, `${orderId}%`]);
        if (!order) return res.status(404).json({ error: 'Order not found' });

        const internalStatus = status === 'approved' ? 'paid' : 'failed';
        await db.run(
            `UPDATE orders SET payment_status=?, transaction_id=?,
             paid_at=CASE WHEN ? = 'paid' THEN CURRENT_TIMESTAMP ELSE paid_at END,
             status=CASE WHEN ? = 'paid' AND status IN ('pending_payment','pending') THEN 'confirmed' ELSE status END,
             updated_at=CURRENT_TIMESTAMP WHERE id=?`,
            [internalStatus, `sim_${Date.now()}`, internalStatus, internalStatus, order.id]
        );

        await logPayment({
            orderId: order.id,
            provider: 'mercadopago_simulation',
            paymentReference: `sim_${Date.now()}`,
            status: internalStatus,
            payload: JSON.stringify({ simulated: true, requestedStatus: status }),
        });

        if (internalStatus === 'paid') {
            const orderFull = await db.get(
                `SELECT o.total_cents, o.customer_phone, o.customer_name, c.phone as c_phone, c.name as c_name
                 FROM orders o LEFT JOIN customers c ON c.id=o.customer_id WHERE o.id=?`,
                [order.id]
            );
            const phone = orderFull?.customer_phone || orderFull?.c_phone;
            const name = orderFull?.customer_name || orderFull?.c_name;
            if (phone || name) {
                sendNotification({
                    orderId: order.id,
                    event: 'order_accepted',
                    customerPhone: phone,
                    customerName: name,
                    totalCents: orderFull?.total_cents,
                    extra: { paymentMethod: 'pix' },
                });
            }
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
