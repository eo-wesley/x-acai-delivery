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

      // 5. If WhatsApp token exists, send message (future implementation)
      if (process.env.WHATSAPP_TOKEN) {
        // TODO: Implement WhatsApp sender
        console.log(`Would send to ${phone}: ${reply.text}`);
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

export default webhookRouter;
