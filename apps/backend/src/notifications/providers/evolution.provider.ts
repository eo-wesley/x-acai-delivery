import { NotificationProvider, NotificationPayload, buildMessage } from './notification.provider';
import { MockWhatsAppProvider } from './mock.provider';

/**
 * EvolutionWhatsAppProvider — sends real WhatsApp messages via Evolution API.
 *
 * Required env variables:
 *   WHATSAPP_BASE_URL      → Base URL of Evolution API (e.g. http://localhost:8080)
 *   WHATSAPP_INSTANCE      → Instance name configured in Evolution API (e.g. acai-delivery)
 *   WHATSAPP_API_KEY       → API key for the Evolution server
 *
 * Optional:
 *   WHATSAPP_NUMBER        → From number override (usually not needed with Evolution API)
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

    private sanitizePhone(raw: string): string {
        let phone = raw.replace(/\D/g, '');
        // Remove leading 0 (local Brazilian format)
        if (phone.startsWith('0')) phone = phone.slice(1);
        // Add country code if not present (11 digits = DDD + number)
        if (phone.length <= 11) phone = '55' + phone;
        return phone;
    }

    async send(payload: NotificationPayload): Promise<void> {
        if (!this.isConfigured()) {
            console.warn(
                '[EvolutionProvider] Credentials missing (WHATSAPP_BASE_URL, WHATSAPP_INSTANCE, WHATSAPP_API_KEY). Falling back to mock.'
            );
            return this.fallback.send(payload);
        }

        if (!payload.customerPhone) {
            console.warn('[EvolutionProvider] No customerPhone provided, skipping notification.');
            return;
        }

        const phone = this.sanitizePhone(payload.customerPhone);
        const text = buildMessage(payload);
        const url = `${this.baseUrl}/message/sendText/${this.instance}`;

        const requestBody = {
            number: phone,
            text,
            delay: 1000, // 1s delay between messages (Evolution API param)
        };

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    apikey: this.apiKey,
                },
                body: JSON.stringify(requestBody),
                signal: AbortSignal.timeout(10000), // 10s timeout
            });

            if (res.ok) {
                const json = (await res.json().catch(() => ({}))) as any;
                const msgId = json?.key?.id || json?.messageId || '?';
                console.log(
                    `[EvolutionProvider] ✅ Sent to ${phone} | event: ${payload.event} | msgId: ${msgId}`
                );
                // Persist log
                await logNotification({
                    orderId: payload.orderId,
                    phone,
                    event: payload.event,
                    message: text,
                    status: 'sent',
                    provider: this.name,
                });
            } else {
                const errBody = await res.text().catch(() => '(no body)');
                console.error(`[EvolutionProvider] ❌ API error ${res.status}: ${errBody}`);
                await logNotification({
                    orderId: payload.orderId,
                    phone,
                    event: payload.event,
                    message: text,
                    status: 'failed',
                    provider: this.name,
                    errorMessage: `HTTP ${res.status}: ${errBody.substring(0, 200)}`,
                });
            }
        } catch (e: any) {
            // Never break the order flow
            console.error(`[EvolutionProvider] ❌ Request failed: ${e.message}`);
            await logNotification({
                orderId: payload.orderId,
                phone,
                event: payload.event,
                message: text,
                status: 'failed',
                provider: this.name,
                errorMessage: e.message,
            });
        }
    }
}

// ─── Notification Log Helper ─────────────────────────────────────────────────

interface LogEntry {
    orderId: string;
    phone?: string;
    event: string;
    message?: string;
    status: 'sent' | 'failed' | 'skipped';
    provider: string;
    errorMessage?: string;
}

export async function logNotification(entry: LogEntry): Promise<void> {
    try {
        const { getDb } = await import('../../db/db.client');
        const db = await getDb();
        const { v4: uuidv4 } = await import('uuid');
        await db.run(
            `INSERT INTO notification_logs (id, order_id, phone, event, message, status, provider, error_message)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                uuidv4(),
                entry.orderId,
                entry.phone || null,
                entry.event,
                entry.message ? entry.message.substring(0, 500) : null,
                entry.status,
                entry.provider,
                entry.errorMessage || null,
            ]
        );
    } catch (e: any) {
        // Log persistence failure must never propagate
        console.error('[NotifLog] Failed to persist log:', e.message);
    }
}
