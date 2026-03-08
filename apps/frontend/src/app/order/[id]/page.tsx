'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const STATUS_TIMELINE = [
    { key: 'pending', label: 'Recebido', icon: '📋', msg: 'Pedido recebido! Aguardando confirmação.' },
    { key: 'accepting', label: 'Aceito', icon: '✅', msg: 'Pedido aceito pela loja!' },
    { key: 'preparing', label: 'Em Preparo', icon: '🍳', msg: 'Preparando com carinho! ❤️' },
    { key: 'delivering', label: 'Saiu p/ Entrega', icon: '🏍️', msg: 'Entregador a caminho!' },
    { key: 'completed', label: 'Entregue', icon: '✅', msg: 'Pedido entregue! Bom apetite! 🍇' },
];

const STATUS_MAP: Record<string, number> = {
    pending_payment: 0, pending: 0, accepted: 1,
    preparing: 2, out_for_delivery: 3, delivering: 3,
    delivered: 4, completed: 4,
};

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
    pending_payment: { bg: 'bg-yellow-100 text-yellow-800', text: '⏳ Aguardando Pagamento' },
    pending: { bg: 'bg-yellow-100 text-yellow-800', text: '📋 Aguardando Confirmação' },
    accepted: { bg: 'bg-blue-100 text-blue-800', text: '✅ Aceito pela Loja' },
    preparing: { bg: 'bg-blue-100 text-blue-800', text: '🍳 Em Preparo' },
    out_for_delivery: { bg: 'bg-purple-100 text-purple-800', text: '🏍️ Saiu para Entrega' },
    delivering: { bg: 'bg-purple-100 text-purple-800', text: '🏍️ Saiu para Entrega' },
    delivered: { bg: 'bg-green-100 text-green-800', text: '✅ Entregue!' },
    completed: { bg: 'bg-green-100 text-green-800', text: '🎉 Pedido Concluído!' },
    cancelled: { bg: 'bg-red-100 text-red-700', text: '❌ Cancelado' },
};

