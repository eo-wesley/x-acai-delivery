const fetch = globalThis.fetch || require('node-fetch');

const STAGING_URL = 'https://x-acai-staging-backend.onrender.com';
const TEST_PHONE = '5511987470862';

async function validateWhatsappStaging() {
    console.log('--- STARTING WHATSAPP E2E STAGING TEST (JS) ---');

    console.log('\n1. Checking Backend Health & Uptime...');
    try {
        const healthRes = await fetch(`${STAGING_URL}/health`);
        const healthBody = await healthRes.json();
        console.log(`✅ Staging is UP! Uptime: ${healthBody.uptime}`);
    } catch (e) {
        console.error('❌ Could not reach staging health check:', e.message);
        process.exit(1);
    }

    // Since we don't have a direct diagnostic route for WhatsApp provider,
    // we'll trigger a small test event and check the notification logs if we could.
    // However, the best way is to create a dummy order and see the result.

    console.log('\n2. Creating a test order to trigger WhatsApp notification...');
    const orderPayload = {
        customerId: "wa_staging_test",
        customerName: "WA Staging Validator",
        customerEmail: "wa_test@test.com",
        customerPhone: TEST_PHONE,
        addressText: "Rua do WhatsApp, 123",
        items: [{ menuItemId: "item-1", qty: 1, priceCents: 1500 }],
        subtotalCents: 1500,
        deliveryFeeCents: 0,
        totalCents: 1500,
        paymentMethod: "pix"
    };

    const orderRes = await fetch(`${STAGING_URL}/api/default/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
    });

    const orderBody = await orderRes.json();
    if (!orderRes.ok) {
        console.error('❌ Failed to create order:\n', JSON.stringify(orderBody, null, 2));
        process.exit(1);
    }

    const orderId = orderBody.id;
    console.log(`✅ Order created successfully: ID ${orderId}`);
    console.log('⏳ Waiting 5 seconds for Evolution API processing...');
    await new Promise(r => setTimeout(r, 5000));

    // In a real scenario, we would check the database directly. 
    // Since we are remote, we'll ask the user if they received the message.
    console.log('\n--- VALIDATION TRIGGERED ---');
    console.log('Please check the WhatsApp for number:', TEST_PHONE);
    console.log('If you received "Pedido Recebido", the integration is WORKING.');
}

validateWhatsappStaging().catch(console.error);
