import { Router } from 'express';
import { LogisticsService } from '../services/logistics.service';
import { adminAuthMiddleware } from '../middlewares/auth.middleware';
import { eventBus } from '../core/eventBus';

const router = Router();
const service = new LogisticsService();

// Driver Update (Used by Driver App/Mobile)
router.post('/driver/location', async (req: any, res) => {
    try {
        const { driverId, orderId, lat, lng, heading } = req.body;
        if (!driverId || !lat || !lng) {
            return res.status(400).json({ error: 'Missing location data' });
        }
        await service.updateDriverLocation(driverId, orderId, lat, lng, heading);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Real-time Stream via SSE
router.get('/track/:token/stream', (req, res) => {
    const { token } = req.params;

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    console.log(`[SSE] Cliente conectado ao rastreamento: ${token}`);

    // Listener para o motorista
    const onLocationUpdate = (data: any) => {
        // No futuro, validamos se o orderId do evento bate com o token/orderId do cliente
        if (data.orderId === token || token === 'admin') {
            res.write(`data: ${JSON.stringify({ type: 'location', ...data })}\n\n`);
        }
    };

    // Listener para mudança de status
    const onStatusUpdate = (data: any) => {
        if (data.orderId === token || token === 'admin') {
            res.write(`data: ${JSON.stringify({ type: 'status', ...data })}\n\n`);
        }
    };

    eventBus.on('driver_location_updated', onLocationUpdate);
    eventBus.on('order_status_updated', onStatusUpdate);

    // Corrigir corrupção por timeout (keep-alive)
    const keepAlive = setInterval(() => {
        res.write(': keepalive\n\n');
    }, 30000);

    req.on('close', () => {
        console.log(`[SSE] Cliente desconectado: ${token}`);
        clearInterval(keepAlive);
        eventBus.off('driver_location_updated', onLocationUpdate);
        eventBus.off('order_status_updated', onStatusUpdate);
    });
});

// Dashboard Admin (List all drivers)
router.get('/admin/active', adminAuthMiddleware, async (req, res) => {
    try {
        const deliveries = await service.getAllActiveDeliveries();
        res.json(deliveries);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
