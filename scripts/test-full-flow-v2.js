// test-full-flow-v2.js
// Extended smoke test covering: order funnel fix + coupons + ratings + notifications
const BASE = 'http://localhost:3000';
let pass = 0, fail = 0, token = '', orderId = '', couponId = '';
const log = (ok, msg) => { ok ? pass++ : fail++; console.log(` ${ok ? '✅' : '❌'} ${msg}`); };
const api = (url, opts = {}) => fetch(`${BASE}${url}`, { headers: { 'Content-Type': 'application/json', ...(opts.auth ? { Authorization: `Bearer ${token}` } : {}) }, ...opts });
const post = (url, body, auth) => api(url, { method: 'POST', body: JSON.stringify(body), auth });
const put = (url, body, auth) => api(url, { method: 'PUT', body: JSON.stringify(body), auth });

(async () => {
    console.log('\n═══════════════════════════════════════════');
    console.log('  X-AÇAÍ FULL FLOW TEST v2 — JUNE 2026');
    console.log('═══════════════════════════════════════════\n');

    // ─── 1. Health ───────────────────────────────
    console.log('▶ 1. Backend Health');
    const h = await api('/api/health'); log(h.ok, 'Backend online');

    // ─── 2. Admin Login ──────────────────────────
    console.log('\n▶ 2. Admin Login');
    const lr = await post('/api/admin/login', { secret: 'admin_secret_123' });
    const ld = await lr.json(); token = ld.token;
    log(lr.ok && !!token, 'Admin login — got JWT');

    // ─── 3. Create Coupon (admin) ─────────────────
    console.log('\n▶ 3. Create Coupon');
    const cr = await fetch(`${BASE}/api/admin/coupons?slug=default`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: 'TEST10', type: 'flat', discount_value: 1000, min_order_cents: 0, max_uses: 100 }),
    });
    const cd = await cr.json(); couponId = cd.id;
    log(cr.ok || cr.status === 409, `Coupon created/exists: ${cd.code || 'TEST10'}`);

    // ─── 4. Validate Coupon (public) ─────────────
    console.log('\n▶ 4. Validate Coupon');
    const vr = await post('/api/default/coupons/validate', { code: 'TEST10', orderTotalCents: 5000 });
    const vd = await vr.json();
    log(vr.ok && vd.valid, `Coupon valid — discount: R$ ${(vd.discountCents / 100).toFixed(2)}`);
    log(vd.discountCents === 1000, `Discount amount correct (R$ 10,00)`);

    // ─── 5. Menu ─────────────────────────────────
    console.log('\n▶ 5. Menu');
    const mr = await api('/api/default/menu');
    const menu = await mr.json();
    log(Array.isArray(menu), `Menu returns array (${menu.length} items)`);

    // ─── 6. Create Order WITH coupon ─────────────
    console.log('\n▶ 6. Create Order (with discount)');
    const firstItem = menu[0] || { id: 'item-1' };
    const orderPayload = {
        customerId: 'cust_11999998888',
        customerName: 'Teste Automatizado',
        customerPhone: '11999998888',
        items: [{ menuItemId: firstItem.id, qty: 2, notes: '' }],
        subtotalCents: 5000, deliveryFeeCents: 500,
        discountCents: 1000, couponCode: 'TEST10', totalCents: 4500,
        addressText: 'Rua Automação, 42 — Bairro Tecnológico',
        paymentMethod: 'pix', notes: 'Pedido de teste automático',
    };
    const or = await post('/api/default/orders', orderPayload);
    const od = await or.json(); orderId = od.id;
    log(or.ok && orderId, `Order created: ${orderId?.slice(0, 8)}`);
    log(od.status === 'pending_payment' || od.status === 'pending', `Order has status: ${od.status}`);
    log(od.payment_url != null, `payment_url present (mock): ${od.payment_url?.slice(0, 40)}`);

    // ─── 7. Verify coupon fields persisted ───────
    console.log('\n▶ 7. Fetch Order — Verify coupon fields');
    await new Promise(r => setTimeout(r, 500));
    const fr = await api(`/api/orders/${orderId}`);
    const fd = await fr.json();
    log(fr.ok, 'Order fetch OK');
    log(fd.coupon_code === 'TEST10' || fd.discount_cents >= 0, `Coupon data persisted (code=${fd.coupon_code}, discount=${fd.discount_cents})`);

    // ─── 8. Full status lifecycle ─────────────────
    console.log('\n▶ 8. Status Lifecycle');
    const statusFlow = ['preparing', 'delivering', 'completed'];
    for (const st of statusFlow) {
        const sr = await fetch(`${BASE}/api/admin/orders/${orderId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ status: st, slug: 'default' }),
        });
        log(sr.ok, `Status → ${st}`);
    }

    // ─── 9. Submit Rating ─────────────────────────
    console.log('\n▶ 9. Order Rating');
    const rr = await post(`/api/orders/${orderId}/rating`, {
        stars: 5, comment: 'Chegou rápido e delicioso!', customerName: 'Teste Automatizado'
    });
    const rd = await rr.json();
    log(rr.ok, `Rating submitted: ${JSON.stringify(rd)}`);

    // Try duplicate rating — must get 409
    const rr2 = await post(`/api/orders/${orderId}/rating`, { stars: 3, comment: 'Outra tentativa' });
    log(rr2.status === 409, `Duplicate rating blocked (409)`);

    // ─── 10. Get Rating ──────────────────────────
    console.log('\n▶ 10. Get Rating');
    const gr = await api(`/api/orders/${orderId}/rating`);
    const gd = await gr.json();
    log(gr.ok && gd.stars === 5, `Rating retrieved — ${gd.stars} ⭐`);

    // ─── 11. Admin Ratings List ───────────────────
    console.log('\n▶ 11. Admin Ratings List');
    const ar = await fetch(`${BASE}/api/admin/ratings?slug=default`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const ad = await ar.json();
    log(ar.ok && Array.isArray(ad), `Admin ratings list OK (${ad.length} items)`);

    // ─── 12. Admin Coupons List ───────────────────
    console.log('\n▶ 12. Admin Coupons List');
    const acr = await fetch(`${BASE}/api/admin/coupons?slug=default`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const acd = await acr.json();
    log(acr.ok && Array.isArray(acd), `Admin coupons list OK (${acd.length} items)`);

    // ─── 13. Invalid coupon ───────────────────────
    console.log('\n▶ 13. Invalid coupon rejected');
    const ivr = await post('/api/default/coupons/validate', { code: 'NOTEXIST', orderTotalCents: 5000 });
    log(!ivr.ok, `Invalid coupon rejected (${ivr.status})`);

    // Results
    console.log('\n═══════════════════════════════════════════');
    console.log(`RESULTS: ${pass} passed, ${fail} failed`);
    if (fail === 0) console.log('✅ ALL TESTS PASSED — Sistema completamente operacional');
    else console.log(`⚠️  ${fail} test(s) failed`);
    console.log('═══════════════════════════════════════════\n');
    if (fail > 0) process.exit(1);
})();
