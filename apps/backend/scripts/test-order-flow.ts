async function runOrderFlow() {
    console.log('🔄 Testando App Customer Flow Integral (/api/orders)...\n');
    try {
        const createPayload = {
            customerId: 'cliente_direto_id_22',
            items: [{
                menuItemId: 'acai-700',
                qty: 1,
                notes: 'Sem lactose please'
            }],
            subtotalCents: 2400,
            deliveryFeeCents: 500,
            totalCents: 2900,
            addressText: 'Avenida Ficticia 918'
        };

        console.log('[1/3] POST /api/orders (Criando)');
        const resCreate = await fetch('http://localhost:3000/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(createPayload)
        });
        const orderData = await resCreate.json();
        console.log(`Pedido criado: ${orderData.id}\n`);

        if (!orderData.id) return;

        console.log(`[2/3] GET /api/orders/${orderData.id} (Buscando)`);
        const resGet = await fetch(`http://localhost:3000/api/orders/${orderData.id}`);
        const getReturn = await resGet.json();
        console.log(`Status atual: ${getReturn.status} | Total: ${getReturn.total_cents}\n`);

        console.log(`[3/3] POST /api/orders/${orderData.id}/cancel (Cancelando)`);
        const resCancel = await fetch(`http://localhost:3000/api/orders/${orderData.id}/cancel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: 'Demitido' })
        });
        const cancelReturn = await resCancel.json();
        console.log(`Resposta do cancelamento:`, cancelReturn);

    } catch (err) {
        console.error('Test failed:', err);
    }
}
runOrderFlow();
