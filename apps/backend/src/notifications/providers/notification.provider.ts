/**
 * NotificationProvider Interface - X-Acai Delivery
 *
 * All providers must implement this interface.
 * sendMessage must NEVER throw - errors should be caught internally.
 */

export type NotificationEvent =
    | 'order_created'
    | 'order_accepted'
    | 'order_preparing'
    | 'order_delivering'
    | 'order_delivered'
    | 'order_cancelled'
    | 'order_dispatched'
    | 'promotion'
    | 'stock_alert'
    | 'marketing_campaign';

export type NotificationRecipientRole = 'customer' | 'store';

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
    restaurantId?: string;
    orderId: string;
    customerPhone?: string;
    recipientPhone?: string;
    recipientRole?: NotificationRecipientRole;
    idempotencyKey?: string;
    customerName?: string;
    restaurantName?: string;
    totalCents?: number;
    event: NotificationEvent;
    customMessage?: string;
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

export function buildMessage(payload: NotificationPayload): string {
    const firstName = payload.customerName ? `, ${payload.customerName.split(' ')[0]}` : '';
    const orderId = payload.orderId.slice(0, 8).toUpperCase();
    const restaurant = payload.restaurantName || 'X-Acai';
    const recipientRole = payload.recipientRole || 'customer';

    let itemsText = '';
    if (payload.event === 'order_created' && payload.extra?.items?.length) {
        itemsText = '\n\nCarrinho:\n';
        for (const item of payload.extra.items) {
            itemsText += `- ${item.qty}x ${item.name || item.menuItemId}\n`;
            if (item.selected_options?.length) {
                for (const opt of item.selected_options) {
                    itemsText += `  * ${opt.optionName}`;
                    if (opt.price_cents > 0) {
                        itemsText += ` (+R$ ${(opt.price_cents / 100).toFixed(2).replace('.', ',')})`;
                    }
                    itemsText += '\n';
                }
            }
            if (item.notes) {
                itemsText += `  Obs: ${item.notes}\n`;
            }
        }
    }

    const total = payload.totalCents
        ? `\nTotal: R$ ${(payload.totalCents / 100).toFixed(2).replace('.', ',')}`
        : '';

    const payment = payload.extra?.paymentMethod
        ? `\nPagamento: ${payload.extra.paymentMethod === 'pix'
            ? 'PIX'
            : payload.extra.paymentMethod === 'card'
                ? 'Cartao'
                : payload.extra.paymentMethod === 'wallet'
                    ? 'Carteira'
                    : 'Dinheiro'
        }`
        : '';

    const address = payload.extra?.addressText
        ? `\nEndereco: ${payload.extra.addressText}`
        : '';

    const trackingUrl = `https://${restaurant.toLowerCase().replace(/\s/g, '-')}.delivery/order/${payload.orderId}`;
    const trackingMsg = `\n\nAcompanhe seu pedido em tempo real:\n${trackingUrl}`;
    const storeOrderCreated =
        `Novo pedido recebido em ${restaurant}\n\n` +
        `Pedido #${orderId}` +
        `\nCliente: ${payload.customerName || 'Cliente'}` +
        total +
        payment +
        address +
        itemsText;

    const templates: Record<NotificationEvent, string> = {
        order_created:
            recipientRole === 'store'
                ? storeOrderCreated
                : `Ola${firstName}! Seu pedido *#${orderId}* foi recebido por ${restaurant}. ` +
                `Aguarde a confirmacao da loja.` +
                itemsText +
                total +
                payment +
                address +
                trackingMsg,
        order_accepted:
            `${restaurant}: O pagamento do seu pedido *#${orderId}* foi aprovado. ` +
            `Ja vamos comecar a preparar.` +
            trackingMsg,
        order_preparing:
            `${restaurant}: Seu pedido *#${orderId}* esta sendo preparado com carinho.` +
            trackingMsg,
        order_delivering:
            `${restaurant}: Seu pedido *#${orderId}* saiu para entrega. Nosso entregador ja esta a caminho.` +
            trackingMsg,
        order_delivered:
            `${restaurant}: Seu pedido *#${orderId}* foi entregue. Obrigado pela preferencia. Bom apetite!` +
            `\n\nAvalie seu pedido:\n${trackingUrl}`,
        order_cancelled:
            `${restaurant}: Infelizmente seu pedido *#${orderId}* foi cancelado. Entre em contato conosco para mais informacoes.`,
        order_dispatched:
            `Pedido *#${orderId}* foi despachado para entrega!` +
            trackingMsg,
        promotion: payload.customMessage || 'Novidade especial para voce!',
        stock_alert: payload.extra?.body as string || `Alerta de estoque em ${restaurant}`,
        marketing_campaign: payload.extra?.body as string || `Novidade em ${restaurant}`
    };

    return payload.customMessage || (payload.extra?.body as string) || templates[payload.event] || `Atualizacao do pedido #${orderId} - ${restaurant}`;
}
