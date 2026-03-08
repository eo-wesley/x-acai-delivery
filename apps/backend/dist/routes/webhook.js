"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const llm_router_1 = require("../llm/llm.router");
const firestore_client_1 = require("../store/firestore.client");
const orderParser_1 = require("../ai/orderParser");
const pix_service_1 = require("../payments/pix.service");
const evolution_provider_1 = require("../notifications/providers/evolution.provider");
const webhookRouter = (0, express_1.Router)();
const llmRouter = new llm_router_1.LLMRouter();
webhookRouter.get('/webhook', (req, res) => {
    const verifyToken = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || 'verify_token_secret';
    if (verifyToken === expectedToken) {
        res.status(200).send(challenge);
    }
    else {
        res.status(403).json({ error: 'Verification failed' });
    }
});
webhookRouter.post('/webhook', async (req, res) => {
    try {
        const payload = req.body;
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
            const messageId = await (0, firestore_client_1.saveIncomingMessage)(phone, text, msg.type);
            // 2. Get customer context
            const customer = await (0, firestore_client_1.getCustomerByPhone)(phone);
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
            await (0, firestore_client_1.saveAssistantMessage)(phone, reply.text, reply.provider, messageId);
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
                }
                catch (e) {
                    console.error(`[WhatsApp] Failed to send to ${phone}:`, e.message);
                }
            }
            else {
                console.log(`[DRY-RUN] Generated reply to ${phone}: ${reply.text}`);
            }
        }
    }
    catch (error) {
        console.error('Webhook processing error:', error);
        // Don't throw - already responded to WhatsApp
    }
});
/**
 * Evolution API Webhook Handler (Phase 13 & 14)
 */
webhookRouter.post('/webhook/evolution', async (req, res) => {
    try {
        const payload = req.body;
        // Acknowledge Evolution API immediately
        res.status(200).json({ status: 'SUCCESS' });
        if (payload.event !== 'messages.upsert')
            return;
        const data = payload.data;
        if (!data.key || data.key.fromMe)
            return;
        const phone = data.key.remoteJid.replace('@s.whatsapp.net', '');
        const messageText = data.message?.conversation || data.message?.extendedTextMessage?.text;
        if (!messageText)
            return;
        console.log(`[Evolution-Webhook] Incoming from ${phone}: ${messageText}`);
        // 1. AI Parse Order
        const restaurantId = payload.instance || 'default';
        const parsed = await orderParser_1.orderParser.parseOrder(messageText, restaurantId);
        if (parsed && parsed.product_id) {
            // 2. Mock Order ID for flow (or create real draft in DB)
            const tempOrderId = `wa_${Date.now()}`;
            // 3. Generate PIX
            const payment = await pix_service_1.pixPaymentService.createPixPayment({
                orderId: tempOrderId,
                totalCents: parsed.total_cents,
                customerName: data.pushName || 'Cliente WhatsApp',
            });
            // 4. Send Confirmation & PIX back to user
            const evolution = new evolution_provider_1.EvolutionWhatsAppProvider();
            if (evolution.isConfigured()) {
                const responseMsg = `📋 *PEDIDO ENTENDIDO!* \n\n` +
                    `✅ Produto: ${parsed.product_name}\n` +
                    `🔢 Qtd: ${parsed.quantity}\n` +
                    `💰 Total: R$ ${(parsed.total_cents / 100).toFixed(2).replace('.', ',')}\n` +
                    (parsed.modifiers?.length ? `➕ Adicionais: ${parsed.modifiers.join(', ')}\n` : '') +
                    `📝 Obs: ${parsed.notes || 'Nenhuma'}\n\n` +
                    `👇 *PAGAMENTO PIX (Copia e Cola):*\n\n` +
                    `${payment.qrCode}\n\n` +
                    `⚠️ Após pagar, envie o comprovante aqui!`;
                await evolution.send({
                    orderId: tempOrderId,
                    customerPhone: phone,
                    event: 'order_created',
                    restaurantName: 'X-Açaí Delivery',
                    totalCents: parsed.total_cents,
                    extra: { body: responseMsg } // Provider needs to support custom body or use buildMessage
                });
            }
        }
        else {
            // Fallback: Default LLM help if not a clear order
            console.log(`[Evolution-Webhook] No product detected, skipping auto-order.`);
        }
    }
    catch (error) {
        console.error('[Evolution-Webhook] Error:', error.message);
    }
});
webhookRouter.post('/payment', async (req, res) => {
    try {
        // Basic normalized webhook format for MVP
        let orderId = req.query['external_reference'] || req.body?.external_reference || req.body?.orderId;
        const action = req.body?.action || req.body?.status; // generic mapping
        const transactionId = req.body?.data?.id || req.body?.id || req.body?.transactionId;
        if (!orderId) {
            // MercadoPago generally sends `data.id` as payment ID and we should query their API for external_reference.
            // However, to keep it simple locally, we can extract it if we pass it via query /payment?external_reference=123
            console.log('Payment webhook received without clear orderId reference, skipping update.');
            return res.status(200).send('OK');
        }
        const { getDb } = await Promise.resolve().then(() => __importStar(require('../db/db.client')));
        const db = await getDb();
        // Map webhook generic action to status
        let status = 'pending_payment';
        if (action === 'payment.created' || action === 'paid' || action === 'approved')
            status = 'paid';
        else if (action === 'rejected' || action === 'failed')
            status = 'failed';
        else if (action === 'refunded')
            status = 'refunded';
        const paidAtSql = status === 'paid' ? 'CURRENT_TIMESTAMP' : 'paid_at';
        await db.run(`UPDATE orders SET payment_status = ?, transaction_id = ?, paid_at = COALESCE(${paidAtSql}, paid_at), updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [status, transactionId || 'mp_txn_webhook', orderId]);
        // Idempotent progression
        if (status === 'paid') {
            const { ordersRepo } = await Promise.resolve().then(() => __importStar(require('../db/repositories/orders.repo')));
            const order = await db.get(`SELECT status FROM orders WHERE id = ?`, [orderId]);
            if (order && order.status === 'pending') {
                await ordersRepo.updateOrderStatus(orderId, 'preparing');
                console.log(`[Webhook] Order ${orderId} promoted to 'preparing' due to successful payment.`);
            }
        }
        res.status(200).json({ received: true, mapped_status: status });
    }
    catch (error) {
        console.error('Payment Webhook processing error:', error);
        res.status(500).json({ error: 'Internal failure processing payload.' });
    }
});
exports.default = webhookRouter;
