"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const llm_router_1 = require("../llm/llm.router");
const firestore_client_1 = require("../store/firestore.client");
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
            // 5. If WhatsApp token exists, send message (future implementation)
            if (process.env.WHATSAPP_TOKEN) {
                // TODO: Implement WhatsApp sender
                console.log(`Would send to ${phone}: ${reply.text}`);
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
exports.default = webhookRouter;
