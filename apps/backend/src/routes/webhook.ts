import { Router, Request, Response } from 'express';
import { LLMRouter } from '../llm/llm.router';
import {
  saveIncomingMessage,
  saveAssistantMessage,
  getCustomerByPhone,
} from '../store/firestore.client';

const webhookRouter = Router();
const llmRouter = new LLMRouter();

webhookRouter.get('/webhook', (req: Request, res: Response) => {
  const verifyToken = req.query['hub.verify_token'] as string;
  const challenge = req.query['hub.challenge'] as string;

  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || 'verify_token_secret';

  if (verifyToken === expectedToken) {
    res.status(200).send(challenge);
  } else {
    res.status(403).json({ error: 'Verification failed' });
  }
});

interface WhatsAppMessage {
  from: string;
  type: string;
  text?: { body: string };
  image?: { id: string };
  document?: { id: string };
}

interface WebhookPayload {
  entry: Array<{
    changes: Array<{
      value: {
        messages?: WhatsAppMessage[];
        metadata: {
          phone_number_id: string;
        };
      };
    }>;
  }>;
}

webhookRouter.post('/webhook', async (req: Request, res: Response) => {
  try {
    const payload = req.body as WebhookPayload;

    // Acknowledge receipt immediately
    res.status(200).json({ received: true });

    // Process messages asynchronously
    if (!payload.entry?.[0]?.changes?.[0]?.value?.messages) {
      return;
    }

    const messages = payload.entry[0].changes[0].value.messages;

    for (const msg of messages) {
      const phone = msg.from;
      const text = msg.text?.body || '[Non-text message]';

      // 1. Save incoming message
      const messageId = await saveIncomingMessage(phone, text, msg.type as any);

      // 2. Get customer context
      const customer = await getCustomerByPhone(phone);

      // 3. Generate LLM reply
      const llmProvider = llmRouter.getProvider();
      const reply = await llmProvider.generateReply({
        phone,
        message: text,
        context: {
          customerName: customer?.name,
        },
      });

      // 4. Save assistant message
      await saveAssistantMessage(phone, reply.text, reply.provider, messageId);

      // 5. If WhatsApp token exists, send message
      if (process.env.WHATSAPP_TOKEN && payload.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id) {
        const phoneId = payload.entry[0].changes[0].value.metadata.phone_number_id;
        try {
          await fetch(`https://graph.facebook.com/v17.0/${phoneId}/messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: phone,
              type: 'text',
              text: { body: reply.text }
            })
          });
          console.log(`[WhatsApp] Sent reply to ${phone}`);
        } catch (e: any) {
          console.error(`[WhatsApp] Failed to send to ${phone}:`, e.message);
        }
      } else {
        console.log(
          `[DRY-RUN] Generated reply to ${phone}: ${reply.text}`
        );
      }
    }
  } catch (error) {
    console.error('Webhook processing error:', error);
    // Don't throw - already responded to WhatsApp
  }
});

webhookRouter.post('/payment', async (req: Request, res: Response) => {
  try {
    // Basic normalized webhook format for MVP
    let orderId = req.query['external_reference'] as string || req.body?.external_reference || req.body?.orderId;
    const action = req.body?.action || req.body?.status; // generic mapping
    const transactionId = req.body?.data?.id || req.body?.id || req.body?.transactionId;

    if (!orderId) {
      // MercadoPago generally sends `data.id` as payment ID and we should query their API for external_reference.
      // However, to keep it simple locally, we can extract it if we pass it via query /payment?external_reference=123
      console.log('Payment webhook received without clear orderId reference, skipping update.');
      return res.status(200).send('OK');
    }

    const { getDb } = await import('../db/db.client');
    const db = await getDb();

    // Map webhook generic action to status
    let status = 'pending_payment';
    if (action === 'payment.created' || action === 'paid' || action === 'approved') status = 'paid';
    else if (action === 'rejected' || action === 'failed') status = 'failed';
    else if (action === 'refunded') status = 'refunded';

    const paidAtSql = status === 'paid' ? 'CURRENT_TIMESTAMP' : 'paid_at';

    await db.run(
      `UPDATE orders SET payment_status = ?, transaction_id = ?, paid_at = COALESCE(${paidAtSql}, paid_at), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [status, transactionId || 'mp_txn_webhook', orderId]
    );

    // Idempotent progression
    if (status === 'paid') {
      const { ordersRepo } = await import('../db/repositories/orders.repo');

      const order = await db.get(`SELECT status FROM orders WHERE id = ?`, [orderId]);
      if (order && order.status === 'pending') {
        await ordersRepo.updateOrderStatus(orderId, 'preparing');
        console.log(`[Webhook] Order ${orderId} promoted to 'preparing' due to successful payment.`);
      }
    }

    res.status(200).json({ received: true, mapped_status: status });
  } catch (error) {
    console.error('Payment Webhook processing error:', error);
    res.status(500).json({ error: 'Internal failure processing payload.' });
  }
});

export default webhookRouter;
