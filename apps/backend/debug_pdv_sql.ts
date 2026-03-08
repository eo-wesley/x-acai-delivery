import { getDb } from './src/db/db.client';
import { randomUUID } from 'crypto';

async function debug() {
    try {
        const db = await getDb();
        const orderId = randomUUID();
        const tenantId = 'default_tenant';
        const defaultCustomerId = 'walk-in-customer';
        const items = [{ id: 'test', qty: 1 }];
        const totalCents = 1000;

        console.log('--- ATTEMPTING DEBUG INSERT ---');
        await db.run(
            `INSERT INTO orders (
                id, 
                customer_id, 
                status, 
                items, 
                subtotal_cents, 
                delivery_fee_cents, 
                total_cents,
                restaurant_id,
                address_text,
                payment_method,
                payment_status,
                customer_name,
                customer_phone,
                created_at
            ) VALUES (?, ?, 'completed', ?, ?, 0, ?, ?, 'Venda de Balcão', 'cash', 'paid', 'Cliente PDV', '00000000000', datetime('now'))`,
            [
                orderId,
                defaultCustomerId,
                JSON.stringify(items),
                totalCents,
                totalCents,
                tenantId
            ]
        );
        console.log('✅ INSERT SUCCESSFUL!');
    } catch (e) {
        console.error('❌ INSERT FAILED:', e);
    }
}

debug();
