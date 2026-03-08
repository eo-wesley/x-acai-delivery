// test-inventory.js
async function runTest() {
    try {
        console.log('--- 1. Testing Inventory Item Creation ---');

        const adminToken = require('jsonwebtoken').sign({ role: 'admin' }, process.env.JWT_SECRET || 'fallback_jwt_secret_123');
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        };

        const createRes = await fetch('http://localhost:3000/api/admin/inventory?slug=default', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                name: 'Polpa de Açaí Especial',
                unit: 'kg',
                current_qty: 15,
                min_qty: 10,
                cost_cents: 2500,
                supplier: 'Fazenda Amazon'
            })
        });

        const createData = await createRes.json();
        console.log('Create Inventory Item Response:', createData);
        const itemId = createData.id;

        console.log('\n--- 2. Testing Inventory Adjust (Movement) ---');
        const adjustRes = await fetch(`http://localhost:3000/api/admin/inventory/${itemId}/adjust?slug=default`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                qty: -6, // Simulating usage or waste
                reason: 'waste'
            })
        });
        const adjustData = await adjustRes.json();
        console.log('Adjust Response:', adjustData);

        console.log('\n--- 3. Testing Inventory Alerts ---');
        // Because starting qty was 15, adjusting by -6 leaves 9. Min is 10. We should get an alert!
        const alertsRes = await fetch('http://localhost:3000/api/admin/inventory/alerts?slug=default', { headers });
        const alertsData = await alertsRes.json();
        console.log('Alerts Response:', alertsData);

        if (alertsData.length > 0 && alertsData.some(a => a.id === itemId)) {
            console.log('\n✅ ERP Inventory Alerts functional!');
        } else {
            console.log('\n❌ Missing expected alert logic for depleted stock.');
        }

    } catch (e) {
        console.error('Test failed:', e);
    }
}

runTest();
