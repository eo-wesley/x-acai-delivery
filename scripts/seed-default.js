// seed-default.js — Seed default tenant with sample menu items
const BASE = 'http://localhost:3000/api';

async function post(path, body, token) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(`POST ${path} failed: ${JSON.stringify(data)}`);
    return data;
}

async function run() {
    // Login
    let token;
    try {
        const login = await post('/admin/login', { secret: 'admin_secret_123' });
        token = login.token;
    } catch {
        const login = await post('/admin/login', { secret: 'default_secret' });
        token = login.token;
    }
    console.log('Logged in ✅');

    const items = [
        { name: 'Açaí Pequeno 300ml', description: 'Açaí puro batido na hora, 300ml', price_cents: 1490, category: 'Açaí' },
        { name: 'Açaí Médio 500ml', description: 'Açaí puro batido na hora, 500ml com granola e banana', price_cents: 2190, category: 'Açaí' },
        { name: 'Açaí Grande 700ml', description: 'Açaí grande com todas as coberturas', price_cents: 2990, category: 'Açaí' },
        { name: 'Combo Família 1L', description: '1L de açaí + 2 coberturas à escolha', price_cents: 3990, category: 'Combos' },
        { name: 'Vitamina de Açaí', description: 'Açaí com leite, banana e mel', price_cents: 1890, category: 'Bebidas' },
    ];

    for (const item of items) {
        const res = await post('/admin/menu?slug=default', {
            ...item,
            tags: ['popular'],
            available: true,
        }, token);
        console.log(`Created: ${item.name} → ${res.id}`);
    }

    console.log('\n✅ Default tenant seeded with', items.length, 'menu items');
}

run().catch(e => {
    console.error('❌ Seed failed:', e.message);
    process.exit(1);
});
