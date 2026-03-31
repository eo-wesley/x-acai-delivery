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
        const recentCampaignCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        const inactiveCustomers = await db.all(
            `SELECT * FROM customers 
             WHERE restaurant_id = ? 
             AND last_order_at < ? 
             AND id NOT IN (
                 SELECT customer_id FROM customer_campaigns 
                 WHERE restaurant_id = ? AND type = 'winback' 
                 AND created_at > ?
             )`,
            [restaurantId, isoCutoff, restaurantId, recentCampaignCutoff]
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

        const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();
        const alreadyTargeted = await db.all<{ customer_id: string }>(
            `SELECT customer_id
             FROM customer_campaigns 
             WHERE restaurant_id = ? AND type = 'birthday' AND created_at > ?`,
            [restaurantId, yearStart]
        );
        const targetedIds = new Set(alreadyTargeted.map((entry) => entry.customer_id));
        const customers = await db.all<any>(
            `SELECT * FROM customers WHERE restaurant_id = ? AND birthday IS NOT NULL`,
            [restaurantId]
        );
        const birthdayCustomers = customers.filter((customer) => {
            const birthday = String(customer.birthday || '').slice(5, 10);
            return birthday === todayMD && !targetedIds.has(customer.id);
        });

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

    public async sendCampaign(restaurantId: string, customer: any, type: string, trigger: any) {
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

    async scheduleCampaign(restaurantId: string, customerId: string, type: string, scheduledFor: string) {
        const db = await getDb();
        const id = randomUUID();
        await db.run(
            `INSERT INTO customer_campaigns (id, restaurant_id, customer_id, type, status, scheduled_for)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [id, restaurantId, customerId, type, 'scheduled', scheduledFor]
        );
        console.log(`[Marketing] Campaign scheduled for customer ${customerId} at ${scheduledFor}`);
    }

    async executeScheduledCampaigns() {
        const db = await getDb();
        const now = new Date().toISOString();
        const pending = await db.all(
            `SELECT c.*, cust.name, cust.phone 
             FROM customer_campaigns c
             JOIN customers cust ON c.customer_id = cust.id
             WHERE c.status = 'scheduled' AND c.scheduled_for <= ?`,
            [now]
        );

        for (const camp of pending) {
            const trigger = await db.get(
                `SELECT * FROM marketing_triggers WHERE restaurant_id = ? AND type = ? AND active = 1`,
                [camp.restaurant_id, camp.type]
            );
            if (trigger) {
                await this.sendCampaign(camp.restaurant_id, camp, camp.type, trigger);
                await db.run(`UPDATE customer_campaigns SET status = 'sent' WHERE id = ?`, [camp.id]);
            }
        }
    }

    /**
     * Review Request: Convida o cliente a avaliar no Google/Instagram após X pedidos.
     */
    async checkReviewRequestTrigger(restaurantId: string, customerId: string) {
        const db = await getDb();
        const customer = await db.get(`SELECT * FROM customers WHERE id = ?`, [customerId]);

        // IA Logic: Se for o 3º pedido e LTV > 100 reais, é um "Promoter" em potencial
        if (customer && customer.total_orders === 3 && customer.total_spent_cents > 10000) {
            const wa = new EvolutionWhatsAppProvider();
            if (wa.isConfigured()) {
                const message = `🌟 Oi ${customer.name}! Vimos que você já pediu 3 vezes conosco e estamos muito felizes! 🥰 Poderia nos ajudar com uma avaliação no Google? Isso nos ajuda muito! Clique aqui: https://g.page/r/xa_acai/review 💜`;

                await wa.send({
                    orderId: 'REVIEW_REQUEST',
                    customerPhone: customer.phone,
                    event: 'promotion',
                    restaurantName: 'X-Açaí IA',
                    extra: { body: message }
                });

                await db.run(
                    `INSERT INTO customer_campaigns (id, restaurant_id, customer_id, type, status)
                     VALUES (?, ?, ?, ?, ?)`,
                    [randomUUID(), restaurantId, customer.id, 'review_request', 'sent']
                );
            }
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
                    await this.processChurnRisk(rest.id);
                }
                // Also check scheduled campaigns
                await this.executeScheduledCampaigns();
            } catch (err) {
                console.error('[Marketing] Erro no ciclo de automação:', err);
            }
        };
        run();
        setInterval(run, intervalMs);
    }

    /**
     * Churn Prediction: Detecta clientes com comportamento de compra atípico (atrasados).
     */
    async getChurnRiskCustomers(restaurantId: string) {
        const db = await getDb();
        const customers = await db.all<any>(
            `SELECT id, name, phone FROM customers WHERE restaurant_id = ?`,
            [restaurantId]
        );
        const orders = await db.all<any>(
            `SELECT customer_id, created_at
             FROM orders
             WHERE restaurant_id = ? AND status != 'cancelled'
             ORDER BY customer_id ASC, created_at ASC`,
            [restaurantId]
        );

        const customerMap = new Map(customers.map((customer) => [customer.id, customer]));
        const byCustomer = new Map<string, Date[]>();
        for (const order of orders) {
            if (!byCustomer.has(order.customer_id)) {
                byCustomer.set(order.customer_id, []);
            }
            byCustomer.get(order.customer_id)!.push(new Date(order.created_at));
        }

        const now = Date.now();
        const risks: any[] = [];

        for (const [customerId, customerOrders] of byCustomer.entries()) {
            if (customerOrders.length < 3) {
                continue;
            }

            let totalIntervalDays = 0;
            for (let index = 1; index < customerOrders.length; index++) {
                totalIntervalDays += (customerOrders[index].getTime() - customerOrders[index - 1].getTime()) / 86400000;
            }

            const avgIntervalDays = totalIntervalDays / (customerOrders.length - 1);
            const lastOrderAt = customerOrders[customerOrders.length - 1];
            const daysSinceLast = (now - lastOrderAt.getTime()) / 86400000;

            if (daysSinceLast > (avgIntervalDays * 1.5) && daysSinceLast < 90) {
                const customer = customerMap.get(customerId);
                if (customer) {
                    risks.push({
                        id: customer.id,
                        name: customer.name,
                        phone: customer.phone,
                        avg_interval_days: avgIntervalDays,
                        last_order_at: lastOrderAt.toISOString(),
                        days_since_last: daysSinceLast,
                    });
                }
            }
        }

        return risks;
    }

    async processChurnRisk(restaurantId: string) {
        const risks = await this.getChurnRiskCustomers(restaurantId);
        const db = await getDb();

        const trigger = await db.get(
            `SELECT * FROM marketing_triggers WHERE restaurant_id = ? AND type = 'winback' AND active = 1`,
            [restaurantId]
        );

        if (!trigger) return;

        const recentRiskCutoff = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
        for (const customer of risks) {
            // Check if already sent a risk campaign recently
            const sent = await db.get(
                `SELECT id FROM customer_campaigns 
                 WHERE customer_id = ? AND type = 'churn_risk' 
                 AND created_at > ?`,
                [customer.id, recentRiskCutoff]
            );

            if (!sent) {
                // Prepare specific message for risk
                const wa = new EvolutionWhatsAppProvider();
                if (wa.isConfigured()) {
                    const couponCode = `BACK${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
                    const message = `✨ Oi ${customer.name}! Notamos que você sumiu nos últimos dias. 😔 Sentimos falta dos seus pedidos! Preparamos um cupom especial de *${(trigger.discount_value / 100).toFixed(2)}* para você não ficar sem seu Açaí: *${couponCode}*. Volta pra gente? 💜`;

                    await wa.send({
                        orderId: 'CHURN_PREVENTION',
                        customerPhone: customer.phone,
                        event: 'promotion',
                        restaurantName: 'X-Açaí IA',
                        extra: { body: message }
                    });

                    await db.run(
                        `INSERT INTO customer_campaigns (id, restaurant_id, customer_id, type, status)
                         VALUES (?, ?, ?, ?, ?)`,
                        [randomUUID(), restaurantId, customer.id, 'churn_risk', 'sent']
                    );
                }
            }
        }
    }
}

export const marketingService = new MarketingService();
