import { randomUUID } from 'crypto';
import { getDb } from '../db/db.client';
import type { NotificationEvent, NotificationPayload, NotificationRecipientRole } from './providers/notification.provider';

export type NotificationDeliveryStatus = 'sent' | 'failed' | 'skipped';

export interface NotificationLogEntry {
    orderId: string;
    phone?: string | null;
    event: NotificationEvent | string;
    message?: string;
    status: NotificationDeliveryStatus;
    provider: string;
    recipientRole?: NotificationRecipientRole;
    reason?: string;
    idempotencyKey?: string;
    payload?: Record<string, unknown>;
    channel?: string;
}

const inFlightNotificationKeys = new Set<string>();

export function normalizePhone(raw?: string | null): string | undefined {
    if (!raw) return undefined;

    let phone = String(raw).replace(/\D/g, '');
    if (!phone) return undefined;

    if (phone.startsWith('0')) {
        phone = phone.slice(1);
    }

    if (phone.length <= 11) {
        phone = `55${phone}`;
    }

    return phone;
}

export function resolveRecipientPhone(payload: Pick<NotificationPayload, 'recipientPhone' | 'customerPhone'>): string | undefined {
    return normalizePhone(payload.recipientPhone || payload.customerPhone);
}

export function buildNotificationIdempotencyKey(input: {
    orderId: string;
    event: NotificationEvent | string;
    recipientRole: NotificationRecipientRole;
    phone?: string | null;
}): string | undefined {
    const normalizedPhone = normalizePhone(input.phone);
    if (!normalizedPhone) return undefined;

    return [input.orderId, input.event, input.recipientRole, normalizedPhone].join(':');
}

export async function hasSuccessfulNotification(idempotencyKey?: string): Promise<boolean> {
    if (!idempotencyKey) return false;

    try {
        const db = await getDb();
        const row = await db.get(
            `SELECT id
             FROM notification_logs
             WHERE idempotency_key = ? AND status = 'sent'
             LIMIT 1`,
            [idempotencyKey]
        );

        return !!row;
    } catch (e: any) {
        console.error('[NotifLog] Failed to check idempotency:', e.message);
        return false;
    }
}

export function beginNotificationAttempt(idempotencyKey?: string): boolean {
    if (!idempotencyKey) return true;
    if (inFlightNotificationKeys.has(idempotencyKey)) return false;

    inFlightNotificationKeys.add(idempotencyKey);
    return true;
}

export function finishNotificationAttempt(idempotencyKey?: string): void {
    if (!idempotencyKey) return;
    inFlightNotificationKeys.delete(idempotencyKey);
}

export async function logNotification(entry: NotificationLogEntry): Promise<void> {
    try {
        const db = await getDb();
        const normalizedPhone = normalizePhone(entry.phone) || null;
        const payloadJson = JSON.stringify({
            ...(entry.payload || {}),
            event: entry.event,
            phone: normalizedPhone,
            recipientRole: entry.recipientRole || null,
            status: entry.status,
            provider: entry.provider,
            reason: entry.reason || null,
            idempotencyKey: entry.idempotencyKey || null,
        });

        await db.run(
            `INSERT INTO notification_logs (
                id,
                order_id,
                channel,
                status,
                payload,
                phone,
                event,
                message,
                provider,
                error_message,
                reason,
                recipient_role,
                idempotency_key
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                randomUUID(),
                entry.orderId,
                entry.channel || 'whatsapp',
                entry.status,
                payloadJson,
                normalizedPhone,
                entry.event,
                entry.message ? entry.message.substring(0, 500) : null,
                entry.provider,
                entry.reason || null,
                entry.reason || null,
                entry.recipientRole || null,
                entry.idempotencyKey || null,
            ]
        );
    } catch (e: any) {
        console.error('[NotifLog] Failed to persist log:', e.message);
    }
}
