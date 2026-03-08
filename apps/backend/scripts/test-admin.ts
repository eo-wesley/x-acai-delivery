async function testAdmin() {
    console.log('🔄 Testando Endpoint Restritivo (/api/admin/orders)...\n');
    try {
        const startTime = Date.now();
        const res = await fetch('http://localhost:3000/api/admin/orders', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-token': 'admin_secret_123'
            }
        });
        const duration = Date.now() - startTime;
        const data = await res.json();

        console.log(`[Status ${res.status}] em ${duration}ms`);
        console.log(`Pedidos Locais Encontrados: ${data.length}`);
    } catch (err) {
        console.error('Test failed:', err);
    }
}
testAdmin();
