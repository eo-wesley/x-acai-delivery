import { Router } from 'express';
import { getDb } from '../db/db.client';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// GET /api/admin/scaling/consolidated-stats
// Returns aggregated stats for all restaurants owned by the same user
router.get('/consolidated-stats', async (req, res) => {
    try {
        const owner_id = req.query.owner_id as string;
        if (!owner_id) return res.status(400).json({ error: 'owner_id required' });

        const db = await getDb();

        // Get all restaurants for this owner
        const restaurants = await db.all('SELECT id, name FROM restaurants WHERE owner_id = ?', [owner_id]);

        if (restaurants.length === 0) return res.json({ total_revenue: 0, total_orders: 0, store_count: 0, stores: [] });

        const restaurantIds = restaurants.map(r => r.id);
        const placeholders = restaurantIds.map(() => '?').join(',');

        // Aggregate revenue and orders
        const stats = await db.get(`
            SELECT 
                SUM(total_cents) as total_revenue,
                COUNT(*) as total_orders
            FROM orders 
            WHERE restaurant_id IN (${placeholders}) AND status = 'completed'
        `, restaurantIds);

        // Group by restaurant for ranking
        const storeRanking = await db.all(`
            SELECT 
                restaurant_id,
                COUNT(*) as orders,
                SUM(total_cents) as revenue
            FROM orders
            WHERE restaurant_id IN (${placeholders}) AND status = 'completed'
            GROUP BY restaurant_id
            ORDER BY revenue DESC
        `, restaurantIds);

        // Join names
        const rankedStores = storeRanking.map(rs => ({
            ...rs,
            name: restaurants.find(r => r.id === rs.restaurant_id)?.name || 'Unknown'
        }));

        res.json({
            total_revenue: stats.total_revenue || 0,
            total_orders: stats.total_orders || 0,
            store_count: restaurants.length,
            stores: rankedStores
        });
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
});

// GET /api/admin/scaling/ai-insights
// Proactive business intelligence
router.get('/ai-insights', async (req, res) => {
    try {
        const restaurant_id = req.query.restaurant_id as string;
        const db = await getDb();

        const insights = [];

        // Insight 1: Low Margin Items (Simulated logic: items where cost > 40% of price)
        const lowMarginItems = await db.all(`
            SELECT name, current_qty, acquisition_cost_cents, cost_cents, price_cents
            FROM inventory_items 
            JOIN menu_items ON menu_items.name = inventory_items.name
            WHERE inventory_items.restaurant_id = ? 
            AND (CAST(acquisition_cost_cents AS REAL) / price_cents) > 0.4
        `, [restaurant_id]);

        if (lowMarginItems.length > 0) {
            insights.push({
                type: 'warning',
                title: 'Margem de Lucro Baixa',
                message: `Os itens ${lowMarginItems.map(i => i.name).join(', ')} estão com custo de aquisição acima de 40% do preço de venda. Considere reajustar o preço ou trocar de fornecedor.`,
                impact: 'Financeiro'
            });
        }

        // Insight 2: Peak Hours Bottleneck
        // (Simulated logic: if more than 10 orders in the same hour)
        const peakHour = await db.get(`
            SELECT strftime('%H', created_at) as hour, COUNT(*) as count
            FROM orders
            WHERE restaurant_id = ? AND status = 'completed'
            GROUP BY hour
            HAVING count > 10
            ORDER BY count DESC
            LIMIT 1
        `, [restaurant_id]);

        if (peakHour) {
            insights.push({
                type: 'info',
                title: 'Gargalo Operacional Próximo',
                message: `Detectamos um pico de ${peakHour.count} pedidos entre ${peakHour.hour}:00 e ${peakHour.hour}:59. Considere reforçar a equipe de cozinha neste horário.`,
                impact: 'Operacional'
            });
        }

        // Insight 3: Stock Alert
        const lowStock = await db.all(`
            SELECT name, current_qty, min_stock 
            FROM inventory_items 
            WHERE restaurant_id = ? AND current_qty <= min_stock
        `, [restaurant_id]);

        if (lowStock.length > 0) {
            insights.push({
                type: 'danger',
                title: 'Estoque Crítico',
                message: `Os seguintes itens atingiram o nível mínimo: ${lowStock.map(i => i.name).join(', ')}.`,
                impact: 'Logística'
            });
        }

        res.json(insights);
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
});

// POST /api/admin/scaling/clone-menu
// Clone menu from source to target restaurant
router.post('/clone-menu', async (req, res) => {
    try {
        const { source_id, target_id } = req.body;
        const db = await getDb();

        // 1. Clone Menu Items
        const sourceItems = await db.all('SELECT * FROM menu_items WHERE restaurant_id = ?', [source_id]);

        for (const item of sourceItems) {
            const newItemId = uuidv4();
            await db.run(`
                INSERT INTO menu_items (id, restaurant_id, name, description, price_cents, category, tags, available, image_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [newItemId, target_id, item.name, item.description, item.price_cents, item.category, item.tags, item.available, item.image_url]);

            // 2. Clone Option Groups for each item
            const groups = await db.all('SELECT * FROM option_groups WHERE menu_item_id = ?', [item.id]);
            for (const group of groups) {
                const newGroupId = uuidv4();
                await db.run(`
                    INSERT INTO option_groups (id, restaurant_id, menu_item_id, name, required, min_select, max_select, sort_order)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [newGroupId, target_id, newItemId, group.name, group.required, group.min_select, group.max_select, group.sort_order]);

                // 3. Clone Option Items
                const options = await db.all('SELECT * FROM option_items WHERE option_group_id = ?', [group.id]);
                for (const opt of options) {
                    await db.run(`
                        INSERT INTO option_items (id, restaurant_id, option_group_id, name, price_cents, sort_order, available)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    `, [uuidv4(), target_id, newGroupId, opt.name, opt.price_cents, opt.sort_order, opt.available]);
                }
            }
        }

        res.json({ success: true, message: `${sourceItems.length} itens clonados com sucesso.` });
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
});

// GET /api/admin/scaling/abc-curve
// Pareto analysis (80/20) for products
router.get('/abc-curve', async (req, res) => {
    try {
        const restaurant_id = req.query.restaurant_id as string;
        if (!restaurant_id) return res.status(400).json({ error: 'restaurant_id required' });

        const db = await getDb();

        // Calculate revenue per product in the last 30 days
        const sales = await db.all(`
            SELECT 
                item_name as name,
                SUM(price_cents * quantity) as revenue,
                SUM(quantity) as quantity
            FROM order_items
            JOIN orders ON orders.id = order_items.order_id
            WHERE orders.restaurant_id = ? AND orders.status = 'completed'
            AND orders.created_at >= date('now', '-30 days')
            GROUP BY item_name
            ORDER BY revenue DESC
        `, [restaurant_id]);

        if (sales.length === 0) return res.json({ category_a: [], category_b: [], category_c: [] });

        const totalRevenue = sales.reduce((acc, s) => acc + s.revenue, 0);
        let accumulatedRevenue = 0;

        const result = sales.map(s => {
            accumulatedRevenue += s.revenue;
            const percentage = (accumulatedRevenue / totalRevenue) * 100;

            let category = 'C';
            if (percentage <= 70) category = 'A';
            else if (percentage <= 90) category = 'B';

            return { ...s, share: (s.revenue / totalRevenue) * 100, category };
        });

        res.json({
            category_a: result.filter(r => r.category === 'A'),
            category_b: result.filter(r => r.category === 'B'),
            category_c: result.filter(r => r.category === 'C'),
            total_revenue: totalRevenue
        });
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
});

export default router;
