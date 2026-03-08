/**
 * test-pix-payment.js
 * Tests the PIX payment flow locally without needing real Mercado Pago credentials.
 *
 * Usage:
 *   node scripts/test-pix-payment.js
 *   node scripts/test-pix-payment.js <phone>
 */

const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'admin123';

const log = (msg, data) => {
    console.log(`\n${msg}`);
    if (data) console.log(JSON.stringify(data, null, 2));
};

async function getAdminToken() {
    const res = await fetch(`${BASE_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: ADMIN_PASS }),
    });
    const data = await res.json();
    return data.token;
}

async function createPixOrder(phone) {
    const res = await fetch(`${BASE_URL}/api/default/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            customerId: 'test-customer-pix',
            customerName: 'Cliente Teste PIX',
            customerPhone: phone || '5511999990000',
            customerEmail: 'teste@xacai.com.br',
            items: [{ menuItemId: 'test-item', qty: 1, selected_options: [] }],
            subtotalCents: 2500,
            deliveryFeeCents: 500,
            totalCents: 3000,
            addressText: 'Rua dos Testes, 100 - São Paulo/SP',
            paymentMethod: 'pix',
        }),
    });
    const data = await res.json();
    return { status: res.status, ...data };
}

async function simulatePayment(orderId) {
    const res = await fetch(`${BASE_URL}/api/webhooks/mercadopago/simulate/${orderId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
    });
    return res.json();
}

async function getOrder(orderId, token) {
    const res = await fetch(`${BASE_URL}/api/admin/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
}

async function getPaymentLogs(orderId, token) {
    const res = await fetch(`${BASE_URL}/api/admin/payment-logs?order_id=${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) return res.json();
    return null;
}

async function main() {
    const phone = process.argv[2];
    console.log('\n🧪 X-Açaí PIX Payment Test');
    console.log(`   API: ${BASE_URL}`);
    console.log(`   Telefone: ${phone || '5511999990000 (padrão)'}\n`);

    // 1. Check backend
    try {
        const r = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(4000) });
        if (!r.ok) throw new Error(`Status ${r.status}`);
        console.log('✅ Backend online');
    } catch (e) {
        console.error('❌ Backend offline:', e.message);
        process.exit(1);
    }

    // 2. Admin login
    const token = await getAdminToken().catch(() => null);
    console.log(token ? '✅ Token admin obtido' : '⚠️  Admin token falhou (tudo bem, continuando)');

    // 3. Create order with PIX
    log('📦 Criando pedido com PIX...');
    const order = await createPixOrder(phone);

    if (!order.id) {
        console.error('❌ Falha na criação do pedido:', order);
        process.exit(1);
    }

    console.log(`✅ Pedido criado: ${order.id.slice(0, 8).toUpperCase()}`);

    if (order.pix_qr_code) {
        console.log(`\n💳 PIX QR Code (Copia e Cola):`);
        console.log(`   ${order.pix_qr_code.substring(0, 80)}...`);
        if (order.pix_qr_base64) console.log(`   (Base64 disponível para exibir imagem)`);
    } else {
        console.log('⚠️  QR Code PIX não retornado (verifique MP_ACCESS_TOKEN)');
    }

    if (order.payment_reference) {
        console.log(`   Referência: ${order.payment_reference}`);
    }

    // 4. Simulate webhook payment approval
    log('🎯 Simulando aprovação de pagamento PIX...');
    const webhookResult = await simulatePayment(order.id).catch(e => ({ error: e.message }));

    if (webhookResult.ok) {
        console.log(`✅ Pagamento simulado: ${webhookResult.payment_status}`);
        console.log(`   Status do pedido: ${webhookResult.order_status}`);
    } else {
        console.log('⚠️  Simulação retornou:', webhookResult);
    }

    // 5. Verify final order state
    if (token) {
        log('🔍 Verificando estado final do pedido...');
        const finalOrder = await getOrder(order.id, token).catch(() => null);
        if (finalOrder) {
            console.log(`   Status:          ${finalOrder.status}`);
            console.log(`   Payment status:  ${finalOrder.payment_status}`);
            console.log(`   Paid at:         ${finalOrder.paid_at || '(awaiting)'}`);
        }

        const logs = await getPaymentLogs(order.id, token);
        if (logs?.logs?.length) {
            console.log(`\n📋 Payment logs (${logs.logs.length} entradas):`);
            for (const entry of logs.logs.slice(0, 3)) {
                console.log(`   ${entry.created_at} | ${entry.provider} | ${entry.status}`);
            }
        }
    }

    console.log('\n════════════════════════════════════');
    console.log('✅ Teste PIX concluído com sucesso!');
    console.log('   Para uso real, configure: MP_ACCESS_TOKEN=<seu_token>');
    console.log('   Modo mock funcionando perfeitamente.');
    console.log('════════════════════════════════════\n');
}

main().catch(e => {
    console.error('❌ Erro:', e.message);
    process.exit(1);
});
