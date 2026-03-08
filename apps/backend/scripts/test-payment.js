// Native fetch in node v24

async function runTest() {
    try {
        console.log('--- 1. Criando Pedido Falso ---');
        const createRes = await fetch('http://localhost:3000/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customerId: 'test_auto',
                items: [{ menuItemId: 'acai-123', qty: 1 }],
                subtotalCents: 1000,
                deliveryFeeCents: 500,
                totalCents: 1500,
                addressText: 'Rua de Teste, 10'
            })
        });

        const order = await createRes.json();
        if (!order.id) {
            console.error('Falha ao gerar pedido', order);
            return;
        }
        console.log(`Pedido gerado: ${order.id}`);
        console.log(`Payment URL: ${order.payment_url}`);

        console.log('\n--- 2. Simulando Webhook de Pagamento Pago ---');
        const webhookRes = await fetch('http://localhost:3000/payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'payment.created',
                data: { id: 'txn_999999' },
                external_reference: order.id
            })
        });

        const webhookLog = await webhookRes.json();
        console.log('Webhook Response:', webhookLog);

        console.log('\n--- 3. Conferindo Status ---');
        const checkRes = await fetch(`http://localhost:3000/api/orders/${order.id}`);
        const checked = await checkRes.json();
        console.log(`Status do Pedido Atualizado: ${checked.status} | Pay Status: ${checked.payment_status}`);

    } catch (e) {
        console.error('Tests failed:', e);
    }
}

runTest();
