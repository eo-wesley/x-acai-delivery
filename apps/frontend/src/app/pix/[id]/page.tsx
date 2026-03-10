'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function fmtCents(c: number) {
    return 'R$ ' + (c / 100).toFixed(2).replace('.', ',');
}

function PixQRBlock({
    qrCode,
    qrBase64,
    expiresAt,
    onExpired,
    onRegenerate,
}: {
    qrCode: string;
    qrBase64: string;
    expiresAt?: string;
    onExpired?: () => void;
    onRegenerate?: () => void;
}) {
    const [copied, setCopied] = useState(false);
    const [expired, setExpired] = useState(false);
    const [remaining, setRemaining] = useState<string>('');

    useEffect(() => {
        if (!expiresAt) return;
        const interval = setInterval(() => {
            const diff = new Date(expiresAt).getTime() - Date.now();
            if (diff <= 0) {
                setExpired(true);
                clearInterval(interval);
                onExpired?.();
            } else {
                const min = Math.floor(diff / 60000);
                const sec = Math.floor((diff % 60000) / 1000);
                setRemaining(`${min}:${sec.toString().padStart(2, '0')}`);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [expiresAt, onExpired]);

    const copyQr = async () => {
        try {
            await navigator.clipboard.writeText(qrCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            const el = document.createElement('textarea');
            el.value = qrCode;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        }
    };

    if (expired) {
        return (
            <div className="flex flex-col items-center gap-3 py-6">
                <div className="text-5xl">⏰</div>
                <p className="font-black text-red-700 text-base">QR Code expirado</p>
                <p className="text-sm text-gray-500 text-center">O tempo para pagar expirou (30 min).</p>
                {onRegenerate && (
                    <button
                        onClick={onRegenerate}
                        className="mt-2 bg-purple-600 hover:bg-purple-700 text-white font-black py-3 px-6 rounded-xl transition active:scale-95"
                    >
                        🔄 Gerar novo PIX
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-4">
            {/* QR Image */}
            <div className="bg-white border-4 border-purple-200 rounded-2xl p-3 shadow-lg">
                {qrBase64 ? (
                    <img
                        src={`data:image/png;base64,${qrBase64}`}
                        alt="QR Code PIX"
                        className="w-52 h-52 object-contain"
                        loading="eager"
                    />
                ) : (
                    <div className="w-52 h-52 flex flex-col items-center justify-center text-center gap-2 bg-gray-50 rounded-xl">
                        <span className="text-4xl">💸</span>
                        <p className="text-xs text-gray-500 px-2">QR Code gerado — use o código abaixo para copiar</p>
                    </div>
                )}
            </div>

            {/* Timer */}
            {remaining && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
                    <span className="text-amber-600 text-lg">⏱</span>
                    <span className="text-amber-800 font-bold text-sm">Expira em {remaining}</span>
                </div>
            )}

            {/* Copy button */}
            <button
                onClick={copyQr}
                className={`w-full py-3 rounded-xl font-black text-base transition active:scale-95 flex items-center justify-center gap-2 shadow-sm
                    ${copied
                        ? 'bg-green-500 text-white'
                        : 'bg-purple-600 hover:bg-purple-700 text-white'}`}
            >
                {copied ? '✅ Código copiado!' : '📋 Copiar código PIX'}
            </button>

            {/* Full code (scrollable) */}
            <div className="w-full bg-gray-100 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wide">Copia e Cola</p>
                <p className="text-xs text-gray-600 break-all font-mono leading-relaxed select-all">
                    {qrCode}
                </p>
            </div>
        </div>
    );
}

/* ─── Main PIX Page ─────────────────────────────────────── */
export default function PixPaymentPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    const [pixData, setPixData] = useState<{
        qrCode: string;
        qrBase64: string;
        expiresAt?: string;
        orderId: string;
        totalCents?: number;
        items?: any[];
    } | null>(null);

    const [paymentStatus, setPaymentStatus] = useState<string>('pending_payment');
    const [loadingPix, setLoadingPix] = useState(true);
    const [error, setError] = useState('');
    const [regenerating, setRegenerating] = useState(false);

    // Load PIX data from sessionStorage (set by checkout) or fetch from API
    useEffect(() => {
        const stored = sessionStorage.getItem(`pix_${id}`);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setPixData(parsed);
                setLoadingPix(false);
                return;
            } catch { /* ignore */ }
        }
        // Fallback: fetch order and extract pix data
        fetch(`${API}/api/orders/${id}`, { cache: 'no-store' })
            .then(r => r.json())
            .then(order => {
                if (order.payment_qr_code || order.pix_qr_code) {
                    setPixData({
                        orderId: id,
                        qrCode: order.payment_qr_code || order.pix_qr_code || '',
                        qrBase64: order.payment_qr_base64 || order.pix_qr_base64 || '',
                        totalCents: order.total_cents,
                    });
                } else {
                    setError('QR PIX não encontrado para este pedido.');
                }
                setLoadingPix(false);
            })
            .catch(() => {
                setError('Falha ao carregar dados do pagamento.');
                setLoadingPix(false);
            });
    }, [id]);

    // Poll payment status every 3s
    useEffect(() => {
        const slug = localStorage.getItem('tenant_slug') || 'default';
        const poll = async () => {
            try {
                const res = await fetch(`${API}/api/${slug}/orders/${id}/payment-status`, { cache: 'no-store' });
                if (res.ok) {
                    const data = await res.json();
                    const status = data.payment_status || data.status;
                    setPaymentStatus(status);
                    if (status === 'paid' || data.order_status === 'confirmed') {
                        sessionStorage.removeItem(`pix_${id}`);
                        router.replace(`/order/${id}?paid=1`);
                    }
                }
            } catch { /* silent */ }
        };
        poll();
        const iv = setInterval(poll, 3000);
        return () => clearInterval(iv);
    }, [id, router]);

    const handleRegenerate = async () => {
        setRegenerating(true);
        try {
            const res = await fetch(`${API}/api/webhooks/mercadopago/simulate/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'regenerate' }),
            });
            // For now, just reload and fetch new data
            const orderRes = await fetch(`${API}/api/orders/${id}`, { cache: 'no-store' });
            const order = await orderRes.json();
            if (order.payment_qr_code || order.pix_qr_code) {
                setPixData({
                    orderId: id,
                    qrCode: order.payment_qr_code || order.pix_qr_code || '',
                    qrBase64: order.payment_qr_base64 || order.pix_qr_base64 || '',
                    totalCents: order.total_cents,
                });
            }
        } catch { /* silent */ }
        setRegenerating(false);
    };

    if (loadingPix) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50 p-6">
                <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-500 font-medium">Gerando QR Code PIX...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50 p-6 text-center">
                <div className="text-5xl">😕</div>
                <h2 className="font-black text-gray-800 text-xl">Ops!</h2>
                <p className="text-gray-500 text-sm">{error}</p>
                <Link href={`/order/${id}`}>
                    <button className="mt-4 bg-purple-600 text-white font-bold py-3 px-6 rounded-xl">
                        Ver meu pedido
                    </button>
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-purple-50 to-gray-50">
            <div className="max-w-md mx-auto bg-white shadow-sm min-h-screen p-4 pb-32 relative">
                {/* Header */}
                <div className="flex items-center gap-3 pt-2">
                    <Link href={`/order/${id}`} className="text-purple-600 font-bold text-sm">← Meu Pedido</Link>
                    <h1 className="text-lg font-black text-gray-800">Pagar com PIX</h1>
                </div>

                {/* Status banner */}
                <div className={`rounded-2xl px-4 py-3 text-center font-bold text-sm mt-5 transition-all ${paymentStatus === 'paid'
                    ? 'bg-green-100 text-green-800 border border-green-300'
                    : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                    }`}>
                    {paymentStatus === 'paid'
                        ? '✅ Pagamento confirmado! Redirecionando...'
                        : '⏳ Aguardando confirmação do pagamento...'}
                    <div className="flex justify-center mt-2 gap-1">
                        {[0, 1, 2].map(i => (
                            <div
                                key={i}
                                className={`w-1.5 h-1.5 rounded-full bg-yellow-400 animate-bounce`}
                                style={{ animationDelay: `${i * 0.15}s` }}
                            />
                        ))}
                    </div>
                </div>

                {/* QR Block */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mt-5">
                    <h2 className="font-black text-gray-800 text-sm uppercase tracking-wide mb-4 text-center">
                        📲 Escaneie com qualquer app de banco
                    </h2>
                    {pixData && (
                        <PixQRBlock
                            qrCode={pixData.qrCode}
                            qrBase64={pixData.qrBase64}
                            expiresAt={pixData.expiresAt}
                            onRegenerate={handleRegenerate}
                        />
                    )}
                </div>

                {/* Total */}
                {pixData?.totalCents && (
                    <div className="bg-purple-600 text-white rounded-2xl px-5 py-4 flex justify-between items-center shadow-md mt-5">
                        <span className="font-bold text-sm opacity-80">Total a pagar</span>
                        <span className="font-black text-2xl">{fmtCents(pixData.totalCents)}</span>
                    </div>
                )}

                {/* Instructions */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mt-5">
                    <h3 className="font-black text-gray-800 text-xs uppercase tracking-wide mb-3">💡 Como pagar</h3>
                    <ol className="space-y-2 text-sm text-gray-600">
                        {[
                            'Abra o app do seu banco',
                            'Acesse a área PIX',
                            'Escolha "Pagar com QR Code" ou "Copia e cola"',
                            'Escaneie o QR ou cole o código',
                            'Confirme o valor e finalize',
                        ].map((step, i) => (
                            <li key={i} className="flex items-start gap-3">
                                <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                                    {i + 1}
                                </span>
                                {step}
                            </li>
                        ))}
                    </ol>
                </div>

                {/* Tips */}
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800 mt-5">
                    <p className="font-black text-xs uppercase tracking-wide mb-2">⚠️ Atenção</p>
                    <ul className="space-y-1 text-xs">
                        <li>• O QR Code expira em 30 minutos</li>
                        <li>• Após pagar, seu pedido será confirmado automaticamente</li>
                        <li>• Não feche esta página até o pagamento ser confirmado</li>
                        <li>• Em caso de dúvidas, entre em contacto via WhatsApp</li>
                    </ul>
                </div>

                {/* Navigation */}
                <div className="flex gap-3 mt-5">
                    <Link href={`/order/${id}`} className="flex-1">
                        <button className="w-full border-2 border-purple-600 text-purple-700 font-black py-3 rounded-xl transition hover:bg-purple-50">
                            Ver Pedido
                        </button>
                    </Link>
                    <Link href="/" className="flex-1">
                        <button className="w-full border-2 border-gray-200 text-gray-600 font-black py-3 rounded-xl transition hover:bg-gray-50">
                            Cardápio
                        </button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
