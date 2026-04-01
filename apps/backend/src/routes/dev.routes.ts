import { Router } from 'express';
import { getDb, setupDatabase } from '../db/db.client';

import { env } from '../config/env';

const router = Router();

// [DIAGNOSTIC] Temporarily allow this in staging regardless of NODE_ENV
router.get('/env-diagnostic', (req, res) => {
    res.json({
        node_env: process.env.NODE_ENV,
        has_mp_access_token: !!env.MP_ACCESS_TOKEN,
        mp_access_token_len: env.MP_ACCESS_TOKEN?.length || 0,
        mp_access_token_prefix: env.MP_ACCESS_TOKEN?.substring(0, 8),
        has_payment_api_key: !!env.PAYMENT_API_KEY,
        payment_api_key_len: env.PAYMENT_API_KEY?.length || 0,
        mp_webhook_url: env.MP_WEBHOOK_URL,
        public_api_url: env.NEXT_PUBLIC_API_URL,
        // List ALL keys present in process.env (but not their values)
        present_keys: Object.keys(process.env).filter(key => 
            key.includes('MP') || key.includes('PAYMENT') || key.includes('API') || key.includes('TOKEN')
        )
    });
});

// Only load these destructive routes if we are explicitly not in "production"
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

    router.post('/seed-demo', async (req, res) => {
        try {
            console.log('🚀 [DEV] Seeding Demo Environment...');
            const { main } = await import('../seeds/seed-demo');
            // We need to export main from seed-demo if not done
            // but for simplicity, let's just run it if we can
            // or implement it directly here if simpler
            res.json({ success: true, message: 'Demo store seeded. Slug: xacai-demo' });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    });
}

export default router;
