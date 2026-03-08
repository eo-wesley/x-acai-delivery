// test-onboarding.js — uses native fetch (Node 18+)
const assert = require('assert');

const BASE = 'http://localhost:3000/api';
let ADMIN_TOKEN = '';

async function post(path, body, token) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(`POST ${path} failed: ${JSON.stringify(data)}`);
    return data;
}

async function get(path, token) {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE}${path}`, { headers });
    const data = await res.json();
    if (!res.ok) throw new Error(`GET ${path} failed: ${JSON.stringify(data)}`);
    return data;
}

async function del(path, token) {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE}${path}`, { method: 'DELETE', headers });
    const data = await res.json();
    return data;
}

async function run() {
    try {
        // 1. Super Admin Login
        console.log('--- 1. Login as Super Admin ---');
        try {
            const d = await post('/admin/login', { secret: 'admin_secret_123' });
            ADMIN_TOKEN = d.token;
        } catch (e) {
            const d = await post('/admin/login', { secret: 'default_secret' });
            ADMIN_TOKEN = d.token;
        }
        console.log('Token acquired ✅');

        // 2. Create New Restaurant
        console.log('\n--- 2. Creating New Restaurant (Tenant) ---');
        const ts = Date.now();
        const createData = await post('/admin/restaurants', {
            name: `Burger Master ${ts}`,
            phone: '5511999999999',
            email: 'burger@master.com',
            plan: 'pro'
        }, ADMIN_TOKEN);

        console.log('Response:', createData);
        assert.ok(createData.success, 'success should be true');
        assert.ok(createData.slug.startsWith('burger-master'), 'slug should start with burger-master');
        assert.ok(createData.token, 'admin token should be returned');

        const RESTAURANT_ID = createData.id;
        const RESTAURANT_SLUG = createData.slug;
        console.log(`Restaurant created: id=${RESTAURANT_ID}, slug=${RESTAURANT_SLUG} ✅`);

        // 3. Verify starter menu using /:slug/menu route
        console.log('\n--- 3. Verifying Starter Menu Data ---');
        const menu = await get(`/${RESTAURANT_SLUG}/menu`);
        console.log(`Menu items for ${RESTAURANT_SLUG}:`, menu.length);
        assert.strictEqual(menu.length, 1, 'Should have exactly 1 starter item');
        assert.strictEqual(menu[0].restaurant_id, RESTAURANT_ID, 'Menu item should belong to new tenant');
        console.log('Starter menu verified ✅');

        // 4. Cross-tenant isolation
        console.log('\n--- 4. Verifying Cross-Tenant Isolation ---');
        const defaultMenu = await get('/default/menu');
        const leak = defaultMenu.find(m => m.restaurant_id === RESTAURANT_ID);
        assert.ok(!leak, 'Tenant data must NOT leak into default slug');
        console.log(`Default tenant has ${defaultMenu.length} items, none from new tenant ✅`);

        // 5. CRUD listing
        console.log('\n--- 5. Verifying Admin CRUD Listing ---');
        const restaurants = await get('/admin/restaurants', ADMIN_TOKEN);
        const found = restaurants.find(r => r.id === RESTAURANT_ID);
        assert.ok(found, 'Restaurant should appear in listing');
        assert.strictEqual(found.plan, 'pro');
        assert.strictEqual(found.email, 'burger@master.com');
        console.log('CRUD listing verified ✅');

        // 6. Delete restaurant
        console.log('\n--- 6. Verifying Delete ---');
        const delResult = await del(`/admin/restaurants/${RESTAURANT_ID}`, ADMIN_TOKEN);
        assert.ok(delResult.success, 'Delete should succeed');
        const afterDelete = await get('/admin/restaurants', ADMIN_TOKEN);
        const ghost = afterDelete.find(r => r.id === RESTAURANT_ID);
        assert.ok(!ghost, 'Deleted restaurant should not appear in listing');
        console.log('Delete verified ✅');

        console.log(`\n✅ RESTAURANT ONBOARDING ENGINE FULLY VALIDATED [slug: ${RESTAURANT_SLUG}]`);
    } catch (e) {
        console.error('❌ Validation Failed:', e.message);
        process.exit(1);
    }
}

run();
