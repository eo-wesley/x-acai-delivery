import { NotificationProvider, NotificationPayload, buildMessage } from './notification.provider';
import { logNotification } from './evolution.provider';

/**
 * MockWhatsAppProvider — logs to console, never makes external calls.
 * Also persists to notification_logs table for audit trail.
 * Used when WHATSAPP_PROVIDER=mock or no credentials are configured.
 */
export class MockWhatsAppProvider implements NotificationProvider {
    readonly name = 'MockWhatsApp';

    async send(payload: NotificationPayload): Promise<void> {
        const msg = buildMessage(payload);
        const phone = payload.customerPhone || '(sem telefone)';
        console.log(`\n📱 [WhatsApp MOCK] → ${phone}`);
        console.log(`   Event  : ${payload.event}`);
        console.log(`   Order  : ${payload.orderId.slice(0, 8).toUpperCase()}`);
        console.log(`   Msg    : "${msg.substring(0, 120)}${msg.length > 120 ? '...' : ''}"`);
        console.log('');

        // Persist mock notification to log table
        await logNotification({
            orderId: payload.orderId,
            phone: phone !== '(sem telefone)' ? phone : undefined,
            event: payload.event,
            message: msg,
            status: 'sent',
            provider: this.name,
        });
    }
}
