/**
 * Notification Service — X-Açaí Delivery
 *
 * Delegates to a configured NotificationProvider based on WHATSAPP_PROVIDER env var.
 *
 * Providers:
 *   mock       → Logs to console (default, no credentials needed)
 *   evolution  → Evolution API (requires WHATSAPP_BASE_URL, WHATSAPP_INSTANCE, WHATSAPP_API_KEY)
 *
 * WHATSAPP_PROVIDER=mock       → Console only
 * WHATSAPP_PROVIDER=evolution  → Evolution API with mock fallback if credentials missing
 *
 * NOTE: Notifications NEVER block the order flow — all errors are swallowed internally.
 */

export type {
    NotificationEvent,
    NotificationPayload,
    NotificationProvider,
    NotificationRecipientRole,
} from './providers/notification.provider';

import type { NotificationPayload, NotificationEvent } from './providers/notification.provider';
import { MockWhatsAppProvider } from './providers/mock.provider';
import { EvolutionWhatsAppProvider } from './providers/evolution.provider';
import type { NotificationProvider } from './providers/notification.provider';

// ─── Provider Factory ─────────────────────────────────────────────────────────

let _provider: NotificationProvider | null = null;

function getProvider(): NotificationProvider {
    if (_provider) return _provider;

    const providerName = (process.env.WHATSAPP_PROVIDER || 'mock').toLowerCase().trim();

    switch (providerName) {
        case 'evolution':
            _provider = new EvolutionWhatsAppProvider();
            console.log(`[Notification] Using provider: EvolutionWhatsApp`);
            break;
        case 'mock':
        default:
            _provider = new MockWhatsAppProvider();
            console.log(`[Notification] Using provider: MockWhatsApp`);
            break;
    }

    return _provider;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function sendNotification(payload: NotificationPayload): Promise<void> {
    try {
        const provider = getProvider();
        await provider.send(payload);
    } catch (e: any) {
        // Notifications must NEVER break the main order flow
        console.error('[Notification] Swallowed error:', e.message);
    }
}

// Maps status string to notification event
export function statusToEvent(status: string): NotificationEvent | null {
    const map: Record<string, NotificationEvent> = {
        pending: 'order_created',
        pending_payment: 'order_created',
        confirmed: 'order_accepted',
        accepted: 'order_accepted',
        preparing: 'order_preparing',
        out_for_delivery: 'order_delivering',
        delivering: 'order_delivering',
        delivered: 'order_delivered',
        completed: 'order_delivered',
        cancelled: 'order_cancelled',
    };
    return map[status] ?? null;
}
