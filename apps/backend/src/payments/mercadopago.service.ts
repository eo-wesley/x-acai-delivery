import { env } from '../config/env';

export class MercadoPagoService {
    private accessToken: string;
    // URL base for MercadoPago preferences creation API. 
    private apiUrl = 'https://api.mercadopago.com/checkout/preferences';

    constructor() {
        this.accessToken = env.PAYMENT_API_KEY || '';
    }

    async createPreference(orderId: string, totalCents: number, items: Array<any>): Promise<string> {
        // If no real API key is provided, we simulate a mock checkout URL immediately to avoid crashing.
        if (!this.accessToken || this.accessToken === 'YOUR_ACCESS_TOKEN_HERE') {
            console.log(`[MercadoPago] Mocking preference generation for Order ${orderId}`);
            return `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=mock_${orderId}`;
        }

        try {
            const mappedItems = items.map(item => ({
                title: item.name || 'Produto Açaí',
                description: item.notes || 'Sem observações',
                quantity: item.qty,
                currency_id: 'BRL',
                unit_price: Number((item.unitPriceCents / 100).toFixed(2))
            }));

            // Added delivery fee as a product if necessary, or just sum it all up.
            // Simplified: MercadoPago needs sum of (unit_price * qty) == Total.
            // Using a single grouped total line-item format to guarantee no rounding issues for the MVP:
            const singleLineItem = [{
                title: `Pedido X-Açaí #${orderId.split('-')[0]}`,
                quantity: 1,
                currency_id: 'BRL',
                unit_price: Number((totalCents / 100).toFixed(2))
            }];

            const API_URL = env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
            const webhookUrl = `${API_URL}/webhook/payment`;

            const payload = {
                items: singleLineItem,
                external_reference: orderId,
                notification_url: webhookUrl,
                back_urls: {
                    success: `${API_URL}/order/${orderId}?payment=success`,
                    failure: `${API_URL}/order/${orderId}?payment=failure`,
                    pending: `${API_URL}/order/${orderId}?payment=pending`
                },
                auto_return: 'approved'
            };

            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const err = await response.text();
                console.error(`[MercadoPago] Error generating preference:`, err);
                throw new Error('Falha ao gerar link MercadoPago');
            }

            const data = await response.json() as any;
            // Retorna URL de init do mercado pago
            return data.init_point;
        } catch (error) {
            console.error('[MercadoPago] Critical Exception:', error);
            return `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=fallback_mock_${orderId}`;
        }
    }
}

export const mercadoPagoService = new MercadoPagoService();
