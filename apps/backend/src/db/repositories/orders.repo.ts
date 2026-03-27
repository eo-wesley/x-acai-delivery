import { getDb } from '../db.client';
import { randomUUID } from 'crypto';
import { customersRepo } from './customers.repo';
import { recipesRepo } from './recipes.repo';
import { inventoryRepo } from './inventory.repo';

export interface OrderItemInput {
    menuItemId: string;
    qty: number;
    notes?: string;
    unitPriceCents: number; // We ensure backend fetches this from menu.repo before inserting
    selected_options?: { groupId: string, groupName: string, optionId: string, optionName: string, price_cents: number }[];
}

export interface CreateOrderInput {
    customerId: string;
    restaurantId?: string;
    customerName?: string;
    customerPhone?: string;
    items: OrderItemInput[];
    subtotalCents: number;
    deliveryFeeCents: number;
    totalCents: number;
    addressText: string;
    notes?: string;
    paymentMethod?: string;
    source?: string;
    externalId?: string;
    taxId?: string;
}

export class OrdersRepo {

    async createOrder(input: CreateOrderInput): Promise<{ id: string, customer_id: string, payment_url?: string }> {
        const db = await getDb();
        const id = randomUUID();
        const tenantId = input.restaurantId || 'default_tenant';

        let finalCustomerId = input.customerId;
        if (input.customerPhone && input.customerName) {
            // Upsert Customer CRM logic
            finalCustomerId = await customersRepo.upsertCustomer(tenantId, {
                name: input.customerName,
                phone: input.customerPhone
            });
        }

        const itemsJson = JSON.stringify(input.items);

        await db.run(
            `INSERT INTO orders 
            (id, customer_id, status, items, subtotal_cents, delivery_fee_cents, total_cents, address_text, notes, payment_status, payment_provider, payment_method, customer_name, customer_phone, restaurant_id, source, external_id, tax_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id,
                finalCustomerId,
                'pending_payment',
                itemsJson,
                input.subtotalCents,
                input.deliveryFeeCents,
                input.totalCents,
                input.addressText,
                input.notes || null,
                'pending_payment',
                'mercadopago_mock',
                input.paymentMethod || 'pix',
                input.customerName || null,
                input.customerPhone || null,
                tenantId,
                input.source || 'internal',
                input.externalId || null,
                input.taxId || null
            ]
        );

        // Record Initial Event
        await this.logOrderEvent(id, 'order_created', { initialStatus: 'pending_payment', by: 'customer_or_ai' });

        // Update CRM Stats
        try {
            await customersRepo.registerOrderStats(tenantId, finalCustomerId, input.totalCents);
        } catch (e) {
            console.error('Failed to update CRM customer stats', e);
        }

        // Process Inventory Deduction (BOM)
        try {
            for (const item of input.items) {
                const recipe = await recipesRepo.getRecipeForMenuItem(tenantId, item.menuItemId);
                if (!recipe || !recipe.items || recipe.items.length === 0) {
                    console.warn(`[ERP WARNING] No recipe configured for menu item ${item.menuItemId}. Skipping inventory deduction.`);
                    continue;
                }

                for (const recipeItem of recipe.items) {
                    const totalQtyNeeded = recipeItem.qty * item.qty;
                    await inventoryRepo.recordMovement(
                        tenantId,
                        recipeItem.inventory_item_id,
                        'out',
                        totalQtyNeeded,
                        'sale',
                        id // the order id
                    );
                }
            }
        } catch (e) {
            console.error('Failed to process inventory deduction (BOM)', e);
            // Non-blocking fallback
        }

        return { id, customer_id: finalCustomerId };
    }

    async createPDVOrder(input: CreateOrderInput & { paymentMethod: string }): Promise<{ id: string }> {
        const db = await getDb();
        const id = randomUUID();
        const tenantId = input.restaurantId || 'default_tenant';

        let finalCustomerId = input.customerId || 'pdv_guest';
        const itemsJson = JSON.stringify(input.items);

        await db.run(
            `INSERT INTO orders 
            (id, customer_id, status, items, subtotal_cents, delivery_fee_cents, total_cents, address_text, notes, payment_status, payment_provider, restaurant_id, source, tax_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id,
                finalCustomerId,
                'completed',
                itemsJson,
                input.subtotalCents,
                input.deliveryFeeCents || 0,
                input.totalCents,
                'Balcão / PDV',
                input.notes || null,
                'paid',
                `pdv_${input.paymentMethod}`,
                tenantId,
                'pdv',
                input.taxId || null
            ]
        );

        await this.logOrderEvent(id, 'order_created_pdv', { initialStatus: 'completed', by: 'admin_pdv' });

        // Register Payment in Finance for DRE
        try {
            const { financeRepo } = await import('./finance.repo');
            await financeRepo.registerPayment(
                tenantId,
                id,
                `pdv_${input.paymentMethod}`,
                input.totalCents
            );
        } catch (e) {
            console.error('Failed to register payment for PDV order in finance', e);
        }

        // Process Inventory Deduction (BOM)
        try {
            for (const item of input.items) {
                const recipe = await recipesRepo.getRecipeForMenuItem(tenantId, item.menuItemId);
                if (!recipe || !recipe.items || recipe.items.length === 0) continue;
                for (const recipeItem of recipe.items) {
                    const totalQtyNeeded = recipeItem.qty * item.qty;
                    await inventoryRepo.recordMovement(tenantId, recipeItem.inventory_item_id, 'out', totalQtyNeeded, 'sale', id);
                }
            }
        } catch (e) { console.error('Failed to process inventory deduction (BOM)', e); }

        return { id };
    }

