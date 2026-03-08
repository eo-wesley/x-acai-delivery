import { Router } from 'express';
import { tenantMiddleware } from '../middlewares/tenant.middleware';

export const customersRouter = Router();

customersRouter.get('/admin/customers', tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const { customersRepo } = await import('../db/repositories/customers.repo');
        const filters = {
            q: req.query.q as string,
            tag: req.query.tag as string
        };
        const customers = await customersRepo.listCustomers(tenantId, filters);
        res.json(customers);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

customersRouter.get('/admin/customers/:id', tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const { customersRepo } = await import('../db/repositories/customers.repo');
        const customer = await customersRepo.getCustomerById(tenantId, req.params.id);
        if (!customer) return res.status(404).json({ error: 'Customer not found' });
        res.json(customer);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

customersRouter.get('/admin/customers/:id/orders', tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const { getDb } = await import('../db/db.client');
        const db = await getDb();
        const orders = await db.all(
            `SELECT * FROM orders WHERE restaurant_id = ? AND customer_phone = (SELECT phone FROM customers WHERE id = ?) ORDER BY created_at DESC`,
            [tenantId, req.params.id]
        );
        res.json(orders);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

customersRouter.post('/admin/customers', tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const { customersRepo } = await import('../db/repositories/customers.repo');
        const id = await customersRepo.upsertCustomer(tenantId, req.body);
        res.status(201).json({ success: true, id });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

customersRouter.put('/admin/customers/:id', tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const { customersRepo } = await import('../db/repositories/customers.repo');
        const success = await customersRepo.updateCustomer(tenantId, req.params.id, req.body);
        if (success) res.json({ success: true });
        else res.status(404).json({ error: 'Customer not found' });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});
