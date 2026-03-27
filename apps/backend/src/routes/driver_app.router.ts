import { Router } from 'express';
import { driversRepo } from '../db/repositories/drivers.repo';
import jwt from 'jsonwebtoken';

export const driverAppRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

driverAppRouter.post('/driver/login', async (req: any, res: any) => {
    try {
        const { slug, phone, accessCode } = req.body;
        if (!slug || !phone || !accessCode) {
            return res.status(400).json({ error: 'Todos os campos sao obrigatorios (Slug, Telefone, Codigo).' });
        }

        const driver = await driversRepo.authenticateDriver(slug, phone, accessCode);
        if (!driver) {
            return res.status(401).json({ error: 'Credenciais invalidas. Verifique os dados e tente novamente.' });
        }

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

const driverAuthMiddleware = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Token nao fornecido' });

    const token = authHeader.split(' ')[1];
    try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'driver') return res.status(403).json({ error: 'Acesso negado: nao e um entregador' });
        req.driverId = decoded.id;
        req.tenantId = decoded.restaurantId;
        next();
    } catch (_err) {
        res.status(401).json({ error: 'Token invalido' });
    }
};

driverAppRouter.get('/driver/active-orders', driverAuthMiddleware, async (req: any, res: any) => {
    try {
        const orders = await driversRepo.listDriverOrders(req.tenantId, req.driverId);
        const active = orders.filter((o: any) => o.status === 'assigned' || o.status === 'picked_up');
        res.json(active);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

driverAppRouter.post('/driver/presence', driverAuthMiddleware, async (req: any, res: any) => {
    try {
        const { isOnline } = req.body;
        await driversRepo.setPresence(req.tenantId, req.driverId, isOnline);
        res.json({ success: true, isOnline });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

driverAppRouter.put('/driver/order-status', driverAuthMiddleware, async (req: any, res: any) => {
    try {
        const { driverOrderId, status } = req.body;
        if (!['picked_up', 'delivered', 'returned'].includes(status)) {
            return res.status(400).json({ error: 'Status invalido.' });
        }

        const success = await driversRepo.updateDriverOrderStatus(req.tenantId, driverOrderId, status);
        res.json({ success });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

driverAppRouter.get('/driver/wallet', driverAuthMiddleware, async (req: any, res: any) => {
    try {
        const stats = await driversRepo.getDriverStats(req.tenantId, req.driverId);
        res.json(stats);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});
