import { Router } from 'express';
import { driversRepo } from '../db/repositories/drivers.repo';
import jwt from 'jsonwebtoken';

export const driverAppRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Auth: Login via Slug + Phone + Access Code
driverAppRouter.post('/driver/login', async (req: any, res: any) => {
    try {
        const { slug, phone, accessCode } = req.body;
        if (!slug || !phone || !accessCode) {
            return res.status(400).json({ error: 'Todos os campos são obrigatórios (Slug, Telefone, Código).' });
        }

        const driver = await driversRepo.authenticateDriver(slug, phone, accessCode);
        if (!driver) {
            return res.status(401).json({ error: 'Credenciais inválidas. Verifique os dados e tente novamente.' });
        }

        // Create a specific token for the driver
        const token = jwt.sign(
            { id: driver.id, restaurantId: driver.restaurant_id, role: 'driver' },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({ token, driver: { id: driver.id, name: driver.name, restaurant_id: driver.restaurant_id } });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Middleware for Driver Auth
const driverAuthMiddleware = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Token não fornecido' });

    const token = authHeader.split(' ')[1];
    try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'driver') return res.status(403).json({ error: 'Acesso negado: não é um entregador' });
        req.driverId = decoded.id;
        req.tenantId = decoded.restaurantId;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Token inválido' });
    }
};

// List active orders for the authenticated driver
driverAppRouter.get('/driver/active-orders', driverAuthMiddleware, async (req: any, res: any) => {
    try {
        const orders = await driversRepo.listDriverOrders(req.tenantId, req.driverId);
        // Filter only those that aren't finished/returned yet
        const active = orders.filter((o: any) => o.status === 'assigned' || o.status === 'picked_up');
        res.json(active);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Toggle Online/Offline status
driverAppRouter.post('/driver/presence', driverAuthMiddleware, async (req: any, res: any) => {
    try {
        const { isOnline } = req.body;
        await driversRepo.setPresence(req.tenantId, req.driverId, isOnline);
        res.json({ success: true, isOnline });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Update order status (Pick Up / Deliver)
driverAppRouter.put('/driver/order-status', driverAuthMiddleware, async (req: any, res: any) => {
    try {
        const { driverOrderId, status } = req.body;
        if (!['picked_up', 'delivered', 'returned'].includes(status)) {
            return res.status(400).json({ error: 'Status inválido.' });
        }

        const success = await driversRepo.updateDriverOrderStatus(req.tenantId, driverOrderId, status);

        // Notify customer if status is picked_up
        if (status === 'picked_up' && success) {
            try {
                const db = await (await import('../db/db.client')).getDb();
                const assignment = await db.get(`SELECT order_id, driver_id FROM driver_orders WHERE id = ?`, [driverOrderId]);
                const order = await db.get(`SELECT * FROM orders WHERE id = ?`, [assignment.order_id]);
                const driver = await db.get(`SELECT * FROM drivers WHERE id = ?`, [assignment.driver_id]);

                const { EvolutionWhatsAppProvider } = await import('../notifications/providers/evolution.provider');
                const wa = new EvolutionWhatsAppProvider();
                if (wa.isConfigured()) {
                    const message = `🛵 *PEDIDO A CAMINHO!* \n\nOlá ${order.customer_name}, o entregador *${driver.name}* acabou de coletar seu pedido e já está a caminho do seu endereço! \n\nPrepare o paladar, seu açaí chega logo! 🚀`;
                    await wa.send({
                        orderId: order.id,
                        customerPhone: order.customer_phone,
                        event: 'order_delivering',
                        restaurantName: 'X-Açaí Delivery',
                        extra: { body: message }
                    });
                }
            } catch (notifyErr) {
                console.error('[Driver App Notification] Error:', notifyErr);
            }
        }

        res.json({ success });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Driver Wallet (Stats)
driverAppRouter.get('/driver/wallet', driverAuthMiddleware, async (req: any, res: any) => {
    try {
        const stats = await driversRepo.getDriverStats(req.tenantId, req.driverId);
        res.json(stats);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});
