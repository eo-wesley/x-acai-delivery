'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ChefHat, Clock, CheckCircle, AlertCircle, Play, Printer } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
function getToken() { return localStorage.getItem('admin_token') || ''; }
function getSlug() { return localStorage.getItem('admin_slug') || 'default'; }

type OrderItem = {
    name?: string;
    menuItemId?: string;
    qty: number;
    notes?: string;
    selected_options?: { groupName: string; optionName: string }[]
};

type Order = {
    id: string;
    customer_name?: string;
    status: string;
    created_at: string;
    source?: string;
    type?: string;     // 'delivery', 'dine_in', 'pickup'
    table_id?: string;
    items: OrderItem[];
};

function TimeCounter({ startTime }: { startTime: string }) {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        const calculate = () => {
            const start = new Date(startTime).getTime();
            const now = Date.now();
            setElapsed(Math.floor((now - start) / 60000));
        };
        calculate();
        const interval = setInterval(calculate, 60000);
        return () => clearInterval(interval);
    }, [startTime]);

    const isLate = elapsed > 20;

    return (
        <div className={`flex items-center gap-1.5 font-black text-xs px-2 py-1 rounded-lg ${isLate ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-200 text-gray-600'}`}>
            <Clock size={12} />
            <span>{elapsed}m</span>
        </div>
    );
}

