// test-recipe-sale.js
async function runTest() {
    try {
        console.log('--- 1. Setup BOM Recipe ---');

        const adminToken = require('jsonwebtoken').sign({ role: 'admin' }, process.env.JWT_SECRET || 'fallback_jwt_secret_123');
        const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` };

        // 1.1 Create an inventory item (Açaí 2L)
        const invRes = await fetch('http://localhost:3000/api/admin/inventory?slug=default', {
            method: 'POST', headers,
            body: JSON.stringify({ name: 'Açaí 2L', unit: 'ml', current_qty: 2000, min_qty: 500 })
        });
        const invData = await invRes.json();
        const acaiId = invData.id;
        console.log('Created Inventory Item ID:', acaiId);

        // 1.2 Create a menu item
        const menuRes = await fetch('http://localhost:3000/api/admin/menu?slug=default', {
            method: 'POST', headers,
            body: JSON.stringify({
                name: 'Copo 500ml', price_cents: 1500, category: 'acai', available: 1
            })
        });
        const menuData = await menuRes.json();
        const menuItemId = menuData.id;
        console.log('Created Menu Item ID:', menuItemId);

        // 1.3 Map Recipe (BOM)
        const recipeRes = await fetch('http://localhost:3000/api/admin/recipes?slug=default', {
            method: 'POST', headers,
            body: JSON.stringify({
                menuItemId: menuItemId,
                name: 'Receita Copo 500ml',
                items: [{ inventory_item_id: acaiId, qty: 500, unit: 'ml' }]
            })
        });
        const recipeData = await recipeRes.json();
        console.log('Mapped Recipe for Menu Item:', recipeData.success);

        console.log('\n--- 2. Simulate Sale (Order) ---');
        const orderRes = await fetch('http://localhost:3000/api/default/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customerId: 'fake_customer',
                customerName: 'Tester BOM',
                customerPhone: '999999999',
                items: [{ menuItemId: menuItemId, qty: 2 }], // ordering 2 -> should deduct 1000ml
                subtotalCents: 3000, deliveryFeeCents: 0, totalCents: 3000, addressText: 'Local'
            })
        });
        const orderData = await orderRes.json();
        const orderId = orderData.id;
        console.log('Created Order ID:', orderId);

        console.log('\n--- 3. Validate Inventory Movements & Deductions ---');
        const moveRes = await fetch('http://localhost:3000/api/admin/inventory/movements?slug=default', { headers });
        const moveData = await moveRes.json();

        const saleMovement = moveData.find(m => m.inventory_item_id === acaiId && m.ref_order_id === orderId);
        if (saleMovement && saleMovement.qty === 1000) {
            console.log('✅ Found correct sale movement deducting 1000ml!');
        } else {
            console.log('❌ Failed to find matching sale movement', saleMovement);
        }

        const invCheckRes = await fetch('http://localhost:3000/api/admin/inventory?slug=default', { headers });
        const invCheckData = await invCheckRes.json();
        const targetInv = invCheckData.find(i => i.id === acaiId);

        if (targetInv && targetInv.current_qty === 1000) {
            console.log(`✅ Final Inventory Qty is exactly 1000ml (2000 - 1000). BOM logic perfect!`);
        } else {
            console.log(`❌ Inventory Qty mismatch = ${targetInv?.current_qty}`);
        }

    } catch (e) {
        console.error('Test failed:', e);
    }
}

runTest();
