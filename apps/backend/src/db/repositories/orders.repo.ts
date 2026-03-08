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
    items: OrderItemInput[];
    subtotalCents: number;
    deliveryFeeCents: number;
    totalCents: number;
    addressText: string;
    notes?: string;
}

export class OrdersRepo {

    async createOrder(input: CreateOrderInput & { customerName?: string, customerPhone?: string }): Promise<{ id: string, payment_url?: string }> {
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
            (id, customer_id, status, items, subtotal_cents, delivery_fee_cents, total_cents, address_text, notes, payment_status, payment_provider, restaurant_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id,
                finalCustomerId,
                'pending_payment', // Changed from pending
                itemsJson,
                input.subtotalCents,
                input.deliveryFeeCents,
                input.totalCents,
                input.addressText,
                input.notes || null,
                'pending_payment',
                'mercadopago_mock', // Gateway placeholder configurable later
                input.restaurantId || 'default_tenant'
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

        return { id };
    }

    async createPDVOrder(input: CreateOrderInput & { paymentMethod: string }): Promise<{ id: string }> {
        const db = await getDb();
        const id = randomUUID();
        const tenantId = input.restaurantId || 'default_tenant';

        let finalCustomerId = input.customerId || 'pdv_guest';
        const itemsJson = JSON.stringify(input.items);

        await db.run(
            `INSERT INTO orders 
            (id, customer_id, status, items, subtotal_cents, delivery_fee_cents, total_cents, address_text, notes, payment_status, payment_provider, restaurant_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id,
                finalCustomerId,
                'completed', // PDV orders are immediately completed or handled separately
                itemsJson,
                input.subtotalCents,
                input.deliveryFeeCents || 0,
                input.totalCents,
                'Balcão / PDV',
                input.notes || null,
                'paid',
                `pdv_${input.paymentMethod}`,
                tenantId
            ]
        );

        await this.logOrderEvent(id, 'order_created_pdv', { initialStatus: 'completed', by: 'admin_pdv' });

        // Register Payment in Finance for DRE
        try {
            await (await import('./finance.repo')).financeRepo.registerPayment(
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
            items: JSON.parse(order.items)
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

        return orders.map(o => ({ ...o, items: JSON.parse(o.items) }));
    }

    async updateOrderStatus(id: string, newStatus: string): Promise<boolean> {
        const db = await getDb();
        const res = await db.run(`UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [newStatus, id]);

        if (res.changes && res.changes > 0) {
            await this.logOrderEvent(id, 'status_updated', { newStatus });
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
}

export const ordersRepo = new OrdersRepo();
