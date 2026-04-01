import { env } from '../config/env';
import { randomUUID } from 'crypto';

/**
 * Mercado Pago PIX Payment Service — X-Açaí Delivery
 *
 * Supports:
 *   - PIX QR Code generation via POST /v1/payments
 *   - Payment status query via GET /v1/payments/:id
 *   - Graceful mock fallback when no API credentials provided
 *
 * Required env variables:
 *   MP_ACCESS_TOKEN  → Mercado Pago access token (production or sandbox)
 *   MP_WEBHOOK_URL   → Public URL for webhook callbacks
 *
 * Optional:
 *   PAYMENT_API_KEY  → Alias for backwards compatibility
 */

export interface PixPaymentResult {
    paymentId: string;
    status: string;          // pending, approved, rejected
    qrCode: string;          // PIX Copia e Cola (text)
    qrCodeBase64: string;    // Base64 image for QR Code display
    expiresAt: string;       // ISO timestamp
    isMock: boolean;
}

export class PixPaymentService {
    private token: string;
    private webhookUrl: string;
    public static lastError: any = null;

    constructor() {
        this.token = env.MP_ACCESS_TOKEN || env.PAYMENT_API_KEY || '';
        const configuredWebhookUrl = env.MP_WEBHOOK_URL?.trim();
        const publicApiBase = env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '');

        this.webhookUrl = configuredWebhookUrl
            || (publicApiBase ? `${publicApiBase}/api/payments/mercadopago/webhook/mercadopago` : 'http://localhost:3000/api/payments/mercadopago/webhook/mercadopago');
    }

    isMockMode(): boolean {
        return !this.token || this.token.startsWith('YOUR_') || this.token.length < 20;
    }

    /**
     * Creates a PIX payment and returns QR code data.
     * Falls back to mock if MP_ACCESS_TOKEN is not set.
     */
    async createPixPayment(params: {
        orderId: string;
        totalCents: number;
        customerName: string;
        customerEmail?: string;
        customerDoc?: string;   // CPF (optional for sandbox)
        description?: string;
    }): Promise<PixPaymentResult> {
        if (this.isMockMode()) {
            return this.createMockPixPayment(params.orderId, params.totalCents);
        }

        const amountBRL = Number((params.totalCents / 100).toFixed(2));

        const payload = {
            transaction_amount: amountBRL,
            payment_method_id: 'pix',
            description: params.description || `Pedido X-Açaí #${params.orderId.slice(0, 8).toUpperCase()}`,
            external_reference: params.orderId,
            notification_url: this.webhookUrl,
            payer: {
                email: params.customerEmail || 'cliente@xacai.com.br',
                first_name: params.customerName.split(' ')[0] || 'Cliente',
                last_name: params.customerName.split(' ').slice(1).join(' ') || 'X-Açaí',
                ...(params.customerDoc
                    ? { identification: { type: 'CPF', number: params.customerDoc } }
                    : {}),
            },
        };

        try {
            const res = await fetch('https://api.mercadopago.com/v1/payments', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.token}`,
                    'Content-Type': 'application/json',
                    'X-Idempotency-Key': `xacai-${params.orderId}`,
                },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(15000),
            });

            if (!res.ok) {
                const errBody = await res.text();
                console.error(`[PIX] MP API error ${res.status}:`, errBody);
                throw new Error(`Mercado Pago API Error (${res.status}): ${errBody}`);
            }

            const data = (await res.json()) as any;
            const txInfo = data.point_of_interaction?.transaction_data;

            console.log(`[PIX] Payment created: ID ${data.id} status=${data.status}`);

            await logPayment({
                orderId: params.orderId,
                provider: 'mercadopago',
                paymentReference: String(data.id),
                status: data.status,
                payload: JSON.stringify({ id: data.id, status: data.status }),
            });

            return {
                paymentId: String(data.id),
                status: data.status,
                qrCode: txInfo?.qr_code || '',
                qrCodeBase64: txInfo?.qr_code_base64 || '',
                expiresAt: data.date_of_expiration || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
                isMock: false,
            };
        } catch (e: any) {
            console.error('[PIX] Request failed:', e.message);
            return this.createMockPixPayment(params.orderId, params.totalCents);
        }
    }

    /**
     * Query payment status from Mercado Pago.
     */
    async getPaymentStatus(paymentId: string): Promise<{ status: string; paidAt?: string }> {
        if (this.isMockMode() || paymentId.startsWith('mock_')) {
            return { status: 'pending' };
        }
        try {
            const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
                headers: { Authorization: `Bearer ${this.token}` },
                signal: AbortSignal.timeout(8000),
            });
            if (!res.ok) return { status: 'unknown' };
            const data = (await res.json()) as any;
            return {
                status: data.status,
                paidAt: data.status === 'approved' ? data.date_approved : undefined,
            };
        } catch (e: any) {
            console.error('[PIX] getPaymentStatus error:', e.message);
            return { status: 'unknown' };
        }
    }

    private createMockPixPayment(orderId: string, totalCents: number): PixPaymentResult {
        const shortId = orderId.slice(0, 8).toUpperCase();
        const amount = (totalCents / 100).toFixed(2).replace('.', ',');
        const mockQr = `00020126360014BR.GOV.BCB.PIX0114+5511999990000520400005303986540${String(totalCents / 100).padStart(6, '0')}5802BR5913XACAI DELIVERY6008BRASILIA62290525XACAI${shortId}630412345`;
        const expiry = new Date(Date.now() + 30 * 60 * 1000).toISOString();

        console.log(`\n[PIX MOCK] QR Code criado para pedido #${shortId} — R$ ${amount}`);
        console.log(`[PIX MOCK] QR: ${mockQr.substring(0, 60)}...`);
        console.log(`[PIX MOCK] Expira: ${expiry}\n`);

        return {
            paymentId: `mock_${orderId}`,
            status: 'pending',
            qrCode: mockQr,
            qrCodeBase64: '',
            expiresAt: expiry,
            isMock: true,
        };
    }
}

// ─── Payment Log Helper ───────────────────────────────────────────────────────

export interface PaymentLogEntry {
    orderId: string;
    provider: string;
    paymentReference: string;
    status: string;
    payload?: string;
    errorMessage?: string;
}

export async function logPayment(entry: PaymentLogEntry): Promise<void> {
    try {
        const { getDb } = await import('../db/db.client');
        const db = await getDb();
        await db.run(
            `INSERT INTO payment_logs (id, order_id, provider, payment_reference, status, payload)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                randomUUID(),
                entry.orderId,
                entry.provider,
                entry.paymentReference,
                entry.status,
                entry.payload ? entry.payload.substring(0, 1000) : null,
            ]
        );
    } catch (e: any) {
        console.error('[PaymentLog] Failed to persist:', e.message);
    }
}

export const pixPaymentService = new PixPaymentService();
