import { getDb } from './src/db/db.client';
import { randomUUID } from 'crypto';

async function diag() {
    try {
        const db = await getDb();

        // Simulating the EXACT payload from validate.js
        const payload = {
            customerId: 'pdv_guest',
            customerName: 'Cliente PDV Teste',
            items: [{ menuItemId: 'any', qty: 1 }],
            subtotalCents: 1500,
            deliveryFeeCents: 0,
            totalCents: 1500,
            addressText: 'Balcão / PDV',
            paymentMethod: 'pix'
        };

        const orderId = randomUUID();
        const tenantId = 'default_tenant';

        console.log('--- DIAGNOSTIC INSERT START ---');

        // Ensure the customer exists to avoid FK error
        await db.run(
            `INSERT OR IGNORE INTO customers (id, restaurant_id, name, phone) 
             VALUES (?, ?, ?, ?)`,
            [payload.customerId, tenantId, payload.customerName, '00000000000']
        );

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
            ) VALUES (?, ?, 'completed', ?, ?, ?, ?, ?, ?, ?, 'paid', ?, '00000000000', datetime('now'))`,
            [
                orderId,
                payload.customerId,
                JSON.stringify(payload.items),
                payload.subtotalCents,
                payload.deliveryFeeCents,
                payload.totalCents,
                tenantId,
                payload.addressText,
                payload.paymentMethod,
                payload.customerName
            ]
        );
        console.log('✅ DIAGNOSTIC INSERT SUCCESSFUL!');
    } catch (e) {
        console.error('❌ DIAGNOSTIC INSERT FAILED:', e);
    }
}

diag();
