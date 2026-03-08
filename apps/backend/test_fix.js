
const BASE = 'http://localhost:3000';
async function run() {
    const login = await fetch(`${BASE}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const { token } = await login.json();

    const menu = await (await fetch(`${BASE}/api/default/menu`)).json();
    const itemId = menu[0].id;

    console.log('Testing with item:', itemId);
    const res = await fetch(`${BASE}/api/admin/menu/${itemId}/options/groups`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Group X', min_select: 0, max_select: 1 })
    });
    console.log('Status:', res.status);
    console.log('Body:', await res.json());
}
run();
