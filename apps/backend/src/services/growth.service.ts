import { getDb } from '../db/db.client';
import { randomUUID } from 'crypto';
import { eventBus } from '../core/eventBus';
import { queueService } from './queue.service';

export class GrowthService {
    constructor() {
        this.initializeListeners();
    }

    private initializeListeners() {
        // Escutar pedidos concluídos para dar pontos
        eventBus.on('order_status_updated', async (data) => {
            if (data.status === 'completed' || data.status === 'delivered') {
                const db = await getDb();
                const order = await db.get(`SELECT * FROM orders WHERE id = ?`, [data.orderId]);
                if (order) {
                    await this.addLoyaltyPoints(order.customer_id, order.restaurant_id, order.total_cents);
                }
            }
        });
    }

    async addLoyaltyPoints(customerId: string, restaurantId: string, amountCents: number) {
        if (!customerId) return;
        const db = await getDb();

        // Regra simples: 1 ponto a cada 1 real (100 cents)
        const points = Math.floor(amountCents / 100);
        if (points <= 0) return;

        const id = randomUUID();
        await db.run(
            `INSERT INTO loyalty_points (id, restaurant_id, customer_id, points, type, description)
             VALUES (?, ?, ?, ?, 'earn', 'Pontos ganhos em pedido')`,
            [id, restaurantId, customerId, points]
        );

        console.log(`🎁 [Growth] ${points} pontos concedidos ao cliente ${customerId}`);
    }

    async getCustomerPoints(customerId: string, restaurantId: string) {
        const db = await getDb();
        const result = await db.get(
            `SELECT SUM(CASE WHEN type = 'earn' THEN points ELSE -points END) as total 
             FROM loyalty_points 
             WHERE customer_id = ? AND restaurant_id = ?`,
            [customerId, restaurantId]
        );
        return result?.total || 0;
    }

    async createSegment(restaurantId: string, name: string, description: string, queryJson: any) {
        const db = await getDb();
        const id = randomUUID();
        await db.run(
            `INSERT INTO customer_segments (id, restaurant_id, name, description, query_json)
             VALUES (?, ?, ?, ?, ?)`,
            [id, restaurantId, name, description, JSON_stringify(queryJson)]
        );
        return id;
    }

    async createCampaign(payload: { restaurant_id: string, name: string, segment_id: string, type: string, message_template: string, scheduled_at?: string }) {
        const db = await getDb();
        const id = randomUUID();
        await db.run(
            `INSERT INTO campaigns (id, restaurant_id, name, segment_id, type, message_template, scheduled_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, payload.restaurant_id, payload.name, payload.segment_id, payload.type, payload.message_template, payload.scheduled_at]
        );
        return id;
    }

    async runCampaign(campaignId: string) {
        const db = await getDb();
        const campaign = await db.get(`SELECT * FROM campaigns WHERE id = ?`, [campaignId]);
        if (!campaign) throw new Error('Campanha não encontrada');

        // Em vez de rodar aqui, adicionamos na fila Enterprise
        await queueService.addJob('campaigns', 'send-campaign', {
            campaignId,
            restaurantId: campaign.restaurant_id
        });

        // Marcar como agendado na fila
        await db.run(`UPDATE campaigns SET status = 'scheduled' WHERE id = ?`, [campaignId]);

        console.log(`📦 [Growth] Campanha ${campaignId} enviada para a fila de processamento.`);
    }
}

function JSON_stringify(obj: any) {
    try { return JSON.stringify(obj); } catch (e) { return '{}'; }
}

export const growthService = new GrowthService();
