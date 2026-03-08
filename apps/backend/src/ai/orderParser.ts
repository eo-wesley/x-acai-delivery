import { aiRouter } from './ai.router';
import { menuRepo } from '../db/repositories/menu.repo';
import { customersRepo } from '../db/repositories/customers.repo';

export interface ParsedOrder {
    product_id: string | null;
    product_name: string | null;
    modifiers: string[];
    quantity: number;
    total_cents: number;
    notes: string | null;
}

export class OrderParser {
    async parseOrder(message: string, restaurantId: string, phone?: string): Promise<ParsedOrder | null> {
        try {
            const menu = await menuRepo.listMenu(restaurantId, true);
            const menuContext = menu.map(m => ({
                id: m.id,
                name: m.name,
                price: m.price_cents,
                description: m.description
            }));

            // Phase 15: Personalization context
            let customerContext = '';
            if (phone) {
                const customer = await customersRepo.getCustomerByPhone(restaurantId, phone);
                if (customer) {
                    customerContext = `PREFERÊNCIAS DO CLIENTE (#${phone}):
- Tags: ${customer.tags || 'Nenhuma'}
- Notas: ${customer.notes || 'Nenhuma'}`;
                }
            }

            const systemPrompt = `Você é um extrator de pedidos (Order Parser) para uma loja de Açaí.
Sua missão é converter mensagens em linguagem natural em um objeto JSON estruturado.

CARDÁPIO ATUAL:
${JSON.stringify(menuContext, null, 2)}

${customerContext}

INSTRUÇÕES:
1. Identifique o produto mais provável do cardápio. Use o ID real se houver correspondência.
2. Extraia modificadores/adicionais mencionados.
3. Determine a quantidade (padrão é 1).
4. Calcule o total estimado em centavos (preço base * quantidade).
5. Se não identificar um produto real do cardápio, retorne product_id como null.
6. Leve em conta as preferências do cliente se mencionadas ("o de sempre", "sem aquilo que não gosto").

FORMATO DE RESPOSTA (APENAS JSON):
{
  "product_id": "string ou null",
  "product_name": "string ou null",
  "modifiers": ["string"],
  "quantity": number,
  "total_cents": number,
  "notes": "string ou null"
}

Responda APENAS o JSON puro. Não use markdown.`;

            const response = await aiRouter.routeChat({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: message }
                ],
                temperature: 0.1
            });

            const cleanText = response.text.replace(/```(json)?/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanText);

            return {
                product_id: parsed.product_id || null,
                product_name: parsed.product_name || null,
                modifiers: parsed.modifiers || [],
                quantity: parsed.quantity || 1,
                total_cents: parsed.total_cents || 0,
                notes: parsed.notes || null
            };
        } catch (error) {
            console.error('[OrderParser] Error parsing message:', error);
            return null;
        }
    }
}

export const orderParser = new OrderParser();
