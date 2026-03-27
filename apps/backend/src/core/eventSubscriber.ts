import { eventBus } from './eventBus';
import { sendNotification } from '../notifications/notification.service';
import { buildMessage, type NotificationPayload } from '../notifications/providers/notification.provider';
import {
    beginNotificationAttempt,
    buildNotificationIdempotencyKey,
    finishNotificationAttempt,
    hasSuccessfulNotification,
    logNotification,
    normalizePhone,
} from '../notifications/notification-log.service';
import { marketingService } from '../services/marketing.service';

type OperationalNotificationEvent = 'order_created' | 'order_accepted' | 'order_delivering';

interface EventPayload {
    orderId?: string;
    restaurantId?: string;
    customerId?: string;
    customerPhone?: string;
    customerName?: string;
    restaurantName?: string;
    totalCents?: number;
    extra?: NotificationPayload['extra'];
}

interface NotificationContext {
    orderId: string;
    restaurantId?: string;
    restaurantName?: string;
    customerPhone?: string;
    customerName?: string;
    restaurantPhone?: string;
    totalCents?: number;
    extra?: NotificationPayload['extra'];
}

function parseOrderItems(raw: unknown): NonNullable<NotificationPayload['extra']>['items'] {
    if (!raw) return undefined;

    if (Array.isArray(raw)) {
        return raw as NonNullable<NotificationPayload['extra']>['items'];
    }

    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : undefined;
        } catch {
            return undefined;
        }
    }

    return undefined;
}

async function loadNotificationContext(payload: EventPayload): Promise<NotificationContext | null> {
    if (!payload.orderId) return null;

    const { getDb } = await import('../db/db.client');
    const db = await getDb();

    const order = await db.get(
        `SELECT
            o.id,
            o.restaurant_id,
            o.customer_phone,
            o.customer_name,
            o.total_cents,
            o.address_text,
            o.payment_method,
            o.items,
            r.name AS restaurant_name,
            r.whatsapp AS restaurant_whatsapp,
            r.phone AS restaurant_phone,
            c.phone AS fallback_customer_phone,
            c.name AS fallback_customer_name
         FROM orders o
         LEFT JOIN restaurants r ON r.id = o.restaurant_id
         LEFT JOIN customers c ON c.id = o.customer_id
         WHERE o.id = ?`,
        [payload.orderId]
    );

    let restaurant = order;
    if (!restaurant?.restaurant_name && payload.restaurantId) {
        restaurant = {
            ...restaurant,
            ...(await db.get(`SELECT name AS restaurant_name, whatsapp AS restaurant_whatsapp, phone AS restaurant_phone FROM restaurants WHERE id = ?`, [payload.restaurantId]))
        };
    }

    return {
        orderId: payload.orderId,
        restaurantId: payload.restaurantId || order?.restaurant_id,
        restaurantName: payload.restaurantName || restaurant?.restaurant_name || 'X-Acai',
        restaurantPhone: restaurant?.restaurant_whatsapp || restaurant?.restaurant_phone,
        customerPhone: payload.customerPhone || order?.customer_phone || order?.fallback_customer_phone,
        customerName: payload.customerName || order?.customer_name || order?.fallback_customer_name || 'Cliente',
        totalCents: payload.totalCents ?? order?.total_cents,
        extra: {
            ...(payload.extra || {}),
            paymentMethod: payload.extra?.paymentMethod || order?.payment_method,
            addressText: payload.extra?.addressText || order?.address_text,
            items: parseOrderItems(payload.extra?.items ?? order?.items),
        }
    };
}

