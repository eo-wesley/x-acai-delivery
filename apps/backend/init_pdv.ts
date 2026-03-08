import { getDb } from './src/db/db.client';
import { randomUUID } from 'crypto';

async function init() {
    try {
        const db = await getDb();

        // Ensure default tenant
        await db.run(
            `INSERT OR IGNORE INTO restaurants (id, name, slug, mode, subscription_plan) 
             VALUES ('default_tenant', 'X-Açaí Default', 'default', 'store', 'enterprise')`
        );

        // Ensure default customer for PDV
        await db.run(
            `INSERT OR IGNORE INTO customers (id, restaurant_id, name, phone) 
             VALUES ('walk-in-customer', 'default_tenant', 'Cliente PDV', '00000000000')`
        );

        console.log('✅ Base data for PDV initialized.');
    } catch (e) {
        console.error(e);
    }
}

init();