    async getOrderById(id: string): Promise<any> {
        const db = await getDb();
        const order = await db.get('SELECT * FROM orders WHERE id = ?', [id]);
        if (!order) return null;
        return {
            ...order,
            items: typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || [])
        };
    }

    async getDetailedOrderById(id: string): Promise<any> {
        const db = await getDb();
        // Base order info
        const order = await db.get(`
            SELECT o.*, r.name as restaurant_name, r.phone as restaurant_phone, r.logo_url as restaurant_logo, r.address as restaurant_address
            FROM orders o
            JOIN restaurants r ON o.restaurant_id = r.id
            WHERE o.id = ? OR o.id LIKE ?`,
            [id, `${id}%`]
        );

        if (!order) return null;

        // Try to get driver info if assigned
        const driverInfo = await db.get(`
            SELECT d.name as driver_name, d.phone as driver_phone, d.vehicle as driver_vehicle
            FROM driver_orders do
            JOIN drivers d ON do.driver_id = d.id
            WHERE do.order_id = ? AND do.status != 'cancelled'
            ORDER BY do.assigned_at DESC LIMIT 1`,
            [order.id]
        );

        return {
            ...order,
            items: typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []),
            driver: driverInfo || null
        };
    }

    async listOrdersByPhone(phone: string): Promise<any[]> {
        const db = await getDb();
        const orders = await db.all(`
            SELECT o.* 
            FROM orders o
            JOIN customers c ON o.customer_id = c.id
            WHERE c.phone = ?
            ORDER BY o.created_at DESC
        `, [phone]);

        return orders.map((o: any) => ({ ...o, items: JSON.parse(o.items) }));
    }

    async updateOrderStatus(id: string, newStatus: string): Promise<boolean> {
        const db = await getDb();
        const orderBefore = await this.getOrderById(id);
        if (!orderBefore) return false;
        if (orderBefore.status === newStatus) return true;

        const res = await db.run(`UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [newStatus, id]);

        if (res.changes && res.changes > 0) {
            await this.logOrderEvent(id, 'status_updated', { newStatus });

            // Emit generic status update for SSE
            const { eventBus } = await import('../../core/eventBus');
            eventBus.emit('order_status_updated', {
                orderId: id,
                status: newStatus,
                restaurantId: orderBefore.restaurant_id
            });

            // Trigger Dispatch if ready
            if (newStatus === 'ready' || newStatus === 'ready_for_pickup') {
                try {
                    const { dispatchService } = await import('../../services/dispatch.service');
                    await dispatchService.dispatchOrder(orderBefore.restaurant_id, id);
                } catch (e) {
                    console.error('[OrdersRepo] Failed to trigger dispatch service', e);
                }
            }

            // Trigger WhatsApp Notification via EventBus
            try {
                const { statusToEvent } = await import('../../notifications/notification.service');
                const eventName = statusToEvent(newStatus);
                if (eventName) {
                    const { eventBus } = await import('../../core/eventBus');
                    eventBus.emit(eventName, {
                        restaurantId: orderBefore.restaurant_id,
                        orderId: id,
                        customerPhone: orderBefore.customer_phone || orderBefore.phone,
                        customerName: orderBefore.customer_name || 'Cliente',
                        totalCents: orderBefore.total_cents,
                        extra: {
                            status: newStatus,
                            paymentMethod: orderBefore.payment_method,
                            addressText: orderBefore.address_text,
                        }
                    });
                }
            } catch (err) {
                console.error('[OrdersRepo] Failed to emit status update event', err);
            }

            // Phase 50: Reward Referrer when order is completed/delivered
            if (newStatus === 'delivered' || newStatus === 'completed') {
                try {
                    const { loyaltyRepo } = await import('./loyalty.repo');
                    await loyaltyRepo.rewardReferral(orderBefore.restaurant_id, orderBefore.customer_id);
                } catch (e) {
                    console.error('[OrdersRepo] Failed to process referral reward', e);
                }
            }

            return true;
        }
        return false;
    }

    async cancelOrder(id: string, reason: string = 'User requested cancellation'): Promise<boolean> {
        const db = await getDb();
        const order = await this.getOrderById(id);

        if (!order) throw new Error('Order not found');
        if (order.status === 'delivered') throw new Error('Cannot cancel delivered order');

        const res = await db.run(`UPDATE orders SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [id]);

        if (res.changes && res.changes > 0) {
            await this.logOrderEvent(id, 'order_cancelled', { reason });

            // Trigger WhatsApp Notification
            try {
                const { eventBus } = await import('../../core/eventBus');
                eventBus.emit('order_cancelled', {
                    restaurantId: order.restaurant_id,
                    orderId: id,
                    customerPhone: order.customer_phone || order.phone,
                    customerName: order.customer_name || 'Cliente',
                    totalCents: order.total_cents,
                    extra: { reason }
                });
            } catch (err) {
                console.error('[OrdersRepo] Failed to emit cancel event', err);
            }

            return true;
        }
        return false;
    }

    async logOrderEvent(orderId: string, type: string, payload: any) {
        const db = await getDb();
        const id = randomUUID();
        await db.run(
            `INSERT INTO order_events (id, order_id, type, payload) VALUES (?, ?, ?, ?)`,
            [id, orderId, type, JSON.stringify(payload)]
        );
    }

    async submitRating(orderId: string, rating: number, feedback?: string): Promise<boolean> {
        const db = await getDb();
        const res = await db.run(
            `UPDATE orders SET rating = ?, feedback = ? WHERE id = ?`,
            [rating, feedback || null, orderId]
        );
        return res.changes ? res.changes > 0 : false;
    }
}

export const ordersRepo = new OrdersRepo();
