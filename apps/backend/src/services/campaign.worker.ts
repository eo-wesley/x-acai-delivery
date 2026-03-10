import { queueService } from './queue.service';
import { getDb } from '../db/db.client';
import { randomUUID } from 'crypto';

console.log('👷 [Worker] Starting Campaign Worker...');

queueService.createWorker('campaigns', async (job) => {
    const { campaignId, restaurantId } = job.data;
    const db = await getDb();

    console.log(`🚀 [Worker] Processing campaign ${campaignId} for restaurant ${restaurantId}`);

    // Marcar como enviando
    await db.run(`UPDATE campaigns SET status = 'sending' WHERE id = ?`, [campaignId]);

    try {
        // Simulação de busca de clientes e envio via WhatsApp
        const customers = await db.all(`SELECT id FROM customers WHERE restaurant_id = ? LIMIT 50`, [restaurantId]);

        for (const customer of customers) {
            // Aqui seria a chamada para Evolution API / WhatsApp
            await db.run(
                `INSERT INTO campaign_logs (id, campaign_id, customer_id, status) VALUES (?, ?, ?, ?)`,
                [randomUUID(), campaignId, customer.id, 'sent']
            );

            // Simular delay de envio para evitar bloqueio
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        await db.run(`UPDATE campaigns SET status = 'completed', scheduled_at = CURRENT_TIMESTAMP WHERE id = ?`, [campaignId]);
        console.log(`✅ [Worker] Campaign ${campaignId} completed successfully.`);
    } catch (e: any) {
        console.error(`❌ [Worker] Campaign ${campaignId} failed:`, e.message);
        await db.run(`UPDATE campaigns SET status = 'failed' WHERE id = ?`, [campaignId]);
        throw e; // Rethrow to let BullMQ handle retries
    }
});
