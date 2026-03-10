import { queueService } from './queue.service';
import { getDb } from '../db/db.client';

console.log('👷 [Worker] Starting WhatsApp Automation Worker...');

queueService.createWorker('whatsapp-automation', async (job) => {
    const { type, customerId, restaurantId, data } = job.data;
    const db = await getDb();

    console.log(`📱 [Worker] Processing WhatsApp ${type} for customer ${customerId}`);

    const customer = await db.get(`SELECT * FROM customers WHERE id = ?`, [customerId]);
    if (!customer || !customer.phone) {
        console.warn(`⚠️ [Worker] Customer ${customerId} not found or has no phone.`);
        return;
    }

    try {
        if (type === 'abandoned_cart') {
            // Verificar se o pedido ainda está pendente ou se foi concluído nesse intervalo de 30min
            const lastOrder = await db.get(
                `SELECT status FROM orders WHERE customer_id = ? AND created_at > datetime('now', '-1 hour') ORDER BY created_at DESC LIMIT 1`,
                [customerId]
            );

            if (lastOrder && lastOrder.status !== 'pending' && lastOrder.status !== 'draft') {
                console.log(`✅ [Worker] Customer ${customerId} already completed the order. Skipping reminder.`);
                return;
            }

            console.log(`📢 [WhatsApp] Enviando lembrete de carrinho abandonado para ${customer.phone}`);
            // Aqui integraria com Evolution API / WhatsApp
        }

        if (type === 'welcome_migration') {
            const coupon = data?.couponCode;
            console.log(`🎉 [WhatsApp] Enviando boas-vindas para ${customer.phone}. Cupom: ${coupon}`);
        }

        // Registrar log de comunicação (opcional)
        await db.run(
            `INSERT INTO campaign_logs (id, campaign_id, customer_id, status) VALUES (?, ?, ?, ?)`,
            [Math.random().toString(36), 'auth_automation', customerId, 'sent']
        );

    } catch (e: any) {
        console.error(`❌ [Worker] WhatsApp Automation failed:`, e.message);
        throw e;
    }
});
