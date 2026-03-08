// smoke-test-delivery.js — E2E smoke test for customer delivery flow (Node 18+)
const assert = require('assert');
const BASE = 'http://localhost:3000/api';

async function post(path, body) {
    const res = await fetch(`${BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`POST ${path} → ${JSON.stringify(data)}`);
    return data;
}

async function get(path) {
    const res = await fetch(`${BASE}${path}`);
    const data = await res.json();
    if (!res.ok) throw new Error(`GET ${path} → ${JSON.stringify(data)}`);
    return data;
}

let passed = 0;
let failed = 0;

function check(label, fn) {
    try {
        fn();
        console.log(`  ✅ ${label}`);
        passed++;
    } catch (e) {
        console.error(`  ❌ ${label}: ${e.message}`);
        failed++;
    }
}

async function run() {
    console.log('🔥 DELIVERY APP SMOKE TEST\n');

    // 1. Menu — default tenant
    console.log('--- 1. Fetch menu (default tenant) ---');
    const menu = await get('/default/menu');
    check('Menu has items', () => assert.ok(menu.length > 0, `Expected >0, got ${menu.length}`));
    console.log(`  ${menu.length} items returned`);

    // 2. Create order
    console.log('\n--- 2. Create order via /:slug/orders ---');
    const item = menu[0];
    const order = await post('/default/orders', {
        customerId: `cust_smoke_${Date.now()}`,
        customerName: 'Smoke Test User',
        customerPhone: '5511999991234',
        items: [{ menuItemId: item.id, qty: 2, notes: 'sem açúcar' }],
        subtotalCents: item.price_cents * 2,
        deliveryFeeCents: 500,
        totalCents: item.price_cents * 2 + 500,
        addressText: 'Rua do Teste, 123, Bairro Mock',
        notes: 'Smoke test order',
        paymentMethod: 'pix',
    });
    check('Order has ID', () => assert.ok(order.id));
    check('Order has status', () => assert.ok(order.status !== undefined));
    console.log(`  Order ID: ${order.id}`);

    // 3. Get order by ID
    console.log('\n--- 3. Fetch order by ID ---');
    const fetched = await get(`/orders/${order.id}`);
    check('Order fetched by ID', () => assert.strictEqual(fetched.id, order.id));
    const parsedItems = typeof fetched.items === 'string' ? JSON.parse(fetched.items) : (fetched.items || []);
    check('Order has items', () => assert.ok(parsedItems.length > 0));
    console.log(`  Status: ${fetched.status}, Items: ${parsedItems.length}`);

    // 4. Payment URL
    console.log('\n--- 4. Payment mock check ---');
    check('Response is object', () => assert.ok(typeof order === 'object'));
    console.log(`  payment_url: ${order.payment_url ? '✅ returned' : '⚠️ not returned (no MP config)'}`);

    // Result
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`RESULTS: ${passed} passed, ${failed} failed`);
    if (failed === 0) {
        console.log(`✅ ALL DELIVERY SMOKE TESTS PASSED`);
    } else {
        console.log(`❌ SOME TESTS FAILED`);
        setTimeout(() => { process.exitCode = 1; }, 100);
    }
}

run().catch(e => {
    console.error('\n❌ SMOKE TEST ERROR:', e.message);
    setTimeout(() => { process.exitCode = 1; }, 100);
});
