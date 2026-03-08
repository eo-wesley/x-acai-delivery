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
                // Usando o endpoint de track enriquecido
                const res = await fetch(`${API}/api/track/${id}`, { cache: 'no-store' });
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
                <div className="h-44 bg-purple-50 rounded-3xl" />
                <div className="h-32 bg-purple-50 rounded-3xl" />
                <div className="h-24 bg-purple-50 rounded-3xl" />
            </div>
        );
    }

    if (!order) {
        return (
            <div className="p-6 text-center mt-12">
                <div className="text-6xl mb-6">🔍</div>
                <h2 className="font-black text-gray-800 text-2xl">Pedido não encontrado</h2>
                <p className="text-gray-500 mt-2 text-sm italic">Verifique o link ou aguarde alguns instantes.</p>
                <Link href="/"><button className="mt-8 bg-purple-700 text-white font-bold py-4 px-10 rounded-2xl shadow-lg active:scale-95 transition">Voltar ao Cardápio</button></Link>
            </div>
        );
    }

    const items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
    const isCancelled = order.status === 'cancelled';
    const isCompleted = ['completed', 'delivered'].includes(order.status);
    const currentStep = STATUS_MAP[order.status] ?? 0;
    const badge = STATUS_BADGE[order.status] || { bg: 'bg-gray-100 text-gray-700', text: order.status };
    const currentTimeline = STATUS_TIMELINE[currentStep];

    const pixPending = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('method') === 'pix' && order.status === 'pending_payment'
        : false;

    return (
        <div className="min-h-screen bg-[#FDFCFE] pb-32 font-sans overflow-x-hidden">
            {/* Status change flash */}
            {justChanged && (
                <div className="fixed top-4 left-4 right-4 z-50 bg-purple-700 text-white text-center py-4 rounded-2xl font-bold text-sm animate-bounce shadow-2xl border border-purple-500">
                    ✨ Status atualizado: {badge.text}
                </div>
            )}

            {/* Header Header Premium */}
            <div className="bg-gradient-to-b from-purple-800 to-purple-950 text-white p-8 pb-16 rounded-b-[40px] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-700 opacity-20 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-600 opacity-10 rounded-full -ml-10 -mb-10 blur-2xl"></div>

                <div className="relative z-10 flex flex-col items-center">
                    <div className="bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4 border border-white/20">
                        {order.restaurant_name || 'X-Açaí Delivery'}
                    </div>
                    <div className="text-6xl mb-4 drop-shadow-lg">{isCancelled ? '❌' : currentTimeline?.icon || '📦'}</div>
                    <h1 className="text-2xl font-black tracking-tight">{badge.text.replace('🏍️', '').replace('✅', '').replace('📋', '').replace('🍳', '').trim()}</h1>
                    <p className="text-purple-200 text-xs mt-1 font-medium italic opacity-80">{currentTimeline?.msg}</p>

                    <div className="mt-6 flex flex-col items-center gap-2">
                        <span className="text-[10px] text-purple-300 font-bold uppercase tracking-widest">Identificador</span>
                        <div className="bg-black/20 backdrop-blur-sm px-6 py-2 rounded-2xl font-mono text-sm border border-white/10 shadow-inner">
                            #{id?.slice(0, 8).toUpperCase()}
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-6 -mt-8 space-y-6 max-w-lg mx-auto relative z-20">
                {/* Save Link Reminder */}
                <div className="bg-purple-50 border border-purple-100 rounded-2xl p-3 flex items-center justify-between text-xs text-purple-800 shadow-sm animate-pulse">
                    <span className="font-bold flex items-center gap-2">📌 Salve este link para acompanhar seu pedido!</span>
                </div>

                {/* Timeline Stepper Premium */}
                {!isCancelled && (
                    <div className="bg-white rounded-3xl p-6 shadow-xl shadow-purple-900/5 border border-purple-50/50">
                        <div className="flex justify-between relative px-2">
                            <div className="absolute top-5 left-8 right-8 h-1 bg-gray-100 z-0 rounded-full">
                                <div className="h-full bg-purple-500 transition-all duration-1000 rounded-full" style={{ width: `${(currentStep / (STATUS_TIMELINE.length - 1)) * 100}%` }} />
                            </div>
                            {STATUS_TIMELINE.map((step, i) => {
                                const done = i <= currentStep;
                                const active = i === currentStep;
                                return (
                                    <div key={step.key} className="flex flex-col items-center z-10">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 border-x-4 border-y-4 text-xs
                                            ${done ? 'bg-purple-700 border-white text-white shadow-lg scale-100' : 'bg-gray-50 border-white text-gray-300'}
                                            ${active ? 'ring-4 ring-purple-100 scale-125 !z-20' : ''}`}>
                                            {done ? (active ? step.icon : '✓') : step.icon}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex justify-between mt-4 px-1 text-[9px] font-black uppercase text-gray-400 tracking-tighter">
                            {STATUS_TIMELINE.map((step, i) => (
                                <span key={i} className={i <= currentStep ? 'text-purple-900' : ''}>{step.label}</span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Driver Info Card (Se houver entrega e motorista) */}
                {order.driver && (
                    <div className="bg-white rounded-3xl p-6 shadow-xl shadow-purple-900/5 border border-purple-50/50">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div> SEU ENTREGADOR
                        </h3>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-xl shadow-inner">👤</div>
                            <div className="flex-1">
                                <p className="font-black text-gray-800 uppercase tracking-tight">{order.driver.driver_name}</p>
                                <p className="text-xs text-gray-500 font-medium">{order.driver.driver_vehicle || 'Veículo Cadastrado'}</p>
                            </div>
                            <a href={`tel:${order.driver.driver_phone}`} className="w-10 h-10 bg-green-500 text-white rounded-xl flex items-center justify-center shadow-lg hover:bg-green-600 transition active:scale-90">
                                📞
                            </a>
                        </div>
                    </div>
                )}

                {/* PIX Payment CTA */}
                {pixPending && order.payment_url && (
                    <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-3xl p-6 text-white shadow-xl shadow-yellow-500/20 animate-pulse">
                        <p className="font-black text-lg mb-1 drop-shadow-sm">📲 Pagamento Pendente</p>
                        <p className="text-xs opacity-90 mb-4 font-medium">Finalize seu pagamento para que a loja comece a preparar seu pedido imediatamente.</p>
                        <a href={order.payment_url} target="_blank" rel="noreferrer">
                            <button className="bg-white text-yellow-600 font-black py-4 px-8 rounded-2xl shadow-xl transition active:scale-95 w-full uppercase tracking-tighter text-sm">
                                💸 Ir para o PIX
                            </button>
                        </a>
                    </div>
                )}

                {/* Items & Resume */}
                <div className="bg-white rounded-3xl p-6 shadow-xl shadow-purple-900/5 border border-purple-50/50">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div> RESUMO DO PEDIDO
                    </h3>
                    <div className="space-y-4">
                        {items.map((item: any, i: number) => (
                            <div key={i} className="flex flex-col border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                                <div className="flex justify-between items-start">
                                    <div className="flex gap-3">
                                        <div className="bg-purple-50 text-purple-700 font-black text-xs w-6 h-6 rounded-lg flex items-center justify-center">{item.qty}x</div>
                                        <div className="flex flex-col">
                                            <span className="font-black text-gray-800 text-sm tracking-tight">{item.name || item.menuItemId}</span>
                                            {item.notes && <span className="text-[10px] text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded-md mt-1 w-fit">OBS: {item.notes}</span>}
                                        </div>
                                    </div>
                                    <span className="text-gray-900 font-bold text-xs">R$ {((item.unitPriceCents * item.qty) / 100).toFixed(2).replace('.', ',')}</span>
                                </div>
                                {item.selected_options && item.selected_options.map((opt: any, idx: number) => (
                                    <div key={idx} className="flex justify-between text-[11px] text-gray-500 pl-9 mt-1 italic">
                                        <span>+ {opt.optionName}</span>
                                        {opt.price_cents > 0 && <span>+ R$ {(opt.price_cents / 100).toFixed(2).replace('.', ',')}</span>}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 pt-6 border-t-2 border-dashed border-gray-100 space-y-3">
                        <div className="flex justify-between text-xs text-gray-500 font-medium">
                            <span>Subtotal</span>
                            <span>R$ {(order.subtotal_cents / 100).toFixed(2).replace('.', ',')}</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 font-medium">
                            <span>Taxa de Entrega</span>
                            <span className="text-green-600 font-bold">{order.delivery_fee_cents > 0 ? `R$ ${(order.delivery_fee_cents / 100).toFixed(2).replace('.', ',')}` : 'GRÁTIS'}</span>
                        </div>
                        {order.discount_cents > 0 && (
                            <div className="flex justify-between text-xs text-green-600 bg-green-50 p-2 rounded-xl">
                                <span className="font-bold">Desconto {order.coupon_code ? `(${order.coupon_code})` : ''}</span>
                                <span className="font-black">− R$ {(order.discount_cents / 100).toFixed(2).replace('.', ',')}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl">
                            <span className="font-black text-gray-400 text-[10px] uppercase tracking-widest">Valor Pago</span>
                            <span className="font-black text-purple-900 text-xl tracking-tighter">R$ {(order.total_cents / 100).toFixed(2).replace('.', ',')}</span>
                        </div>
                    </div>
                </div>

                {/* Rating (only for completed) */}
                {isCompleted && <RatingForm orderId={id} customerName={order.customer_name} />}

                {/* Restaurant Detail Card */}
                <div className="bg-white rounded-3xl p-6 shadow-xl shadow-purple-900/5 border border-purple-50/50">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div> SOBRE A LOJA
                    </h3>
                    <div className="flex items-center gap-4 mb-4">
                        {order.restaurant_logo ? (
                            <img src={order.restaurant_logo} alt="Logo" className="w-12 h-12 rounded-2xl object-cover shadow-sm border border-gray-100" />
                        ) : (
                            <div className="w-12 h-12 bg-purple-100 text-purple-700 font-black flex items-center justify-center rounded-2xl text-xl shadow-inner">
                                {order.restaurant_name?.charAt(0) || 'X'}
                            </div>
                        )}
                        <div className="flex-1">
                            <p className="font-black text-gray-800 uppercase tracking-tight leading-tight">{order.restaurant_name || 'X-Açaí Delivery'}</p>
                            <p className="text-[10px] text-gray-400 font-medium mt-0.5 line-clamp-1">📍 {order.restaurant_address || 'Unidade Principal'}</p>
                        </div>
                        {order.restaurant_phone && (
                            <a href={`https://wa.me/${order.restaurant_phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center shadow-sm border border-green-100 hover:bg-green-100 transition active:scale-90">
                                <span className="text-xl">💬</span>
                            </a>
                        )}
                    </div>
                </div>

                {/* Address & Info */}
                <div className="bg-white rounded-3xl p-6 shadow-xl shadow-purple-900/5 border border-purple-50/50">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div> ENTREGA EM
                    </h3>
                    <p className="text-sm text-gray-800 font-bold leading-relaxed">{order.address_text}</p>
                    {order.customer_name && <p className="text-xs text-gray-500 mt-2">Destinatário: <span className="font-bold text-gray-700">{order.customer_name}</span></p>}
                </div>

                <div className="text-center py-6">
                    <p className="text-[9px] text-gray-300 font-bold uppercase tracking-[0.3em]">X-Açaí Delivery Platform</p>
                </div>
            </div>

            {/* Sticky Floating Action Button */}
            <div className="fixed bottom-0 left-0 w-full bg-white/80 backdrop-blur-xl border-t border-purple-50 p-6 z-40 shadow-[0_-20px_50px_rgba(0,0,0,0.05)]">
                <div className="max-w-md mx-auto">
                    <Link href="/">
                        <button className="w-full bg-purple-700 hover:bg-purple-800 text-white font-black py-5 rounded-[24px] shadow-2xl shadow-purple-200 transition active:scale-[0.98] flex items-center justify-center gap-3 group">
                            <span className="text-xl group-hover:rotate-12 transition-transform">🍇</span>
                            NOVO PEDIDO
                        </button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
