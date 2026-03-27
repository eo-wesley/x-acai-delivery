import { NotificationProvider, NotificationPayload, buildMessage } from './notification.provider';
import { logNotification, resolveRecipientPhone } from '../notification-log.service';

/**
 * MockWhatsAppProvider - logs to console, never makes external calls.
 * Also persists to notification_logs table for audit trail.
 * Used when WHATSAPP_PROVIDER=mock or no credentials are configured.
 */
export class MockWhatsAppProvider implements NotificationProvider {
    readonly name = 'MockWhatsApp';

    async send(payload: NotificationPayload): Promise<void> {
        const msg = buildMessage(payload);
        const phone = resolveRecipientPhone(payload);
        const recipientRole = payload.recipientRole || 'customer';

        if (!phone) {
            console.warn(`[WhatsApp MOCK] Skipping ${payload.event} (${recipientRole}) - no recipient phone`);
            await logNotification({
                orderId: payload.orderId,
                phone: payload.recipientPhone || payload.customerPhone,
                event: payload.event,
                message: msg,
                status: 'skipped',
                provider: this.name,
                recipientRole,
                reason: 'recipient_phone_missing',
                idempotencyKey: payload.idempotencyKey,
            });
            return;
        }

        console.log(`\n[WhatsApp MOCK] -> ${phone}`);
        console.log(`   Event : ${payload.event}`);
        console.log(`   Role  : ${recipientRole}`);
        console.log(`   Order : ${payload.orderId.slice(0, 8).toUpperCase()}`);
        console.log(`   Msg   : "${msg.substring(0, 120)}${msg.length > 120 ? '...' : ''}"`);
        console.log('');

        await logNotification({
            orderId: payload.orderId,
            phone,
            event: payload.event,
            message: msg,
            status: 'sent',
            provider: this.name,
            recipientRole,
            idempotencyKey: payload.idempotencyKey,
        });
    }
}
