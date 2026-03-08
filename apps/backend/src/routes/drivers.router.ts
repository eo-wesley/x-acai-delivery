import { Router } from 'express';
import { tenantMiddleware } from '../middlewares/tenant.middleware';
import { adminAuthMiddleware } from '../middlewares/auth.middleware';
import { driversRepo } from '../db/repositories/drivers.repo';

export const driversRouter = Router();

driversRouter.get('/admin/drivers', adminAuthMiddleware, tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const drivers = await driversRepo.listDrivers(tenantId);
        res.json(drivers);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

driversRouter.post('/admin/drivers', adminAuthMiddleware, tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const id = await driversRepo.createDriver(tenantId, req.body);
        res.status(201).json({ success: true, id });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

driversRouter.put('/admin/drivers/:id', adminAuthMiddleware, tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const success = await driversRepo.updateDriver(tenantId, req.params.id, req.body);
        if (success) res.json({ success: true });
        else res.status(404).json({ error: 'Driver not found' });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

driversRouter.get('/admin/driver-orders', adminAuthMiddleware, tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const driverId = req.query.driver as string;
        const driverOrders = await driversRepo.listDriverOrders(tenantId, driverId);
        res.json(driverOrders);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

driversRouter.post('/admin/driver-orders', adminAuthMiddleware, tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const { driverId, orderId, feeCents } = req.body;
        const id = await driversRepo.assignOrder(tenantId, driverId, orderId, feeCents);
        res.status(201).json({ success: true, id });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

driversRouter.put('/admin/driver-orders/:id/status', adminAuthMiddleware, tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const { status } = req.body; // 'delivered' or 'returned'
        const success = await driversRepo.updateDriverOrderStatus(tenantId, req.params.id, status);
        if (success) res.json({ success: true, status });
        else res.status(404).json({ error: 'Assigned order not found' });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});
