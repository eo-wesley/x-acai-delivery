import { eventBus } from './eventBus';
import { sendNotification } from '../notifications/notification.service';
import { marketingService } from '../services/marketing.service';

export function setupEventSubscribers() {
    console.log('[EventBus] Setting up core subscribers...');

    const notificationEvents = [
        'order_created',
        'order_accepted',
        'order_preparing',
        'order_delivering',
        'order_completed',
        'order_cancelled'
    ];

    // Listen to all notification events
    for (const evt of notificationEvents) {
        eventBus.on(evt, async (payload: any) => {
            try {
                // Pass directly to the notification service (which handles providers)
                await sendNotification({
                    orderId: payload.orderId,
                    event: evt as any,
                    customerPhone: payload.customerPhone,
                    customerName: payload.customerName,
                    totalCents: payload.totalCents,
                    extra: payload.extra
                });
            } catch (err: any) {
                console.error(`[EventBus] Error in generic notification subscriber for ${evt}:`, err.message);
            }
        });
    }

    // Loyalty points hook
    eventBus.on('order_completed', async (payload: any) => {
        try {
            if (!payload.orderId) return;
            const { getDb } = await import('../db/db.client');
            const { loyaltyRepo } = await import('../db/repositories/loyalty.repo');
            const db = await getDb();

            // Find customer linked to this order
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
                // Rule: R$ 1,00 = 1 point. (total_cents / 100)
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

                // Check for automated marketing rewards (e.g. coupon every 5 orders)
                await marketingService.checkLoyaltyTarget(order.restaurant_id, customer.id);
            }
        } catch (err: any) {
            console.error(`[Loyalty Engine] Error assigning points for order ${payload.orderId}:`, err.message);
        }
    });
}
