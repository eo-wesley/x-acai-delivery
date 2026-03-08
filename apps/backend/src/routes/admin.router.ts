import { Router } from 'express';
import { adminAuthMiddleware } from '../middlewares/auth.middleware';
import { tenantMiddleware } from '../middlewares/tenant.middleware';
import { ordersRepo } from '../db/repositories/orders.repo';
import { getDb } from '../db/db.client';
import { aiMetrics } from '../ai/metrics/ai.metrics';
import { eventBus } from '../core/eventBus';
import { marketingService } from '../services/marketing.service';
import jwt from 'jsonwebtoken';
import { menuCacheService } from '../services/cache/menu.cache';

export const adminRouter = Router();
let sseClients: any[] = [];

adminRouter.post('/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const ADMIN_USER = process.env.ADMIN_USER || 'admin';
        const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';

        if (username === ADMIN_USER && password === ADMIN_PASS) {
            const token = jwt.sign({ role: 'admin', tenant: 'default_tenant' }, process.env.JWT_SECRET || 'fallback_jwt_secret_123', { expiresIn: '7d' });
            return res.json({ token, success: true });
        }
        res.status(401).json({ error: 'Credenciais inválidas' });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

adminRouter.get('/admin/orders', adminAuthMiddleware, tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = (page - 1) * limit;

        const dateFrom = req.query.dateFrom as string;
        const dateTo = req.query.dateTo as string;

        let dateFilter = '';
        const params: any[] = [tenantId, limit, offset];

        if (dateFrom && dateTo) {
            dateFilter = ` AND created_at >= ? AND created_at <= ? `;
            params.splice(1, 0, dateFrom, dateTo + ' 23:59:59');
        }

        const db = await getDb();
        const query = `SELECT * FROM orders WHERE restaurant_id = ? ${dateFilter} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        const orders = await db.all(query, params);

        const parsedOrders = orders.map((o: any) => ({
            ...o,
            items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items
        }));

        res.json(parsedOrders);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

adminRouter.get('/admin/orders/stream', adminAuthMiddleware, tenantMiddleware, async (req: any, res: any) => {
    const tenantId = req.tenantId;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const client = { id: Date.now(), res, tenantId };
    sseClients.push(client);

    req.on('close', () => { sseClients = sseClients.filter(c => c.id !== client.id); });
});

adminRouter.put('/admin/orders/:id/status', adminAuthMiddleware, tenantMiddleware, async (req: any, res: any) => {
    try {
        const { status } = req.body;
        const tenantId = req.tenantId;
        if (!['pending_payment', 'accepted', 'preparing', 'delivering', 'completed', 'cancelled'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const success = await ordersRepo.updateOrderStatus(req.params.id, status);
        if (success) {
            const order = await ordersRepo.getOrderById(req.params.id);
            if (order) {
                const { statusToEvent } = await import('../notifications/status.mapper');
                const evt = statusToEvent(status);
                if (evt) {
                    eventBus.emit(evt, {
                        orderId: (order as any).id,
                        customerPhone: (order as any).customer_phone,
                        customerName: (order as any).customer_name,
                        totalCents: (order as any).total_cents,
                    });
                }

                // Trigger Marketing Loyalty check (Phase 16)
                if (status === 'completed' && order.customer_phone) {
                    const { customersRepo } = await import('../db/repositories/customers.repo');
                    const customer = await customersRepo.getCustomerByPhone(order.customer_phone, tenantId);
                    if (customer) {
                        await marketingService.checkLoyaltyTarget(tenantId, customer.id);
                    }
                }
            }

            sseClients.filter(c => c.tenantId === tenantId).forEach(c => c.res.write(`data: ${JSON.stringify({ orderId: req.params.id, status })}\n\n`));
            res.json({ success: true, status });
        } else {
            res.status(404).json({ error: 'Order not found' });
        }
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

adminRouter.get('/admin/notification-logs', adminAuthMiddleware, tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const db = await getDb();
        const logs = await db.all(`SELECT nl.* FROM notification_logs nl JOIN orders o ON nl.order_id = o.id WHERE o.restaurant_id = ? ORDER BY nl.created_at DESC LIMIT 10`, [tenantId]);
        res.json(logs);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

adminRouter.get('/admin/whatsapp/status', adminAuthMiddleware, async (req, res) => {
    res.json({ status: 'connected', provider: process.env.WHATSAPP_PROVIDER || 'mock' });
});

adminRouter.get('/admin/metrics', adminAuthMiddleware, tenantMiddleware, async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const db = await getDb();

        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        const todayISO = todayStart.toISOString().replace('T', ' ').slice(0, 19);

        const todayOrders = await db.get(`SELECT COUNT(*) as count, COALESCE(SUM(total_cents),0) as revenue FROM orders WHERE restaurant_id = ? AND created_at >= ?`, [tenantId, todayISO]);

        const weekStart = new Date();
        const day = weekStart.getDay();
        const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
        weekStart.setDate(diff); weekStart.setHours(0, 0, 0, 0);
        const weekISO = weekStart.toISOString().replace('T', ' ').slice(0, 19);
        const weekOrders = await db.get(`SELECT COUNT(*) as count, COALESCE(SUM(total_cents),0) as revenue FROM orders WHERE restaurant_id = ? AND created_at >= ?`, [tenantId, weekISO]);

        const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
        const monthISO = monthStart.toISOString().replace('T', ' ').slice(0, 19);
        const monthOrders = await db.get(`SELECT COUNT(*) as count, COALESCE(SUM(total_cents),0) as revenue FROM orders WHERE restaurant_id = ? AND created_at >= ?`, [tenantId, monthISO]);

        const byStatus = await db.all(`SELECT status, COUNT(*) as count FROM orders WHERE restaurant_id = ? GROUP BY status`, [tenantId]);

        const activeOrders = await db.get(`SELECT COUNT(*) as count FROM orders WHERE restaurant_id = ? AND status IN ('accepted','preparing','delivering')`, [tenantId]);

        const avgRating = await db.get(`SELECT AVG(stars) as avg, COUNT(*) as total FROM order_ratings WHERE restaurant_id = ?`, [tenantId]);

        res.json({
            today: { orders: todayOrders.count, revenueCents: todayOrders.revenue },
            week: { orders: weekOrders.count, revenueCents: weekOrders.revenue },
            month: { orders: monthOrders.count, revenueCents: monthOrders.revenue },
            byStatus,
            activeOrders: activeOrders.count,
            avgRating: avgRating.avg || 0,
            topProducts: []
        });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

adminRouter.get('/admin/stats', adminAuthMiddleware, async (req, res) => {
    try {
        const db = await getDb();
        const ordersCount = await db.get(`SELECT COUNT(*) as c FROM orders`);
        const restaurantsCount = await db.get(`SELECT COUNT(*) as c FROM restaurants`);
        res.json({
            ai: aiMetrics.getStats(),
            db: { totalOrders: ordersCount?.c || 0, totalTenants: restaurantsCount?.c || 0 }
        });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

adminRouter.get('/admin/profile', adminAuthMiddleware, tenantMiddleware, async (req: any, res: any) => {
    try {
        const db = await getDb();
        const r = await db.get(`SELECT * FROM restaurants WHERE id = ?`, [req.tenantId]);
        if (!r) return res.status(404).json({ error: 'Restaurant not found' });
        res.json({ ...r, opening_hours: r.opening_hours ? JSON.parse(r.opening_hours) : null });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

adminRouter.patch('/admin/profile', adminAuthMiddleware, tenantMiddleware, async (req: any, res: any) => {
    try {
        const db = await getDb();
        const fields = ['name', 'description', 'phone', 'address', 'whatsapp', 'logo_url', 'banner_url', 'prep_time_minutes', 'delivery_fee_cents', 'min_order_cents', 'max_orders_simultaneous', 'timezone', 'opening_hours', 'store_status', 'temp_close_reason'];
        const updates: string[] = [];
        const values: any[] = [];
        for (const f of fields) {
            if (req.body[f] !== undefined) {
                updates.push(`${f} = ?`);
                values.push(f === 'opening_hours' && typeof req.body[f] === 'object' ? JSON.stringify(req.body[f]) : req.body[f]);
            }
        }
        if (updates.length === 0) return res.json({ success: true });
        values.push(req.tenantId);
        await db.run(`UPDATE restaurants SET ${updates.join(', ')} WHERE id = ?`, values);
        res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

adminRouter.patch('/admin/store', adminAuthMiddleware, tenantMiddleware, async (req: any, res: any) => {
    try {
        const db = await getDb();
        const allowed = ['open', 'closed', 'paused', 'busy'];
        const { store_status, temp_close_reason } = req.body;
        if (store_status && !allowed.includes(store_status)) return res.status(400).json({ error: `Invalid status` });

        const updates: string[] = [];
        const values: any[] = [];
        if (store_status) { updates.push('store_status = ?'); values.push(store_status); }
        if (temp_close_reason !== undefined) { updates.push('temp_close_reason = ?'); values.push(temp_close_reason || null); }

        if (updates.length) {
            values.push(req.tenantId);
            await db.run(`UPDATE restaurants SET ${updates.join(', ')} WHERE id = ?`, values);
        }
        res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

adminRouter.get('/admin/menu', adminAuthMiddleware, tenantMiddleware, async (req: any, res: any) => {
    try {
        const { menuRepo } = await import('../db/repositories/menu.repo');
        res.json(await menuRepo.listMenu(req.tenantId, false));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

adminRouter.post('/admin/menu', adminAuthMiddleware, tenantMiddleware, async (req: any, res: any) => {
    try {
        const { menuRepo } = await import('../db/repositories/menu.repo');
        const id = await menuRepo.createMenuItem({ ...req.body, restaurant_id: req.tenantId });
        menuCacheService.invalidate(req.tenantId);
        res.status(201).json({ success: true, id });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

adminRouter.put('/admin/menu/:id', adminAuthMiddleware, tenantMiddleware, async (req: any, res: any) => {
    try {
        const { menuRepo } = await import('../db/repositories/menu.repo');
        const success = await menuRepo.updateMenuItem(req.params.id, req.tenantId, req.body);
        if (success) {
            menuCacheService.invalidate(req.tenantId);
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Menu item not found' });
        }
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

adminRouter.delete('/admin/menu/:id', adminAuthMiddleware, tenantMiddleware, async (req: any, res: any) => {
    try {
        const { menuRepo } = await import('../db/repositories/menu.repo');
        const success = await menuRepo.deleteMenuItem(req.params.id, req.tenantId);
        if (success) {
            menuCacheService.invalidate(req.tenantId);
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Menu item not found' });
        }
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

adminRouter.patch('/admin/menu/:id/availability', adminAuthMiddleware, tenantMiddleware, async (req: any, res: any) => {
    try {
        const db = await getDb();
        const { available, out_of_stock, hidden } = req.body;
        const updates: string[] = [];
        const values: any[] = [];
        if (available !== undefined) { updates.push('available = ?'); values.push(available ? 1 : 0); }
        if (out_of_stock !== undefined) { updates.push('out_of_stock = ?'); values.push(out_of_stock ? 1 : 0); }
        if (hidden !== undefined) { updates.push('hidden = ?'); values.push(hidden ? 1 : 0); }
        if (updates.length === 0) return res.json({ success: true });
        values.push(req.params.id, req.tenantId);
        await db.run(`UPDATE menu_items SET ${updates.join(', ')} WHERE id = ? AND restaurant_id = ?`, values);
        menuCacheService.invalidate(req.tenantId);
        res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Admin menu options
adminRouter.get('/admin/menu/:id/options', adminAuthMiddleware, tenantMiddleware, async (req: any, res: any) => {
    try {
        const db = await getDb();
        const groups = await db.all(`SELECT * FROM option_groups WHERE menu_item_id = ? ORDER BY sort_order ASC`, [req.params.id]);
        const enriched = await Promise.all(groups.map(async (g: any) => {
            const options = await db.all(`SELECT * FROM option_items WHERE option_group_id = ? ORDER BY sort_order ASC`, [g.id]);
            return { ...g, options };
        }));
        res.json(enriched);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

adminRouter.post('/admin/menu/:id/options/groups', adminAuthMiddleware, tenantMiddleware, async (req: any, res: any) => {
    console.log(`[AdminRouter] POST Option Group for item ${req.params.id}`);
    try {
        const db = await getDb();
        const { v4: uuidv4 } = await import('uuid');
        // Accept both field names for compatibility during transition
        const { name, min_options, max_options, min_select, max_select, sort_order, required } = req.body;
        const finalMin = min_select !== undefined ? min_select : (min_options || 0);
        const finalMax = max_select !== undefined ? max_select : (max_options || 1);

        const id = uuidv4();
        await db.run(`INSERT INTO option_groups (id, restaurant_id, menu_item_id, name, min_select, max_select, sort_order, required) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, req.tenantId, req.params.id, name, finalMin, finalMax, sort_order || 0, required ? 1 : 0]);
        menuCacheService.invalidate(req.tenantId);
        res.status(201).json({ success: true, id });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

