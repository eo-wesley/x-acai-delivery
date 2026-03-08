import { Router } from 'express';
import { getDb, setupDatabase } from '../db/db.client';

const router = Router();

// Only load this route if we are explicitly not in "production"
if (process.env.NODE_ENV !== 'production') {
    router.post('/reset', async (req, res) => {
        try {
            console.log('🚨 [DEV] E2E Database Reset Request Received 🚨');
            const db = await getDb();

            // Drop core tables to ensure clean slate
            const tables = [
                'cash_movements', 'cash_sessions', 'payments', 'expenses',
                'recipe_items', 'recipes', 'inventory_movements', 'inventory_items',
                'orders', 'menu_items', 'customers', 'restaurants'
            ];

            for (const table of tables) {
                await db.run(`DROP TABLE IF EXISTS ${table}`);
            }

            console.log('🧹 Tables dropped. Re-running migrations...');
            await setupDatabase();

            // Insert initial default tenant and basic restaurant to ensure tests pass right away
            await db.run(
                `INSERT OR IGNORE INTO restaurants (id, name, slug) VALUES (?, ?, ?)`,
                ['default_tenant', 'Açaí E2E Test', 'default']
            );

            console.log('✅ DB Reset and Seed OK.');
            res.json({ success: true, message: 'DB Refreshed' });
        } catch (e: any) {
            console.error(e);
            res.status(500).json({ error: e.message });
        }
    });
}

export default router;
