import { menuRepo } from '../../db/repositories/menu.repo';
import { customersRepo } from '../../db/repositories/customers.repo';
import { ordersRepo } from '../../db/repositories/orders.repo';
import { eventBus } from '../../core/eventBus';

export type AITool = (args: any) => Promise<any>;

export const getMenu: AITool = async (args) => {
    console.log('[Tools] getMenu called', args);
    try {
        const availableOnly = args?.availableOnly !== false;
        if (args?.category) {
            return await menuRepo.getMenuByCategory('default_tenant', args.category, availableOnly);
        }
        return await menuRepo.listMenu('default_tenant', availableOnly);
    } catch (e: any) {
        return { error: `DB Error: ${e.message}` };
    }
};

export const searchMenu: AITool = async (args) => {
    console.log('[Tools] searchMenu called with args:', args);
    if (!args?.query) return { error: "Missing 'query' parameter" };
    try {
        return await menuRepo.searchMenu('default_tenant', args.query);
    } catch (e: any) {
        return { error: `DB Error: ${e.message}` };
    }
};

export const calcDeliveryFee: AITool = async (args) => {
    console.log('[Tools] calcDeliveryFee called with args:', args);
    if (!args?.addressText) return { error: "Missing 'addressText'" };

    // MVP: Fake logic based on text length to simulate API
    const fee = args.addressText.length > 30 ? 1200 : 500; // in cents

    return {
        deliveryFeeCents: fee,
        etaMinutes: 30,
        address: args.addressText
    };
};

export const createOrder: AITool = async (args) => {
    console.log('[Tools] createOrder called with args:', args);
    try {
        if (!args?.customer?.name || !args?.customer?.phone) return { error: "Missing customer name or phone" };
        if (!args?.items || !Array.isArray(args.items) || args.items.length === 0) return { error: "Missing or empty items array" };
        if (!args?.addressText) return { error: "Missing addressText" };

        let subtotalCents = 0;
        const processedItems = [];

        for (const item of args.items) {
            if (!item.menuItemId || !item.qty) return { error: "Each item must have menuItemId and qty" };
            const product = await menuRepo.getById(item.menuItemId);
            if (!product) return { error: `Product ID [${item.menuItemId}] not found in menu` };
            if (!product.available) return { error: `Product [${product.name}] is currently unavailable` };

            subtotalCents += (product.price_cents * item.qty);
            processedItems.push({
                menuItemId: product.id,
                name: product.name,
                qty: item.qty,
                notes: item.notes || '',
                unitPriceCents: product.price_cents
            });
        }

        const feeData = await calcDeliveryFee({ addressText: args.addressText });
        const deliveryFeeCents = feeData.deliveryFeeCents || 0;
        const totalCents = subtotalCents + deliveryFeeCents;

        const order = await ordersRepo.createOrder({
            customerId: 'ai_temp_customer',
            restaurantId: 'default_tenant',
            customerName: args.customer.name,
            customerPhone: args.customer.phone,
            items: processedItems,
            subtotalCents,
            deliveryFeeCents,
            totalCents,
            addressText: args.addressText,
            notes: args.notes
        });

        eventBus.emit('order_created', {
            orderId: order.id,
            customerId: order.customer_id,
            restaurantId: 'default_tenant',
            customerPhone: args.customer.phone,
            customerName: args.customer.name,
            totalCents,
            extra: {
                addressText: args.addressText,
                items: processedItems,
            }
        });

        return {
            success: true,
            orderId: order.id,
            status: 'pending',
            totalExpectedCents: totalCents,
            message: "Order placed successfully. Awaiting payment/confirmation."
        };
    } catch (e: any) {
        return { error: `Failed to create order: ${e.message}` };
    }
};

export const getOrderStatus: AITool = async (args) => {
    console.log('[Tools] getOrderStatus called with args:', args);
    try {
        if (args?.orderId) {
            const order = await ordersRepo.getOrderById(args.orderId);
            return order || { error: "Order not found by ID" };
        }
        if (args?.phone) {
            const orders = await ordersRepo.listOrdersByPhone(args.phone);
            return orders.length > 0 ? orders : { message: "No active orders found for this phone" };
        }
        return { error: "Must provide orderId or phone" };
    } catch (e: any) {
        return { error: `DB Error: ${e.message}` };
    }
};

export const cancelOrder: AITool = async (args) => {
    console.log('[Tools] cancelOrder called with args:', args);
    if (!args?.orderId) return { error: "Missing orderId" };
    try {
        const success = await ordersRepo.cancelOrder(args.orderId, args.reason);
        if (success) {
            return { success: true, message: `Order ${args.orderId} cancelled` };
        }
        return { error: "Order could not be cancelled. It might not exist or is already delivered." };
    } catch (e: any) {
        return { error: e.message };
    }
};

export const getBusinessInfo: AITool = async () => {
    console.log('[Tools] getBusinessInfo called');
    return {
        hours: '10:00 - 22:00',
        pickupAddress: 'Rua Principal, 100 - Centro',
        policies: 'Cancelamentos apenas antes do preparo iniciar',
    };
};

export const logFeedback: AITool = async (args) => {
    console.log('[Tools] logFeedback called with args:', args);
    return {
        success: true,
        message: 'Feedback logged internally'
    };
};

export const toolsRegistry: Record<string, AITool> = {
    getMenu,
    searchMenu,
    calcDeliveryFee,
    createOrder,
    getOrderStatus,
    cancelOrder,
    getBusinessInfo,
    logFeedback
};
