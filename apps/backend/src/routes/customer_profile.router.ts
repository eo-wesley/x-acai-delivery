import { Router } from 'express';
import { tenantMiddleware } from '../middlewares/tenant.middleware';
import { customerAuthMiddleware } from '../middlewares/customer_auth.middleware';
import { customersRepo } from '../db/repositories/customers.repo';
import { loyaltyRepo } from '../db/repositories/loyalty.repo';

export const customerProfileRouter = Router();

// GET /api/:slug/customer/me
customerProfileRouter.get('/:slug/customer/me', tenantMiddleware, customerAuthMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const customerId = req.customerId;

        const customer = await customersRepo.getCustomerById(tenantId, customerId);
        if (!customer) return res.status(404).json({ error: 'Cliente não encontrado' });

        const points = await loyaltyRepo.getCustomerPoints(tenantId, customerId);
        const tier = await loyaltyRepo.getCustomerTier(tenantId, customerId);

        res.json({
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
            email: customer.email,
            points,
            tier
        });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/:slug/customer/orders
customerProfileRouter.get('/:slug/customer/orders', tenantMiddleware, customerAuthMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const customerPhone = req.customerPhone;

        const { getDb } = await import('../db/db.client');
        const db = await getDb();
        const orders = await db.all(
            `SELECT * FROM orders WHERE restaurant_id = ? AND customer_phone = ? ORDER BY created_at DESC`,
            [tenantId, customerPhone]
        );

        res.json(orders);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/:slug/customer/addresses
customerProfileRouter.get('/:slug/customer/addresses', tenantMiddleware, customerAuthMiddleware, async (req: any, res: any) => {
    try {
        const customerId = req.customerId;
        const addresses = await customersRepo.getAddresses(customerId);
        res.json(addresses);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/:slug/customer/addresses
customerProfileRouter.post('/:slug/customer/addresses', tenantMiddleware, customerAuthMiddleware, async (req: any, res: any) => {
    try {
        const customerId = req.customerId;
        const addressId = await customersRepo.addAddress(customerId, req.body);
        res.status(201).json({ success: true, id: addressId });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});
