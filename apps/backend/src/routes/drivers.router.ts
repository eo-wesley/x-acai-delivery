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

driversRouter.get('/admin/drivers/:id/stats', adminAuthMiddleware, tenantMiddleware, async (req: any, res: any) => {
    try {
        const stats = await driversRepo.getDriverStats(req.tenantId, req.params.id);
        res.json(stats);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

driversRouter.post('/admin/drivers/:id/settle', adminAuthMiddleware, tenantMiddleware, async (req: any, res: any) => {
    try {
        const changes = await driversRepo.settleDriverPayments(req.tenantId, req.params.id);
        res.json({ success: true, settled_count: changes });
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

        // Notificar Driver via WhatsApp (Evolution API)
        try {
            const db = await (await import('../db/db.client')).getDb();
            const driver = await db.get(`SELECT * FROM drivers WHERE id = ?`, [driverId]);
            const order = await db.get(`SELECT * FROM orders WHERE id = ?`, [orderId]);

            if (driver && order) {
                const { EvolutionWhatsAppProvider } = await import('../notifications/providers/evolution.provider');
                const wa = new EvolutionWhatsAppProvider();
                if (wa.isConfigured()) {
                    const message = `🚀 *NOVA ENTREGA DISPONÍVEL!* \n\n📍 *Endereço:* ${order.address_text}\n👤 *Cliente:* ${order.customer_name || 'Não informado'}\n💰 *Taxa:* R$ ${(feeCents / 100).toFixed(2).replace('.', ',')}\n\nPor favor, retire o pedido no balcão e abra o link para iniciar a entrega. Boa rota! 🛵💨`;

                    await wa.send({
                        orderId: orderId,
                        customerPhone: driver.phone,
                        event: 'order_dispatched',
                        restaurantName: 'X-Açaí Delivery',
                        extra: { body: message }
                    });
                }
            }
        } catch (err) {
            console.error('[Driver Dispatch] Failed to send WhatsApp notification', err);
        }

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