adminRouter.put('/admin/menu/options/groups/:groupId', adminAuthMiddleware, tenantMiddleware, async (req: any, res: any) => {
    try {
        const db = await getDb();
        const { name, min_options, max_options, min_select, max_select, sort_order, required } = req.body;
        const finalMin = min_select !== undefined ? min_select : (min_options || 0);
        const finalMax = max_select !== undefined ? max_select : (max_options || 1);

        await db.run(`UPDATE option_groups SET name=?, min_select=?, max_select=?, sort_order=?, required=? WHERE id=?`,
            [name, finalMin, finalMax, sort_order, required ? 1 : 0, req.params.groupId]);
        menuCacheService.invalidate(req.tenantId);
        res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

adminRouter.delete('/admin/menu/options/groups/:groupId', adminAuthMiddleware, tenantMiddleware, async (req: any, res: any) => {
    try {
        const db = await getDb();
        await db.run(`DELETE FROM option_groups WHERE id = ?`, [req.params.groupId]);
        menuCacheService.invalidate(req.tenantId);
        res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

adminRouter.post('/admin/menu/options/groups/:groupId/items', adminAuthMiddleware, tenantMiddleware, async (req: any, res: any) => {
    try {
        const db = await getDb();
        const { v4: uuidv4 } = await import('uuid');
        const { name, price_cents, sort_order, available } = req.body;
        const id = uuidv4();
        await db.run(`INSERT INTO option_items (id, restaurant_id, option_group_id, name, price_cents, sort_order, available) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, req.tenantId, req.params.groupId, name, price_cents || 0, sort_order || 0, available === false ? 0 : 1]);
        menuCacheService.invalidate(req.tenantId);
        res.status(201).json({ success: true, id });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

adminRouter.put('/admin/menu/options/items/:itemId', adminAuthMiddleware, tenantMiddleware, async (req: any, res: any) => {
    try {
        const db = await getDb();
        const { name, price_cents, sort_order, available } = req.body;
        await db.run(`UPDATE option_items SET name=?, price_cents=?, sort_order=?, available=? WHERE id=?`,
            [name, price_cents, sort_order, available === false ? 0 : 1, req.params.itemId]);
        menuCacheService.invalidate(req.tenantId);
        res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

adminRouter.delete('/admin/menu/options/items/:itemId', adminAuthMiddleware, tenantMiddleware, async (req: any, res: any) => {
    try {
        const db = await getDb();
        await db.run(`DELETE FROM option_items WHERE id = ?`, [req.params.itemId]);
        menuCacheService.invalidate(req.tenantId);
        res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// SaaS Onboarding (Admin)
adminRouter.post('/admin/restaurants', adminAuthMiddleware, async (req, res) => {
    try {
        const { restaurantsRepo } = await import('../db/repositories/restaurants.repo');
        const { menuRepo } = await import('../db/repositories/menu.repo');
        const { name, phone, email, plan } = req.body;

        if (!name) return res.status(400).json({ error: 'Restaurant name is required' });

        const { id, slug } = await restaurantsRepo.createRestaurant({ name, phone, email, plan });

        await menuRepo.createMenuItem({
            restaurant_id: id,
            name: 'Açaí Exemplo Onboarding',
            description: 'Produto criado automaticamente durante a ativação.',
            price_cents: 1000,
            category: 'Açaís',
            tags: ['promo', 'novo'],
            available: true,
            image_url: null
        });

        const token = jwt.sign({ role: 'admin', tenant: slug }, process.env.JWT_SECRET || 'fallback_jwt_secret_123', { expiresIn: '7d' });
        res.status(201).json({ success: true, id, slug, token });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

adminRouter.get('/admin/restaurants', adminAuthMiddleware, async (req, res) => {
    try {
        const { restaurantsRepo } = await import('../db/repositories/restaurants.repo');
        res.json(await restaurantsRepo.listRestaurants());
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

adminRouter.put('/admin/restaurants/:id', adminAuthMiddleware, async (req, res) => {
    try {
        const { restaurantsRepo } = await import('../db/repositories/restaurants.repo');
        const success = await restaurantsRepo.updateRestaurant(req.params.id, req.body);
        if (success) res.json({ success: true }); else res.status(404).json({ error: 'Restaurant not found' });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

adminRouter.delete('/admin/restaurants/:id', adminAuthMiddleware, async (req, res) => {
    try {
        const { restaurantsRepo } = await import('../db/repositories/restaurants.repo');
        const success = await restaurantsRepo.deleteRestaurant(req.params.id);
        if (success) res.json({ success: true }); else res.status(404).json({ error: 'Restaurant not found' });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});