export default function KitchenDisplay() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const prevCountRef = useRef(0);

    const loadOrders = useCallback(async () => {
        try {
            const res = await fetch(`${API}/api/admin/orders?slug=${getSlug()}`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            if (!res.ok) return;
            const data: Order[] = await res.json();

            // Kitchen should keep newly paid Pix orders visible until production starts.
            const kitchenOrders = data.filter(o => ['pending', 'accepted', 'confirmed', 'preparing'].includes(o.status))
                .map(o => ({
                    ...o,
                    items: typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || [])
                }))
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

            if (kitchenOrders.length > prevCountRef.current && prevCountRef.current > 0) {
                audioRef.current?.play().catch(() => { });
            }
            prevCountRef.current = kitchenOrders.length;
            setOrders(kitchenOrders);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadOrders();
        const interval = setInterval(loadOrders, 5000);
        return () => clearInterval(interval);
    }, [loadOrders]);

    const updateStatus = async (id: string, newStatus: string) => {
        try {
            await fetch(`${API}/api/admin/orders/${id}/status`, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus }),
            });
            loadOrders();
        } catch (e) {
            alert('Erro ao atualizar status.');
        }
    };

    if (loading) return <div className="p-8 text-center font-bold text-gray-400 animate-pulse">CARREGANDO COZINHA...</div>;

    return (
        <div className="min-h-screen bg-[#0F172A] p-4 lg:p-6 font-sans">
            <audio ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" preload="auto" />

            <header className="flex items-center justify-between mb-8 bg-gray-900/50 p-6 rounded-[32px] border border-white/5 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-br from-orange-400 to-orange-600 p-3 rounded-2xl text-white shadow-lg shadow-orange-500/20">
                        <ChefHat size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">Smart KDS</h1>
                        <p className="text-orange-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1">Central de Produção Unificada</p>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Pedidos Ativos</p>
                        <p className="text-2xl font-black text-white">{orders.length}</p>
                    </div>
                    <div className="flex items-center gap-2 bg-green-500/10 px-4 py-2 rounded-full border border-green-500/20">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Ao Vivo</span>
                    </div>
                </div>
            </header>

            {orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 text-gray-600">
                    <div className="w-24 h-24 bg-gray-800/50 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle size={48} className="opacity-20" />
                    </div>
                    <p className="text-xl font-black uppercase tracking-widest text-gray-400">Cozinha Limpa</p>
                    <p className="text-sm font-medium text-gray-500 mt-2">Aguardando novos pedidos com carinho...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {orders.map(order => {
                        const isDineIn = order.type === 'dine_in';
                        const isPickup = order.type === 'pickup';
                        const isDelivery = !isDineIn && !isPickup;

                        let typeLabel = 'Delivery';
                        let typeColor = 'bg-blue-600';
                        let typeIcon = '🏍️';

                        if (isDineIn) {
                            typeLabel = `Mesa ${order.table_id || '?'}`;
                            typeColor = 'bg-emerald-600';
                            typeIcon = '🍽️';
                        } else if (isPickup) {
                            typeLabel = 'Retirada';
                            typeColor = 'bg-purple-600';
                            typeIcon = '🛍️';
                        }

                        return (
                            <div key={order.id} className="bg-white rounded-[32px] overflow-hidden shadow-2xl flex flex-col h-full border-4 border-gray-800/50 hover:border-gray-700 transition-colors group">
                                {/* Header do Card */}
                                <div className={`p-5 flex items-center justify-between border-b ${['pending', 'accepted', 'confirmed'].includes(order.status) ? 'bg-orange-500 text-white' : 'bg-gray-50 text-gray-800'}`}>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`${typeColor} text-[9px] font-black px-2 py-0.5 rounded-full text-white uppercase flex items-center gap-1`}>
                                                {typeIcon} {typeLabel}
                                            </span>
                                            {order.source === 'ifood' && (
                                                <span className="bg-red-600 text-[9px] font-black px-2 py-0.5 rounded-full text-white uppercase animate-pulse">iFood</span>
                                            )}
                                        </div>
                                        <div className="text-2xl font-black tracking-tighter">#{order.id.split('-')[0].toUpperCase()}</div>
                                    </div>
                                    <TimeCounter startTime={order.created_at} />
                                </div>

                                {/* Cliente */}
                                <div className="px-5 py-3 bg-gray-100/50 border-b flex items-center justify-between">
                                    <p className="text-[10px] font-black text-gray-500 uppercase truncate max-w-[150px]">👤 {order.customer_name || 'Cliente'}</p>
                                    <span className="text-[10px] font-bold text-gray-400">{new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>

                                {/* Itens do Pedido */}
                                <div className="flex-1 p-5 space-y-4 overflow-y-auto max-h-[400px]">
                                    {order.items.map((item, i) => (
                                        <div key={i} className="flex flex-col border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                                            <div className="flex items-start gap-4">
                                                <span className="bg-gray-900 text-white text-lg font-black w-10 h-10 flex items-center justify-center rounded-2xl flex-shrink-0 shadow-md">
                                                    {item.qty}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-black text-gray-800 leading-tight text-lg uppercase tracking-tighter">{item.name || item.menuItemId}</p>
                                                    {item.selected_options && item.selected_options.length > 0 && (
                                                        <div className="mt-2 space-y-1">
                                                            {item.selected_options.map((opt, idx) => (
                                                                <p key={idx} className="text-[11px] font-bold text-gray-500 flex items-center gap-2 bg-gray-50 px-2 py-1 rounded-lg w-fit">
                                                                    <span className="text-orange-500">✔</span> {opt.optionName}
                                                                </p>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {item.notes && (
                                                <div className="mt-3 bg-red-50 p-3 rounded-2xl text-[11px] font-black text-red-700 border border-red-100 flex items-start gap-2">
                                                    <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                                                    <span>OBS: {item.notes}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Ações */}
                                <div className="p-5 grid grid-cols-1 gap-2 border-t bg-gray-50">
                                    {['pending', 'accepted', 'confirmed'].includes(order.status) && (
                                        <button
                                            onClick={() => updateStatus(order.id, 'preparing')}
                                            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-5 rounded-[24px] flex items-center justify-center gap-3 transition active:scale-95 shadow-xl shadow-orange-500/20 group-hover:scale-[1.02]"
                                        >
                                            <Play size={20} fill="currentColor" />
                                            COMEÇAR AGORA
                                        </button>
                                    )}
                                    {order.status === 'preparing' && (
                                        <button
                                            onClick={() => updateStatus(order.id, order.type === 'dine_in' ? 'completed' : 'delivering')}
                                            className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-5 rounded-[24px] flex items-center justify-center gap-3 transition active:scale-95 shadow-xl shadow-green-500/20 group-hover:scale-[1.02]"
                                        >
                                            <CheckCircle size={20} />
                                            PRONTO PARA SAIR
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <style jsx global>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                .animate-pulse {
                    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
                ::-webkit-scrollbar {
                    width: 6px;
                }
                ::-webkit-scrollbar-track {
                    background: transparent;
                }
                ::-webkit-scrollbar-thumb {
                    background: #CBD5E1;
                    border-radius: 10px;
                }
                ::-webkit-scrollbar-thumb:hover {
                    background: #94A3B8;
                }
            `}</style>
        </div>
    );
}
