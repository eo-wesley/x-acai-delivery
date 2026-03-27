import { NotificationProvider, NotificationPayload, buildMessage } from './notification.provider';
import { MockWhatsAppProvider } from './mock.provider';
import { logNotification, resolveRecipientPhone } from '../notification-log.service';

/**
 * EvolutionWhatsAppProvider - sends real WhatsApp messages via Evolution API.
 *
 * Required env variables:
 *   WHATSAPP_BASE_URL
 *   WHATSAPP_INSTANCE
 *   WHATSAPP_API_KEY
 *
 * If credentials are missing, falls back to MockWhatsAppProvider.
 */
export class EvolutionWhatsAppProvider implements NotificationProvider {
    readonly name = 'EvolutionWhatsApp';

    private baseUrl: string;
    private instance: string;
    private apiKey: string;
    private fallback = new MockWhatsAppProvider();

    constructor() {
        this.baseUrl = (process.env.WHATSAPP_BASE_URL || '').replace(/\/$/, '');
        this.instance = process.env.WHATSAPP_INSTANCE || '';
        this.apiKey = process.env.WHATSAPP_API_KEY || '';
    }

    isConfigured(): boolean {
        return !!(this.baseUrl && this.instance && this.apiKey);
    }

    async send(payload: NotificationPayload): Promise<void> {
        if (!this.isConfigured()) {
            console.warn(
                '[EvolutionProvider] Credentials missing (WHATSAPP_BASE_URL, WHATSAPP_INSTANCE, WHATSAPP_API_KEY). Falling back to mock.'
            );
            return this.fallback.send(payload);
        }

        const phone = resolveRecipientPhone(payload);
        const text = buildMessage(payload);
        const recipientRole = payload.recipientRole || 'customer';

        if (!phone) {
            console.warn('[EvolutionProvider] No recipient phone provided, skipping notification.');
            await logNotification({
                orderId: payload.orderId,
                phone: payload.recipientPhone || payload.customerPhone,
                event: payload.event,
                message: text,
                status: 'skipped',
                provider: this.name,
                recipientRole,
                reason: 'recipient_phone_missing',
                idempotencyKey: payload.idempotencyKey,
            });
            return;
        }

        let config = {
            baseUrl: this.baseUrl,
            instance: this.instance,
            apiKey: this.apiKey
        };

        if (payload.restaurantId) {
            try {
                const { getDb } = await import('../../db/db.client');
                const db = await getDb();
                const dbConfig = await db.get(
                    'SELECT * FROM whatsapp_configs WHERE restaurant_id = ? AND active = 1',
                    [payload.restaurantId]
                );

                if (dbConfig?.base_url && dbConfig?.instance && dbConfig?.apikey) {
                    config = {
                        baseUrl: String(dbConfig.base_url).replace(/\/$/, ''),
                        instance: dbConfig.instance,
                        apiKey: dbConfig.apikey
                    };
                }
            } catch (e: any) {
                console.error('[EvolutionProvider] Failed to load db config:', e.message);
            }
        }

        if (!config.baseUrl || !config.instance || !config.apiKey) {
            console.warn(
                `[EvolutionProvider] Configuration missing for restaurant ${payload.restaurantId || 'global'}. Falling back to mock.`
            );
            return this.fallback.send(payload);
        }

        const url = `${config.baseUrl}/message/sendText/${config.instance}`;
        const requestBody = {
            number: phone,
            text,
            delay: 1000,
        };

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    apikey: config.apiKey,
                },
                body: JSON.stringify(requestBody),
                signal: AbortSignal.timeout(10000),
            });

            if (res.ok) {
                const json = (await res.json().catch(() => ({}))) as any;
                const msgId = json?.key?.id || json?.messageId || '?';
                console.log(
                    `[EvolutionProvider] Sent to ${phone} | role: ${recipientRole} | event: ${payload.event} | msgId: ${msgId}`
                );

                await logNotification({
                    orderId: payload.orderId,
                    phone,
                    event: payload.event,
                    message: text,
                    status: 'sent',
                    provider: this.name,
                    recipientRole,
                    idempotencyKey: payload.idempotencyKey,
                    payload: { messageId: msgId },
                });
            } else {
                const errBody = await res.text().catch(() => '(no body)');
                const reason = `HTTP ${res.status}: ${errBody.substring(0, 200)}`;
                console.error(`[EvolutionProvider] API error ${res.status}: ${errBody}`);

                await logNotification({
                    orderId: payload.orderId,
                    phone,
                    event: payload.event,
                    message: text,
                    status: 'failed',
                    provider: this.name,
                    recipientRole,
                    reason,
                    idempotencyKey: payload.idempotencyKey,
                });
            }
        } catch (e: any) {
            console.error(`[EvolutionProvider] Request failed: ${e.message}`);
            await logNotification({
                orderId: payload.orderId,
                phone,
                event: payload.event,
                message: text,
                status: 'failed',
                provider: this.name,
                recipientRole,
                reason: e.message,
                idempotencyKey: payload.idempotencyKey,
            });
        }
    }
}
