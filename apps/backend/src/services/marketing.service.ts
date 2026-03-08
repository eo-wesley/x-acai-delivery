import { getDb } from '../db/db.client';
import { randomUUID } from 'crypto';
import { EvolutionWhatsAppProvider } from '../notifications/providers/evolution.provider';

export class MarketingService {
    /**
     * Winback: Envia cupom para clientes inativos há X dias.
     */
    async processWinback(restaurantId: string) {
        const db = await getDb();
        const trigger = await db.get(
            `SELECT * FROM marketing_triggers WHERE restaurant_id = ? AND type = 'winback' AND active = 1`,
            [restaurantId]
        );

        if (!trigger) return;

        const days = trigger.days_inactive || 7;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const isoCutoff = cutoffDate.toISOString();

        const inactiveCustomers = await db.all(
            `SELECT * FROM customers 
             WHERE restaurant_id = ? 
             AND last_order_at < ? 
             AND id NOT IN (
                 SELECT customer_id FROM customer_campaigns 
                 WHERE restaurant_id = ? AND type = 'winback' 
                 AND created_at > datetime('now', '-30 days')
             )`,
            [restaurantId, isoCutoff, restaurantId]
        );

        console.log(`[Marketing] Found ${inactiveCustomers.length} inactive customers for ${restaurantId}`);

        for (const customer of inactiveCustomers) {
            await this.sendCampaign(restaurantId, customer, 'winback', trigger);
        }
    }

    /**
     * Birthday: Verifica aniversariantes do dia e envia presente.
     */
    async processBirthdays(restaurantId: string) {
        const db = await getDb();
        const trigger = await db.get(
            `SELECT * FROM marketing_triggers WHERE restaurant_id = ? AND type = 'birthday' AND active = 1`,
            [restaurantId]
        );

        if (!trigger) return;

        const todayMD = new Date().toISOString().slice(5, 10); // "MM-DD"

        const birthdayCustomers = await db.all(
            `SELECT * FROM customers 
             WHERE restaurant_id = ? 
             AND strftime('%m-%d', birthday) = ?
             AND id NOT IN (
                 SELECT customer_id FROM customer_campaigns 
                 WHERE restaurant_id = ? AND type = 'birthday' 
                 AND created_at > date('now', 'start of year')
             )`,
            [restaurantId, todayMD, restaurantId]
        );

        console.log(`[Marketing] Found ${birthdayCustomers.length} birthday customers for ${restaurantId}`);

        for (const customer of birthdayCustomers) {
            await this.sendCampaign(restaurantId, customer, 'birthday', trigger);
        }
    }

    /**
     * Loyalty: Verifica se o cliente atingiu X pedidos e envia prêmio.
     */
    async checkLoyaltyTarget(restaurantId: string, customerId: string) {
        const db = await getDb();
        const trigger = await db.get(
            `SELECT * FROM marketing_triggers WHERE restaurant_id = ? AND type = 'loyalty' AND active = 1`,
            [restaurantId]
        );

        if (!trigger) return;

        const customer = await db.get(`SELECT * FROM customers WHERE id = ? AND restaurant_id = ?`, [customerId, restaurantId]);
        if (!customer) return;

        const target = trigger.order_count || 5;
        if (customer.total_orders % target === 0 && customer.total_orders > 0) {
            await this.sendCampaign(restaurantId, customer, 'loyalty', trigger);
        }
    }

    private async sendCampaign(restaurantId: string, customer: any, type: string, trigger: any) {
        const db = await getDb();
        const campaignId = randomUUID();
        const couponId = randomUUID();
        const couponCode = `${type.toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        await db.run(
            `INSERT INTO coupons (id, restaurant_id, code, description, type, discount_value, max_uses, active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [couponId, restaurantId, couponCode, `Automático: ${trigger.name}`, trigger.discount_type, trigger.discount_value, 1, 1]
        );

        await db.run(
            `INSERT INTO customer_campaigns (id, restaurant_id, customer_id, type, coupon_id, status)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [campaignId, restaurantId, customer.id, type, couponId, 'sent']
        );

        const wa = new EvolutionWhatsAppProvider();
        if (wa.isConfigured()) {
            let message = '';
            if (type === 'winback') {
                message = `🍇 Olá ${customer.name}! Que saudade! Preparamos um presente para você voltar: Use o cupom *${couponCode}* e ganhe R$ ${(trigger.discount_value / 100).toFixed(2).replace('.', ',')} de desconto no seu próximo pedido! 😋`;
            } else if (type === 'loyalty') {
                message = `🎉 Parabéns ${customer.name}! Você completou ${customer.total_orders} pedidos conosco! Como agradecimento, aqui está um cupom de R$ ${(trigger.discount_value / 100).toFixed(2).replace('.', ',')}: *${couponCode}*. Aproveite! 🎁`;
            } else if (type === 'birthday') {
                message = `🎂 Parabéns pelo seu dia, ${customer.name}! 🎊 O X-Açaí preparou um presente para você: Use o cupom *${couponCode}* e ganhe R$ ${(trigger.discount_value / 100).toFixed(2).replace('.', ',')} de desconto! Tenha um dia maravilhoso! 🍦✨`;
            }

            await wa.send({
                orderId: 'MARKETING',
                customerPhone: customer.phone,
                event: 'order_created',
                restaurantName: 'X-Açaí Delivery',
                extra: { body: message }
            });
        }
    }

    async startAutomatedMarketing(intervalMs: number = 1000 * 60 * 60 * 12) {
        console.log('[Marketing] Engine de Automação Iniciada.');
        const run = async () => {
            try {
                const db = await getDb();
                const restaurants = await db.all(`SELECT id FROM restaurants WHERE status = 'active'`);
                for (const rest of restaurants) {
                    console.log(`[Marketing] Processando automações para restaurante: ${rest.id}`);
                    await this.processWinback(rest.id);
                    await this.processBirthdays(rest.id);
                }
            } catch (err) {
                console.error('[Marketing] Erro no ciclo de automação:', err);
            }
        };
        run();
        setInterval(run, intervalMs);
    }
}

export const marketingService = new MarketingService();
