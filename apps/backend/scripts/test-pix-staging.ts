// Using native Node fetch

const STAGING_URL = 'https://x-acai-staging-backend.onrender.com';
const SLUG = 'default';

async function validatePixE2E() {
    console.log('--- STARTING PIX E2E STAGING TEST ---');

    console.log('\n1. Creating order with Pix on staging...');
    const orderPayload = {
        customerId: "cust_real_e2e_validator",
        customerName: "E2E Staging Validator",
        customerPhone: "11999998888",
        addressText: "Rua do Validador, 123",
        items: [{ menuItemId: "item-1", qty: 1, priceCents: 1500 }],
        subtotalCents: 1500,
        deliveryFeeCents: 0,
        totalCents: 1500,
        paymentMethod: "pix"
    };

    const orderRes = await fetch(`${STAGING_URL}/api/${SLUG}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
    });

    const orderBody = await orderRes.json();
    if (!orderRes.ok) {
        console.error('Failed to create order:\n', JSON.stringify(orderBody, null, 2));
        process.exit(1);
    }

    const orderId = orderBody.id;
    console.log(`✅ Order created successfully: ID ${orderId}`);

    console.log('\n2. Validating payment reference & QR Code...');
    const paymentStatusRes = await fetch(`${STAGING_URL}/api/${SLUG}/orders/${orderId}/payment-status`);
    const paymentBody = await paymentStatusRes.json();

    if (!paymentStatusRes.ok) {
        console.error('Failed to fetch payment status:', paymentBody);
        process.exit(1);
    }

    const { payment_reference, pix_qr_code, pix_qr_base64 } = paymentBody;
    console.log(`- payment_reference: ${payment_reference}`);
    console.log(`- pix_qr_code present: ${!!pix_qr_code}`);
    console.log(`- pix_qr_base64 present: ${!!pix_qr_base64}`);

    if (!payment_reference || payment_reference.toString().startsWith('mock_')) {
        console.error('❌ VALIDATION FAILED: payment_reference is mock or missing!');
        process.exit(1);
    }
    console.log(`✅ Real payment reference received: ${payment_reference}`);

    console.log('\n3. Simulating Mercado Pago Webhook to staging backend...');
    const webhookPayload = {
        type: "payment",
        data: {
            id: payment_reference 
        }
    };
    const webhookUrl = `${STAGING_URL}/api/payments/mercadopago/webhook/mercadopago`;
    console.log(`POST to ${webhookUrl}`);
    const webhookRes = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload)
    });

    console.log(`Webhook Response Status: ${webhookRes.status}`);
    const webhookText = await webhookRes.text();
    console.log(`Webhook Response Body: ${webhookText}`);

    // Wait a bit just in case the webhook processing takes a few MS
    await new Promise(r => setTimeout(r, 2000));

    console.log('\n4. Validating /payment-status after webhook...');
    const postWebhookStatusRes = await fetch(`${STAGING_URL}/api/${SLUG}/orders/${orderId}/payment-status`);
    const postWebhookBody = await postWebhookStatusRes.json();
    
    console.log(`- order status: ${postWebhookBody.status}`);
    console.log(`- order payment_status: ${postWebhookBody.payment_status}`);
    
    if (postWebhookBody.payment_status !== 'paid') {
         console.error('❌ VALIDATION FAILED: payment_status did not update to paid');
         process.exit(1);
    }
    console.log(`✅ Order correctly marked as PAID!`);

    console.log('\n--- SUCCESS: PIX E2E STAGING REAL FLOW VALIDATED ---');
}

validatePixE2E().catch(console.error);
