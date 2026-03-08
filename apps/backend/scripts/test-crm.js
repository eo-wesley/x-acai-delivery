// test-crm.js
async function runTest() {
    try {
        console.log('--- 1. Testing Admin Customer Upsert ---');

        const adminToken = require('jsonwebtoken').sign({ role: 'admin' }, process.env.JWT_SECRET || 'fallback_jwt_secret_123');
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        };

        const upsertRes = await fetch('http://localhost:3000/api/admin/customers?slug=default', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                name: 'João da Silva Tester',
                phone: '5511999999999',
                email: 'joaotester@example.com',
                tags: 'vip,tester',
                notes: 'Created via test script'
            })
        });

        const upsertData = await upsertRes.json();
        console.log('Upsert Response:', upsertData);

        console.log('\n--- 2. Testing Customer Listing ---');
        const listRes = await fetch('http://localhost:3000/api/admin/customers?slug=default', { headers });
        const listData = await listRes.json();
        console.log('List Customers Response:', listData);

        if (listData.length > 0) {
            console.log('\n✅ CRM Backend is functional!');
        } else {
            console.log('\n❌ CRM Backend returned empty list.');
        }

    } catch (e) {
        console.error('Test failed:', e);
    }
}

runTest();
