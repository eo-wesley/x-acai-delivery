import { getDb } from '../db/db.client';
import { forecastingService } from './forecasting.service';
import { EvolutionWhatsAppProvider } from '../notifications/providers/evolution.provider';
import { randomUUID } from 'crypto';

export class ProcurementAIService {
    /**
     * Smart Ordering Algorithm:
     * Sugere a quantidade ideal de compra baseada na previsão de 14 dias,
     * estoque atual e lead time médio.
     */
    async getSmartOrderSuggestions(restaurantId: string) {
        const db = await getDb();
        const forecast = await forecastingService.getOrderDemandForecast(restaurantId);

        // Itens de estoque com baixos níveis ou alta demanda prevista
        const items = await db.all(`
            SELECT i.*, 
                   IFNULL(AVG(pi.unit_price_cents), 0) as avg_unit_cost,
                   (SELECT COUNT(*) FROM order_items oi 
                    JOIN orders o ON oi.order_id = o.id 
                    WHERE oi.item_id = i.id AND o.status = 'completed' AND o.created_at > date('now', '-7 days')) as sales_velocity
            FROM inventory_items i
            LEFT JOIN inventory_purchase_items pi ON i.id = pi.inventory_item_id
            WHERE i.restaurant_id = ?
            GROUP BY i.id
        `, [restaurantId]);

        // Calcular tendência: Comparar começo vs fim do forecast
        const firstDays = forecast.slice(0, 3).reduce((acc, f) => acc + f.predictedOrders, 0);
        const lastDays = forecast.slice(-3).reduce((acc, f) => acc + f.predictedOrders, 0);
        const trend = lastDays > firstDays ? 'increasing' : 'stable';

        const suggestions = items.map(item => {
            // IA Simplificada: Projeta consumo baseado na velocidade de vendas + tendência de forecast
            const trendFactor = trend === 'increasing' ? 1.2 : 0.9;
            const projectedConsumption7Days = item.sales_velocity * trendFactor;
            const projectedConsumption14Days = projectedConsumption7Days * 2;

            // Safety Stock: 3 dias de reserva
            const safetyStock = Math.ceil(projectedConsumption7Days * 0.4);
            const idealLevel = Math.ceil(projectedConsumption14Days + safetyStock);

            const neededQty = idealLevel - item.current_stock;

            if (neededQty > 0) {
                return {
                    itemId: item.id,
                    name: item.name,
                    currentStock: item.current_stock,
                    suggestedQty: neededQty,
                    estimatedCost: Math.round(neededQty * item.avg_unit_cost),
                    reason: item.current_stock < safetyStock ? 'Urgente: Abaixo do estoque de segurança' : 'Reposição Preventiva'
                };
            }
            return null;
        }).filter(Boolean);

        return suggestions;
    }

    /**
     * Waste Analytics: Detecta discrepâncias entre insumos comprados vs vendidos.
     * CMV (Custo de Mercadoria Vendida) Teórico vs Real.
     */
    async getWasteAnalysis(restaurantId: string, days = 30) {
        const db = await getDb();
        // Placeholder para lógica complexa de de-composicão de receitas (Bill of Materials)
        // Por agora, comparamos o volume de compras com o volume de vendas simplificado
        return {
            estimatedWastePercentage: 4.2, // Mock IA
            topWasteItems: [
                { name: 'Açaí 10L', lossCents: 15200 },
                { name: 'Leite Condensado', lossCents: 4500 }
            ],
            potentialSavingsCents: 24700
        };
    }

    /**
     * RFQ Automático: Envia solicitação de cotação para fornecedores via WhatsApp.
     */
    async requestSupplierQuote(restaurantId: string, supplierId: string, items: any[]) {
        const db = await getDb();
        const supplier = await db.get(`SELECT * FROM suppliers WHERE id = ?`, [supplierId]);

        if (!supplier || !supplier.phone) return { error: 'Fornecedor sem telefone configurado' };

        const wa = new EvolutionWhatsAppProvider();
        if (wa.isConfigured()) {
            let itemLines = items.map(i => `- ${i.name}: ${i.qty} un`).join('\n');
            const message = `📦 *Solicitação de Cotação - X-Açaí IA*\n\nOlá ${supplier.contact_name || supplier.name}! Gostaríamos de um orçamento para os seguintes itens:\n\n${itemLines}\n\nAguardamos seu retorno com preços e prazos de entrega. Obrigado! 🍇`;

            await wa.send({
                orderId: 'RFQ_' + randomUUID().substring(0, 8),
                customerPhone: supplier.phone,
                event: 'promotion', // Usando promotion como template genérico
                restaurantName: 'X-Açaí Procurement',
                extra: { body: message }
            });

            return { success: true };
        }

        return { error: 'WhatsApp não configurado' };
    }
}

export const procurementAIService = new ProcurementAIService();
