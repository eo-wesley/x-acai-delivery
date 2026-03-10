import { Router } from 'express';
import { getDb } from '../db/db.client';
import { randomUUID } from 'crypto';
import { eventBus } from '../core/eventBus';

export const ifoodRouter = Router();

/**
 * Simulado de Webhook do iFood
 * Recebe um pedido externo e cria no sistema X-Açaí
 */
ifoodRouter.post('/webhook/order', async (req: any, res: any) => {
    try {
        // No iFood real, viria um X-Ifood-Store-Id ou similar
        // Aqui simulamos recebendo o tenantId no body ou query para fins de teste
        const { restaurantId, order } = req.body;

        if (!restaurantId || !order) {
            return res.status(400).json({ error: 'Missing restaurantId or order data' });
        }

        const db = await getDb();

        // 1. Verificar se o restaurante tem a integração ativa
        const integration = await db.get(`
            SELECT status FROM marketplace_integrations 
            WHERE restaurant_id = ? AND platform = 'ifood' AND status = 'connected'
        `, [restaurantId]);

        if (!integration) {
            return res.status(403).json({ error: 'iFood integration not active for this restaurant' });
        }

        // 2. Criar ou buscar cliente "Marketplace iFood"
        // Em integrações reais, o iFood fornece os dados do cliente
        let customer = await db.get(`SELECT id FROM customers WHERE restaurant_id = ? AND phone = 'IFOOD'`, [restaurantId]);
        if (!customer) {
            const customerId = randomUUID();
            await db.run(`
                INSERT INTO customers (id, restaurant_id, name, phone)
                VALUES (?, ?, ?, ?)
            `, [customerId, restaurantId, 'Cliente iFood', 'IFOOD']);
            customer = { id: customerId };
        }

        // 3. Criar o pedido
        const orderId = randomUUID();
        const itemsJson = JSON.stringify(order.items.map((it: any) => ({
            id: it.id,
            name: it.name,
            quantity: it.quantity,
            price: it.price
        })));

        await db.run(`
            INSERT INTO orders (
                id, restaurant_id, customer_id, status, items, 
                subtotal_cents, delivery_fee_cents, total_cents, 
                address_text, source, external_id, payment_status
            ) VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, 'ifood', ?, 'approved')
        `, [
            orderId,
            restaurantId,
            customer.id,
            itemsJson,
            order.subtotal || 0,
            order.deliveryFee || 0,
            order.total || 0,
            order.deliveryAddress || 'Retirada no iFood',
            order.displayId || order.id
        ]);

        // 4. Disparar evento para o KDS e Notificações
        eventBus.emit('order_created', { orderId, restaurantId });

        res.json({ success: true, orderId });
    } catch (err: any) {
        console.error('iFood Webhook Error:', err);
        res.status(500).json({ error: err.message });
    }
});
