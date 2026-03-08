/**
 * NotificationProvider Interface — X-Açaí Delivery
 *
 * All providers must implement this interface.
 * sendMessage must NEVER throw — errors should be caught internally.
 */

export type NotificationEvent =
    | 'order_created'
    | 'order_accepted'
    | 'order_preparing'
    | 'order_delivering'
    | 'order_delivered'
    | 'order_cancelled'
    | 'order_dispatched';

export interface OrderItem {
    menuItemId: string;
    name?: string;
    qty: number;
    notes?: string;
    selected_options?: Array<{
        groupId: string;
        groupName: string;
        optionId: string;
        optionName: string;
        price_cents: number;
    }>;
}

export interface NotificationPayload {
    orderId: string;
    customerPhone?: string;
    customerName?: string;
    restaurantName?: string;
    totalCents?: number;
    event: NotificationEvent;
    extra?: {
        items?: OrderItem[];
        paymentMethod?: string;
        addressText?: string;
        [key: string]: unknown;
    };
}

export interface NotificationProvider {
    name: string;
    send(payload: NotificationPayload): Promise<void>;
}

// ─── Message Template Builder ─────────────────────────────────────────────────

export function buildMessage(payload: NotificationPayload): string {
    const firstName = payload.customerName ? `, ${payload.customerName.split(' ')[0]}` : '';
    const orderId = payload.orderId.slice(0, 8).toUpperCase();
    const restaurant = payload.restaurantName || 'X-Açaí';

    let itemsText = '';
    if (payload.event === 'order_created' && payload.extra?.items?.length) {
        itemsText = '\n\n🛒 *ITENS DO PEDIDO:*\n';
        for (const item of payload.extra.items) {
            itemsText += `🔸 *${item.qty}x* ${item.name || item.menuItemId}\n`;
            if (item.selected_options?.length) {
                for (const opt of item.selected_options) {
                    itemsText += `   └ ${opt.optionName}`;
                    if (opt.price_cents > 0) {
                        itemsText += ` (+R$ ${(opt.price_cents / 100).toFixed(2).replace('.', ',')})`;
                    }
                    itemsText += '\n';
                }
            }
            if (item.notes) itemsText += `   📝 *Obs:* ${item.notes}\n`;
        }
    }

    const total = payload.totalCents
        ? `\n💰 *Total:* R$ ${(payload.totalCents / 100).toFixed(2).replace('.', ',')}`
        : '';

    const payment = payload.extra?.paymentMethod
        ? `\n💳 *Pagamento:* ${payload.extra.paymentMethod === 'pix'
            ? 'PIX'
            : payload.extra.paymentMethod === 'card'
                ? 'Cartão'
                : 'Dinheiro'
        }`
        : '';

    const address = payload.extra?.addressText
        ? `\n📍 *Endereço:* ${payload.extra.addressText}`
        : '';

    const templates: Record<NotificationEvent, string> = {
        order_created:
            `🍇 Olá${firstName}! Seu pedido *#${orderId}* foi recebido por ${restaurant}! ` +
            `Aguarde a confirmação da loja 😊` +
            itemsText +
            total +
            payment +
            address,
        order_accepted:
            `✅ ${restaurant}: Seu pedido *#${orderId}* foi *aceito*! Já vamos começar a preparar. Aguarde!`,
        order_preparing:
            `🍳 ${restaurant}: Seu pedido *#${orderId}* está sendo *preparado* com muito carinho! Em breve sai para entrega.`,
        order_delivering:
            `🏍️ ${restaurant}: Seu pedido *#${orderId}* *saiu para entrega*! Nosso entregador já está a caminho.`,
        order_delivered:
            `✅ ${restaurant}: Seu pedido *#${orderId}* foi *entregue*! Obrigado pela preferência. Bom apetite! 🍇`,
        order_cancelled:
            `❌ ${restaurant}: Infelizmente seu pedido *#${orderId}* foi *cancelado*. Entre em contato conosco para mais informações.`,
        order_dispatched:
            `🚀 Pedido *#${orderId}* foi despachado para entrega!`,
    };

    return (payload.extra?.body as string) || templates[payload.event] || `Atualização do pedido #${orderId} — ${restaurant}`;
}