/* ─── Rating Form ──────────────────────────────────────────── */
function RatingForm({ orderId, customerName }: { orderId: string; customerName?: string }) {
    const [stars, setStars] = useState(0);
    const [hovered, setHovered] = useState(0);
    const [comment, setComment] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // Check if already rated
        fetch(`${API}/api/orders/${orderId}/rating`).then(r => r.ok && setSubmitted(true)).catch(() => { });
    }, [orderId]);

    const submit = async () => {
        if (!stars) { setError('Selecione uma nota.'); return; }
        setLoading(true);
        const res = await fetch(`${API}/api/orders/${orderId}/rating`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stars, comment, customerName }),
        });
        if (res.ok) { setSubmitted(true); }
        else { const d = await res.json(); setError(d.error || 'Erro ao enviar'); }
        setLoading(false);
    };

    if (submitted) {
        return (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
                <div className="text-4xl mb-2">🙏</div>
                <p className="font-black text-green-700">Obrigado pela avaliação!</p>
                <p className="text-xs text-green-600 mt-1">Sua opinião é muito importante para nós.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="font-black text-gray-800 mb-3 text-sm uppercase tracking-wide">⭐ Como foi seu pedido?</h3>
            {/* Stars */}
            <div className="flex gap-2 justify-center mb-4">
                {[1, 2, 3, 4, 5].map(s => (
                    <button
                        key={s}
                        type="button"
                        onMouseEnter={() => setHovered(s)}
                        onMouseLeave={() => setHovered(0)}
                        onClick={() => setStars(s)}
                        className={`text-3xl transition-transform active:scale-90 ${(hovered || stars) >= s ? 'scale-110' : 'opacity-40'}`}
                    >
                        ⭐
                    </button>
                ))}
            </div>
            <textarea
                rows={2}
                placeholder="Deixe um comentário (opcional)..."
                className="w-full border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-purple-400 resize-none mb-3"
                value={comment}
                onChange={e => setComment(e.target.value)}
            />
            {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
            <button
                onClick={submit}
                disabled={loading || !stars}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black py-3 rounded-xl disabled:opacity-40 transition"
            >
                {loading ? 'Enviando...' : 'Enviar Avaliação'}
            </button>
        </div>
    );
}

/* ─── Main Page ───────────────────────────────────────── */
export default function OrderStatusPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [justChanged, setJustChanged] = useState(false);

    useEffect(() => {
        let prevStatus = '';
        const fetchOrder = async () => {
            try {
                const res = await fetch(`${API}/api/orders/${id}`, { cache: 'no-store' });
                if (res.ok) {
                    const data = await res.json();
                    if (prevStatus && prevStatus !== data.status) {
                        setJustChanged(true);
                        setTimeout(() => setJustChanged(false), 3500);
                    }
                    prevStatus = data.status;
                    setOrder(data);
                    setLastUpdated(new Date());
                }
            } catch { }
            setLoading(false);
        };
        fetchOrder();
        const iv = setInterval(fetchOrder, 5000);
        return () => clearInterval(iv);
    }, [id]);

    if (loading) {
        return (
            <div className="p-4 pb-24 space-y-4 animate-pulse">
                <div className="h-44 bg-gray-100 rounded-2xl" />
                <div className="h-32 bg-gray-100 rounded-2xl" />
                <div className="h-24 bg-gray-100 rounded-2xl" />
            </div>
        );
    }

    if (!order) {
        return (
            <div className="p-6 text-center mt-12">
                <div className="text-5xl mb-4">😕</div>
                <h2 className="font-black text-gray-800 text-xl">Pedido não encontrado</h2>
                <p className="text-gray-500 mt-2 text-sm">O link pode estar incorreto.</p>
                <Link href="/"><button className="mt-6 bg-purple-600 text-white font-bold py-3 px-8 rounded-xl">Voltar ao Cardápio</button></Link>
            </div>
        );
    }

    const items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
    const isCancelled = order.status === 'cancelled';
    const isCompleted = ['completed', 'delivered'].includes(order.status);
    const currentStep = STATUS_MAP[order.status] ?? 0;
    const badge = STATUS_BADGE[order.status] || { bg: 'bg-gray-100 text-gray-700', text: order.status };
    const currentTimeline = STATUS_TIMELINE[currentStep];

    // Detect PIX payment from URL
    const pixPending = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('method') === 'pix' && order.status === 'pending_payment'
        : false;

    return (
        <div className="min-h-screen bg-gray-50 pb-32">
            {/* Status change flash */}
            {justChanged && (
                <div className="fixed top-0 left-0 right-0 z-50 bg-purple-600 text-white text-center py-3 font-bold text-sm animate-bounce shadow-lg">
                    🔔 Status atualizado: {badge.text}
                </div>
            )}

            <div className="p-4 space-y-4">
                {/* Hero badge */}
                <div className={`rounded-2xl p-6 text-center shadow-sm ${badge.bg}`}>
                    <div className="text-5xl mb-3">{isCancelled ? '❌' : currentTimeline?.icon || '📦'}</div>
                    <h2 className="text-base font-black mb-1">Pedido #{id?.slice(0, 8).toUpperCase()}</h2>
                    <span className={`inline-block text-sm font-bold px-3 py-1 rounded-full ${badge.bg}`}>{badge.text}</span>
                    {currentTimeline?.msg && !isCancelled && (
                        <p className="text-sm mt-2 opacity-80">{currentTimeline.msg}</p>
                    )}
                    {lastUpdated && (
                        <p className="text-xs mt-2 opacity-60">
                            Atualizado {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} · auto a cada 5s
                        </p>
                    )}
                    {!isCancelled && !isCompleted && currentStep >= 1 && (
                        <div className="mt-4 bg-white bg-opacity-40 inline-block px-4 py-2 rounded-xl text-sm font-bold shadow-sm">
                            ⏱️ Previsão de entrega: 40-50 min
                        </div>
                    )}
                </div>

                {/* PIX Payment CTA — shown when pending_payment + method=pix */}
                {pixPending && order.payment_url && (
                    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-4 text-center">
                        <p className="font-black text-yellow-800 mb-1">📲 Finalize o Pagamento PIX</p>
                        <p className="text-xs text-yellow-700 mb-3">Clique abaixo para ir ao MercadoPago e pagar com PIX.</p>
                        <a href={order.payment_url} target="_blank" rel="noreferrer">
                            <button className="bg-yellow-500 hover:bg-yellow-600 text-white font-black py-3 px-8 rounded-xl transition active:scale-95 w-full">
                                💸 Pagar com PIX
                            </button>
                        </a>
                        <p className="text-xs text-gray-400 mt-2">Após o pagamento, seu pedido será confirmado automaticamente.</p>
                    </div>
                )}

                {/* Timeline Stepper */}
                {!isCancelled && (
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                        <div className="flex justify-between relative">
                            <div className="absolute top-5 left-[10%] right-[10%] h-0.5 bg-gray-200 z-0" />
                            {STATUS_TIMELINE.map((step, i) => {
                                const done = i <= currentStep;
                                const active = i === currentStep;
                                return (
                                    <div key={step.key} className="flex flex-col items-center z-10 flex-1">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border-2 text-sm
                                            ${done ? 'bg-purple-600 border-purple-600 text-white shadow-md' : 'bg-white border-gray-200 text-gray-400'}
                                            ${active ? 'ring-4 ring-purple-200 scale-110' : ''}`}>
                                            {done ? (active ? step.icon : '✓') : step.icon}
                                        </div>
                                        <p className={`text-center text-[10px] mt-1.5 font-semibold leading-tight max-w-[60px] ${done ? 'text-purple-700' : 'text-gray-400'}`}>
                                            {step.label}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Items */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <h3 className="font-black text-gray-800 mb-3 text-xs uppercase tracking-wide">🧾 Seu Pedido</h3>
                    <div className="space-y-2">
                        {items.map((item: any, i: number) => (
                            <div key={i} className="flex flex-col text-sm border-b border-gray-50 pb-2 mb-2 last:border-0 last:pb-0 last:mb-0 text-gray-700">
                                <div className="flex justify-between items-center">
                                    <span>
                                        <span className="font-black text-purple-700">{item.qty}x</span> {item.name || item.menuItemId}
                                        {item.notes && <span className="text-orange-500 text-xs ml-1">({item.notes})</span>}
                                    </span>
                                    {item.unitPriceCents != null && (
                                        <span className="text-gray-500 text-xs text-right">R$ {((item.unitPriceCents * item.qty) / 100).toFixed(2).replace('.', ',')}</span>
                                    )}
                                </div>
                                {item.selected_options && item.selected_options.length > 0 && (
                                    <ul className="pl-6 mt-1 text-xs text-gray-500 list-none space-y-0.5 border-l-2 border-purple-100 ml-1">
                                        {item.selected_options.map((opt: any, idx: number) => (
                                            <li key={idx}>
                                                <span className="text-gray-400 mr-1">└</span> {opt.optionName} <span className="opacity-70">({opt.groupName})</span>
                                                {opt.price_cents > 0 && <span className="ml-1 text-purple-600 font-semibold">+ R$ {(opt.price_cents / 100).toFixed(2).replace('.', ',')}</span>}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-100 space-y-1 text-sm">
                        {order.subtotal_cents != null && (
                            <div className="flex justify-between text-gray-500">
                                <span>Subtotal</span>
                                <span>R$ {(order.subtotal_cents / 100).toFixed(2).replace('.', ',')}</span>
                            </div>
                        )}
                        {order.delivery_fee_cents != null && (
                            <div className="flex justify-between text-gray-500">
                                <span>Entrega</span>
                                <span>R$ {(order.delivery_fee_cents / 100).toFixed(2).replace('.', ',')}</span>
                            </div>
                        )}
                        {order.discount_cents > 0 && (
                            <div className="flex justify-between text-green-600">
                                <span>Desconto {order.coupon_code ? `(${order.coupon_code})` : ''}</span>
                                <span>− R$ {(order.discount_cents / 100).toFixed(2).replace('.', ',')}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-black text-gray-900 text-base pt-1 border-t border-gray-100">
                            <span>Total</span>
                            <span>R$ {(order.total_cents / 100).toFixed(2).replace('.', ',')}</span>
                        </div>
                    </div>
                </div>

                {/* Rating (only for completed) */}
                {isCompleted && <RatingForm orderId={id} customerName={order.customer_name} />}

                {/* Address & Notes */}
                {order.address_text && (
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-sm">
                        <p className="font-black text-gray-800 mb-1 text-xs uppercase tracking-wide">📍 Endereço</p>
                        <p className="text-gray-600">{order.address_text}</p>
                    </div>
                )}
                {order.notes && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm">
                        <p className="font-black text-amber-800 mb-1 text-xs uppercase tracking-wide">📝 Obs</p>
                        <p className="text-amber-700">{order.notes}</p>
                    </div>
                )}
            </div>

            {/* Sticky CTA */}
            <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-4 z-40">
                <div className="max-w-md mx-auto">
                    <Link href="/">
                        <button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black py-4 rounded-xl transition active:scale-95">
                            + Fazer Novo Pedido
                        </button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
