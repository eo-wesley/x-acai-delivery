import { Router } from 'express';
import { adminAuthMiddleware } from '../middlewares/auth.middleware';
import { tenantMiddleware } from '../middlewares/tenant.middleware';
import { marketingService } from '../services/marketing.service';
import { getDb } from '../db/db.client';
import { EvolutionWhatsAppProvider } from '../notifications/providers/evolution.provider';

export const actionsRouter = Router();

actionsRouter.post('/actions/execute', adminAuthMiddleware, tenantMiddleware, async (req, res) => {
    const { action, payload } = req.body;
    const restaurantId = (req as any).tenantId;

    try {
        if (action === 'restock_order') {
            const { itemId, itemName, currentQty } = payload;
            const db = await getDb();

            // Find item and supplier
            const item = await db.get('SELECT supplier FROM inventory_items WHERE id = ? AND restaurant_id = ?', [itemId, restaurantId]);
            const supplierName = item?.supplier;

            let supplierPhone = '';
            if (supplierName) {
                // Try to find in suppliers table
                const supplier = await db.get('SELECT phone FROM suppliers WHERE (name = ? OR contact_name = ?) AND restaurant_id = ?', [supplierName, supplierName, restaurantId]);
                supplierPhone = supplier?.phone || '';
            }

            if (!supplierPhone) {
                return res.status(400).json({ error: `Contato não encontrado para o fornecedor: ${supplierName || 'Não definido'}.` });
            }

            const wa = new EvolutionWhatsAppProvider();
            const message = `🍇 *Pedido de Reposição - X-Açaí*\n\nOlá! Gostaria de solicitar a reposição do item: *${itemName}*.\nNosso estoque atual é de ${currentQty}.\n\nPor favor, confirme o recebimento deste pedido. Obrigado!`;

            await wa.send({
                orderId: 'RESTOCK_' + Date.now(),
                customerPhone: supplierPhone,
                event: 'promotion', // Using generic event
                restaurantId,
                restaurantName: 'X-Açaí Delivery',
                extra: { body: message }
            });

            return res.json({ success: true, message: `Pedido de reposição enviado para o fornecedor (${supplierName}).` });
        }

        if (action === 'schedule_marketing') {
            const { customerId, type, scheduledFor } = payload;
            await marketingService.scheduleCampaign(restaurantId, customerId, type, scheduledFor);
            return res.json({ success: true, message: 'Campanha agendada com sucesso pela IA.' });
        }

        if (action === 'churn_winback') {
            const { customerId, customerName, customerPhone } = payload;
            // Manual trigger for winback message
            const db = await getDb();
            const trigger = await db.get(
                `SELECT * FROM marketing_triggers WHERE restaurant_id = ? AND type = 'winback' AND active = 1`,
                [restaurantId]
            );

            if (!trigger) return res.status(400).json({ error: 'Nenhuma campanha de Winback ativa configurada.' });

            await (marketingService as any).sendCampaign(restaurantId, { id: customerId, name: customerName, phone: customerPhone }, 'winback', trigger);
            return res.json({ success: true, message: `Campanha de recuperação enviada para ${customerName}.` });
        }

        res.status(400).json({ error: 'Ação de IA inválida ou não suportada.' });
    } catch (err: any) {
        console.error('[ActionsRouter] Error:', err);
        res.status(500).json({ error: 'Falha ao executar ação de IA: ' + err.message });
    }
});
