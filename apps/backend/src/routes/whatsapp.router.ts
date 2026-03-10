import { Router } from 'express';
import { tenantMiddleware } from '../middlewares/tenant.middleware';
import { getDb } from '../db/db.client';

export const whatsappRouter = Router();

// GET /api/:slug/admin/whatsapp/status
whatsappRouter.get('/admin/whatsapp/status', tenantMiddleware, async (req: any, res: any) => {
    try {
        const db = await getDb();
        const config = await db.get('SELECT * FROM whatsapp_configs WHERE restaurant_id = ?', [req.tenantId]);

        if (!config) return res.json({ connected: false, message: 'Não configurado' });

        // Ping Evolution API
        const statusUrl = `${config.base_url.replace(/\/$/, '')}/instance/connectionState/${config.instance}`;
        const response = await fetch(statusUrl, {
            headers: { apikey: config.apikey },
            signal: AbortSignal.timeout(5000)
        });

        if (response.ok) {
            const data = await response.json() as any;
            res.json({
                connected: data.instance?.state === 'open',
                state: data.instance?.state,
                config
            });
        } else {
            res.json({ connected: false, message: 'Erro na API Evolution', config });
        }
    } catch (err: any) {
        res.json({ connected: false, error: err.message });
    }
});

// POST /api/:slug/admin/whatsapp/config
whatsappRouter.post('/admin/whatsapp/config', tenantMiddleware, async (req: any, res: any) => {
    try {
        const { base_url, instance, apikey } = req.body;
        const db = await getDb();

        await db.run(`
            INSERT INTO whatsapp_configs (restaurant_id, base_url, instance, apikey)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(restaurant_id) DO UPDATE SET
                base_url = excluded.base_url,
                instance = excluded.instance,
                apikey = excluded.apikey,
                updated_at = CURRENT_TIMESTAMP
        `, [req.tenantId, base_url, instance, apikey]);

        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/:slug/admin/whatsapp/logs
whatsappRouter.get('/admin/whatsapp/logs', tenantMiddleware, async (req: any, res: any) => {
    try {
        const db = await getDb();
        // Since order_id is linked to orders, and orders linked to restaurant...
        // But the log itself doesn't have restaurant_id currently. 
        // Let's join or just fetch everything for now as most logs will be for the current sub-db in a true multi-tenant
        // Here we use a shared logic, so we filter by order_id presence in restaurant's orders
        const logs = await db.all(`
            SELECT nl.*, o.customer_name
            FROM notification_logs nl
            LEFT JOIN orders o ON nl.order_id = o.id
            WHERE o.restaurant_id = ? OR nl.order_id = 'MARKETING'
            ORDER BY nl.created_at DESC
            LIMIT 50
        `, [req.tenantId]);

        res.json(logs);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});
