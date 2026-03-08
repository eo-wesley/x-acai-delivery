// test-modifiers.js
// Tests end-to-end flow of order creation including selected_options (modifiers)
const BASE = 'http://localhost:3000';
let pass = 0, fail = 0, token = '', orderId = '';
const log = (ok, msg) => { ok ? pass++ : fail++; console.log(` ${ok ? '✅' : '❌'} ${msg}`); };
const api = (url, opts = {}) => fetch(`${BASE}${url}`, { headers: { 'Content-Type': 'application/json', ...(opts.auth ? { Authorization: `Bearer ${token}` } : {}) }, ...opts });
const post = (url, body, auth) => api(url, { method: 'POST', body: JSON.stringify(body), auth });

(async () => {
    console.log('\n═══════════════════════════════════════════');
    console.log('  X-AÇAÍ MODIFIERS FLOW TEST — E2E');
    console.log('═══════════════════════════════════════════\n');

    // ─── 1. Health ───────────────────────────────
    console.log('▶ 1. Backend Health');
    const h = await api('/api/health'); log(h.ok, 'Backend online');

    // ─── 2. Admin Login ──────────────────────────
    const lr = await post('/api/admin/login', { secret: 'admin_secret_123' });
    const ld = await lr.json(); token = ld.token;
    log(lr.ok && !!token, 'Admin login — got JWT');

    // ─── 3. Menu ─────────────────────────────────
    console.log('\n▶ 3. Menu');
    const mr = await api('/api/default/menu');
    const menu = await mr.json();
    log(Array.isArray(menu), `Menu returns array (${menu.length} items)`);

    // ─── 4. Create Order WITH Modifiers ──────────
    console.log('\n▶ 4. Create Order (with Modifiers / selected_options)');
    const firstItem = menu[0] || { id: 'item-miss' };

    // Create a mock selected_options array
    const selected_options = [
        {
            groupId: 'g1',
            groupName: 'Tamanho',
            optionId: 'opt1',
            optionName: '300ml',
            price_cents: 0
        },
        {
            groupId: 'g2',
            groupName: 'Adicionais',
            optionId: 'opt2',
            optionName: 'Morango',
            price_cents: 200
        }
    ];

    const orderPayload = {
        customerId: 'cust_mod_123',
        customerName: 'Teste Modifiers',
        customerPhone: '11999998888',
        items: [{
            menuItemId: firstItem.id,
            qty: 1,
            notes: 'Com capricho',
            selected_options
        }],
        subtotalCents: firstItem.price_cents + 200,
        deliveryFeeCents: 500,
        discountCents: 0,
        totalCents: firstItem.price_cents + 200 + 500,
        addressText: 'Rua dos Modifiers, 100',
        paymentMethod: 'pix',
        notes: 'Pedido com adicionais'
    };

    const or = await post('/api/default/orders', orderPayload);
    const od = await or.json(); orderId = od.id;
    log(or.ok && orderId, `Order created with modifiers: ${orderId?.slice(0, 8) || 'Failed'}`);
    if (!or.ok) {
        console.error("Order creation failed payload:", JSON.stringify(od, null, 2));
    }

    // ─── 5. Verify Modifiers persisted ───────────
    console.log('\n▶ 5. Fetch Order — Verify Modifiers Structure');
    await new Promise(r => setTimeout(r, 500));
    const fr = await api(`/api/orders/${orderId}`);
    const fd = await fr.json();
    log(fr.ok, 'Order fetch OK');

    const fetchedItems = fd.items;
    console.log("DUMPING fetchedItems:");
    console.dir(fetchedItems, { depth: null });

    let modifiersMatched = false;

    if (fetchedItems && fetchedItems.length > 0) {
        const item = fetchedItems[0];
        // item.selected_options should be parsed if saved as JSON or returned directly if structured well
        const opts = typeof item.selected_options === 'string' ? JSON.parse(item.selected_options) : item.selected_options;

        if (opts && Array.isArray(opts) && opts.length === 2) {
            if (opts[0].optionName === '300ml' && opts[1].optionName === 'Morango') {
                modifiersMatched = true;
            }
        } else {
            console.log("Found selected_options but structure is off:", opts);
        }
    } else {
        console.log("No items found in fetched order.");
    }
    log(modifiersMatched, `Modifiers persisted perfectly`);

    // Results
    console.log('\n═══════════════════════════════════════════');
    console.log(`RESULTS: ${pass} passed, ${fail} failed`);
    if (fail === 0) console.log('✅ MODIFIER TESTS PASSED — O backend suporta arrays complexos no checkout');
    else console.log(`⚠️  ${fail} test(s) failed`);
    console.log('═══════════════════════════════════════════\n');
    if (fail > 0) process.exit(1);
})();
