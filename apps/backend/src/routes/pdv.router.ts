import { Router } from 'express';
import { tenantMiddleware } from '../middlewares/tenant.middleware';

export const pdvRouter = Router();

pdvRouter.post('/admin/pdv/orders', tenantMiddleware, async (req: any, res: any) => {
    // Deprecated? Wait, app.routes.ts had /admin/pdv/orders and /admin/pdv/order
    try {
        const tenantId = req.tenantId;
        const { financeRepo } = await import('../db/repositories/finance.repo');
        const { ordersRepo } = await import('../db/repositories/orders.repo');
        const { menuRepo } = await import('../db/repositories/menu.repo');

        const { items, customer, payment } = req.body;

        if (!items || !items.length) return res.status(400).json({ error: 'Items required' });

        let subtotalCents = 0;
        const processedItems = [];

        for (const item of items) {
            const product = await menuRepo.getById(item.menuItemId);
            if (!product) continue;
            const itemTotal = product.price_cents * item.qty;
            subtotalCents += itemTotal;
            processedItems.push({
                menuItemId: product.id,
                qty: item.qty,
                notes: item.obs || '',
                unitPriceCents: product.price_cents
            });
        }

        const totalCents = subtotalCents;
        const paymentAmountCents = payment?.amount && payment.amount > totalCents ? payment.amount : totalCents;
        const changeDue = paymentAmountCents - totalCents;

        const order = await ordersRepo.createOrder({
            customerId: 'pdv_customer',
            restaurantId: tenantId,
            customerName: customer?.name || 'Cliente Balcão',
            customerPhone: customer?.phone || '00000000000',
            items: processedItems,
            subtotalCents: subtotalCents,
            deliveryFeeCents: 0,
            totalCents: totalCents,
            addressText: 'Balcão',
            notes: 'Pedido via PDV'
        });

        const session = await financeRepo.getOrOpenSession(tenantId);
        await financeRepo.registerPayment(tenantId, order.id, payment?.method || 'cash', totalCents);
        await financeRepo.registerMovement(tenantId, session.id, 'in', payment?.method || 'cash', totalCents, 'pdv_sale', order.id);

        res.status(201).json({ success: true, orderId: order.id, totalCents, changeDueCents: changeDue });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

pdvRouter.post('/admin/pdv/order', tenantMiddleware, async (req: any, res: any) => {
    // This looks identical to the one above in app.routes.ts, maybe an alias?
    try {
        const tenantId = req.tenantId;
        const { financeRepo } = await import('../db/repositories/finance.repo');
        const { ordersRepo } = await import('../db/repositories/orders.repo');
        const { menuRepo } = await import('../db/repositories/menu.repo');

        const { items, customer, payment } = req.body;

        if (!items || !items.length) return res.status(400).json({ error: 'Items required' });

        let subtotalCents = 0;
        const processedItems = [];

        for (const item of items) {
            const product = await menuRepo.getById(item.menuItemId);
            if (!product) continue;
            const itemTotal = product.price_cents * item.qty;
            subtotalCents += itemTotal;
            processedItems.push({
                menuItemId: product.id,
                name: product.name,
                qty: item.qty,
                notes: item.obs || '',
                unitPriceCents: product.price_cents
            });
        }

        const totalCents = subtotalCents;
        const paymentAmountCents = payment?.amount && payment.amount > totalCents ? payment.amount : totalCents;
        const changeDue = paymentAmountCents - totalCents;

        const order = await ordersRepo.createOrder({
            customerId: 'pdv_customer',
            restaurantId: tenantId,
            customerName: customer?.name || 'Cliente Balcão',
            customerPhone: customer?.phone || '00000000000',
            items: processedItems,
            subtotalCents: subtotalCents,
            deliveryFeeCents: 0,
            totalCents: totalCents,
            addressText: 'Balcão',
            notes: 'Pedido via PDV'
        });

        const session = await financeRepo.getOrOpenSession(tenantId);
        await financeRepo.registerPayment(tenantId, order.id, payment?.method || 'cash', totalCents);
        await financeRepo.registerMovement(tenantId, session.id, 'in', payment?.method || 'cash', totalCents, 'pdv_sale', order.id);

        res.status(201).json({ success: true, orderId: order.id, totalCents, changeDueCents: changeDue });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

pdvRouter.post('/admin/pdv/cash/out', tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const { financeRepo } = await import('../db/repositories/finance.repo');
        const { amount, reason } = req.body;

        const session = await financeRepo.getOrOpenSession(tenantId);
        await financeRepo.registerMovement(tenantId, session.id, 'out', 'cash', amount, reason || 'sangria');
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

pdvRouter.get('/admin/pdv/summary', tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const { financeRepo } = await import('../db/repositories/finance.repo');
        const date = req.query.date as string || new Date().toISOString().split('T')[0];

        const summary = await financeRepo.getDailySummary(tenantId, date);
        res.json(summary);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});