async function dispatchOperationalNotification(event: OperationalNotificationEvent, payload: EventPayload) {
    try {
        const context = await loadNotificationContext(payload);
        if (!context?.orderId) return;

        const targets: Array<{
            recipientRole: 'customer' | 'store';
            phone?: string;
            reason: string;
        }> = [
            {
                recipientRole: 'customer',
                phone: context.customerPhone,
                reason: 'customer_phone_missing',
            }
        ];

        if (event === 'order_created') {
            targets.push({
                recipientRole: 'store',
                phone: context.restaurantPhone,
                reason: 'store_phone_missing',
            });
        }

        for (const target of targets) {
            const normalizedPhone = normalizePhone(target.phone);
            const idempotencyKey = buildNotificationIdempotencyKey({
                orderId: context.orderId,
                event,
                recipientRole: target.recipientRole,
                phone: target.phone,
            });

            const notificationPayload: NotificationPayload = {
                restaurantId: context.restaurantId,
                restaurantName: context.restaurantName,
                orderId: context.orderId,
                event,
                customerPhone: context.customerPhone,
                customerName: context.customerName,
                totalCents: context.totalCents,
                extra: context.extra,
                recipientPhone: normalizedPhone || target.phone,
                recipientRole: target.recipientRole,
                idempotencyKey,
            };

            if (!normalizedPhone) {
                await logNotification({
                    orderId: context.orderId,
                    phone: target.phone,
                    event,
                    message: buildMessage(notificationPayload),
                    status: 'skipped',
                    provider: 'NotificationDispatcher',
                    recipientRole: target.recipientRole,
                    reason: target.reason,
                    idempotencyKey,
                });
                continue;
            }

            if (!beginNotificationAttempt(idempotencyKey)) {
                console.log(
                    `[EventBus] Skipping in-flight duplicate notification ${event} (${target.recipientRole}) for order ${context.orderId.slice(0, 8)}`
                );
                continue;
            }

            try {
                if (await hasSuccessfulNotification(idempotencyKey)) {
                    console.log(
                        `[EventBus] Skipping duplicate notification ${event} (${target.recipientRole}) for order ${context.orderId.slice(0, 8)}`
                    );
                    continue;
                }

                await sendNotification({
                    ...notificationPayload,
                    recipientPhone: normalizedPhone,
                });
            } finally {
                finishNotificationAttempt(idempotencyKey);
            }
        }
    } catch (err: any) {
        console.error(`[EventBus] Error in notification subscriber for ${event}:`, err.message);
    }
}

export function setupEventSubscribers() {
    console.log('[EventBus] Setting up core subscribers...');

    const notificationEvents: OperationalNotificationEvent[] = [
        'order_created',
        'order_accepted',
        'order_delivering',
    ];

    for (const evt of notificationEvents) {
        eventBus.on(evt, async (payload: EventPayload) => {
            await dispatchOperationalNotification(evt, payload);
        });
    }

    eventBus.on('order_completed', async (payload: any) => {
        try {
            if (!payload.orderId) return;
            const { getDb } = await import('../db/db.client');
            const { loyaltyRepo } = await import('../db/repositories/loyalty.repo');
            const db = await getDb();

            const order = await db.get(
                `SELECT restaurant_id, customer_phone, total_cents FROM orders WHERE id = ?`,
                [payload.orderId]
            );
            if (!order || !order.customer_phone) return;

            const customer = await db.get(
                `SELECT id FROM customers WHERE restaurant_id = ? AND phone = ?`,
                [order.restaurant_id, order.customer_phone]
            );

            if (customer) {
                const pointsToEarn = Math.floor(order.total_cents / 100);
                if (pointsToEarn > 0) {
                    await loyaltyRepo.addPoints(
                        order.restaurant_id,
                        customer.id,
                        pointsToEarn,
                        `Pontos do Pedido #${payload.orderId.substring(order.id.length - 6).toUpperCase()}`,
                        payload.orderId
                    );
                    console.log(`[Loyalty Engine] Added points to customer ${customer.id}`);
                }

                await marketingService.checkLoyaltyTarget(order.restaurant_id, customer.id);
            }
        } catch (err: any) {
            console.error(`[Loyalty Engine] Error assigning points for order ${payload.orderId}:`, err.message);
        }
    });
}
