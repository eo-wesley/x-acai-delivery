
const BASE = 'http://localhost:3000';
async function debug() {
    console.log('--- Logging in ---');
    const loginRes = await fetch(`${BASE}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const { token } = await loginRes.json();
    console.log('Token:', token?.slice(0, 10) + '...');

    console.log('\n--- Checking Profile ---');
    const profRes = await fetch(`${BASE}/api/admin/profile?slug=default`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const profile = await profRes.json();
    console.log('Profile keys:', Object.keys(profile));
    console.log('store_status:', profile.store_status);

    console.log('\n--- Checking Menu for item ---');
    const menuRes = await fetch(`${BASE}/api/default/menu`);
    const menu = await menuRes.json();
    if (!menu.length) { console.log('No menu items!'); return; }
    const itemId = menu[0].id;
    console.log('Using Item ID:', itemId);

    console.log('\n--- Creating Option Group (500 expected) ---');
    const groupRes = await fetch(`${BASE}/api/admin/menu/${itemId}/options/groups`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: 'Test Group', min_options: 0, max_options: 1, required: false })
    });
    console.log('Status:', groupRes.status);
    const err = await groupRes.json();
    console.log('Response:', err);
}
debug();
