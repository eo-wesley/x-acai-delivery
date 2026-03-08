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

driversRouter.post('/admin/driver-orders/auto', adminAuthMiddleware, tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const { orderId } = req.body;

        if (!orderId) return res.status(400).json({ error: 'orderId é obrigatório' });

        // 1. Encontrar melhor entregador
        const driver = await driversRepo.findOptimalDriver(tenantId);
        if (!driver) return res.status(404).json({ error: 'Nenhum entregador disponível no momento.' });

        // 2. Calcular taxas e estimativas (Simulado)
        const estimates = await driversRepo.calculateDeliveryEstimate(orderId);
        const feeCents = 500; // Taxa padrão R$ 5,00

        // 3. Atribuir pedido
        const assignmentId = await driversRepo.assignOrder(tenantId, driver.id, orderId, feeCents);

        // 4. Notificar Driver (Reutilizando lógica)
        try {
            const { EvolutionWhatsAppProvider } = await import('../notifications/providers/evolution.provider');
            const wa = new EvolutionWhatsAppProvider();
            if (wa.isConfigured()) {
                const db = await (await import('../db/db.client')).getDb();
                const order = await db.get(`SELECT * FROM orders WHERE id = ?`, [orderId]);

                const message = `🚀 *DESPACHO AUTOMÁTICO!* \n\n📍 *Endereço:* ${order.address_text}\n👤 *Cliente:* ${order.customer_name || 'Não informado'}\n📏 *Distância:* ${estimates.distanceKm}km\n⏱️ *Tempo Est.:* ${estimates.estimatedMinutes}min\n💰 *Sua Taxa:* R$ ${(feeCents / 100).toFixed(2).replace('.', ',')}\n\nPor favor, retire o pedido no balcão. Boa rota! 🛵💨`;

                await wa.send({
                    orderId: orderId,
                    customerPhone: driver.phone,
                    event: 'order_dispatched',
                    restaurantName: 'X-Açaí Delivery',
                    extra: { body: message }
                });
            }
        } catch (err) {
            console.error('[Auto Dispatch] Notification Error:', err);
        }

        res.json({ success: true, assignmentId, driver: driver.name, estimates });
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
