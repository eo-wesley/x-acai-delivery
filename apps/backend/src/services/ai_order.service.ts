import { getDb } from '../db/db.client';
import { ordersRepo, CreateOrderInput } from '../db/repositories/orders.repo';
import { eventBus } from '../core/eventBus';

export class AIOrderService {
    async processNaturalOrder(text: string, restaurantId: string, customerId: string): Promise<any> {
        console.log(`🤖 [AI Order] Processing: "${text}" for restaurant ${restaurantId}`);

        // 1. Intent Parser (Simulando extração de entidades via NLP)
        const entities = this.parseEntities(text);
        if (entities.length === 0) {
            throw new Error('Não consegui entender seu pedido. Pode ser mais específico?');
        }

        // 2. Menu Resolver (Mapear nomes para IDs reais e Preços)
        const resolvedItems = await this.resolveItems(entities, restaurantId);

        if (resolvedItems.length === 0) {
            throw new Error('Infelizmente não encontramos esses itens no cardápio de hoje.');
        }

        // 3. Build Order Object
        const subtotalCents = resolvedItems.reduce((acc, item) => acc + (item.unitPriceCents * item.qty), 0);
        const deliveryFeeCents = 500; // Mock de taxa de entrega

        const orderInput: CreateOrderInput = {
            customerId,
            restaurantId,
            items: resolvedItems,
            subtotalCents,
            deliveryFeeCents,
            totalCents: subtotalCents + deliveryFeeCents,
            addressText: 'Pego no Balcão (IA Order)', // Ou extrair do texto
            source: 'ai_chatbot'
        };

        // 4. Create Order
        const order = await ordersRepo.createOrder(orderInput);

        eventBus.emit('order_created', {
            orderId: order.id,
            customerId: order.customer_id,
            restaurantId,
            totalCents: orderInput.totalCents,
        });

        return order;
    }

    private parseEntities(text: string) {
        // Regex básica para demonstração: "2 açai 500ml", "um combo premium"
        // Em produção aqui chamamos Gemini/OpenAI
        const items: { name: string, qty: number }[] = [];

        // Exemplo: "2 acai", "um acai", "3 sucos"
        const regex = /(\d+|um|uma)\s+([a-zA-Z\s]+?)(?:(?=e\s+)|$)/gi;
        let match;
        while ((match = regex.exec(text)) !== null) {
            const qtyStr = match[1].toLowerCase();
            const qty = qtyStr === 'um' || qtyStr === 'uma' ? 1 : parseInt(qtyStr);
            items.push({ name: match[2].trim(), qty });
        }

        // Fallback: se não achar quantidade, assume 1 para qualquer palavra chave detectada
        if (items.length === 0) {
            const keywords = ['acai', 'suco', 'sorvete', 'agua', 'cupuacu'];
            keywords.forEach(kw => {
                if (text.toLowerCase().includes(kw)) {
                    items.push({ name: kw, qty: 1 });
                }
            });
        }

        return items;
    }

    private async resolveItems(entities: { name: string, qty: number }[], restaurantId: string) {
        const db = await getDb();
        const resolved = [];

        for (const entity of entities) {
            // Busca Fuzzy básica: procura itens que contenham o nome extraído
            const menuItem = await db.get(
                `SELECT id, name, price_cents FROM menu_items 
                 WHERE restaurant_id = ? AND name LIKE ? LIMIT 1`,
                [restaurantId, `%${entity.name}%`]
            );

            if (menuItem) {
                resolved.push({
                    menuItemId: menuItem.id,
                    qty: entity.qty,
                    unitPriceCents: menuItem.price_cents,
                    notes: `Adicionado via IA: "${entity.name}"`
                });
            }
        }

        return resolved;
    }
}

export const aiOrderService = new AIOrderService();
