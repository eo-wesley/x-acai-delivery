'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
function getToken() { return localStorage.getItem('admin_token') || ''; }
function getSlug() { return localStorage.getItem('admin_slug') || 'default'; }

type Metrics = {
    today: { orders: number; revenue_cents: number };
    week: { orders: number; revenue_cents: number };
    month: { orders: number; revenue_cents: number };
    active_orders: number;
    avg_ticket_cents: number;
    orders_by_status: { status: string; count: number }[];
    top_products: { menuItemId?: string; name: string; qty: number }[];
    rating: { avg: number | null; total: number };
};

type StoreInfo = { store_status: string; temp_close_reason?: string };

const R = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;

const STATUS_LABELS: Record<string, string> = {
    pending_payment: 'Aguardando pagamento', accepted: 'Aceito',
    preparing: 'Preparando', delivering: 'Em entrega',
    completed: 'Concluído', delivered: 'Entregue', cancelled: 'Cancelado',
};

const STORE_STATUS_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
    open: { label: 'Aberta', color: 'bg-green-100 text-green-700 border-green-200', emoji: '🟢' },
    closed: { label: 'Fechada', color: 'bg-red-100 text-red-700 border-red-200', emoji: '🔴' },
    paused: { label: 'Pausada', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', emoji: '🟡' },
    busy: { label: 'Lotada', color: 'bg-orange-100 text-orange-700 border-orange-200', emoji: '🟠' },
};

export default function AdminDashboard() {
    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [store, setStore] = useState<StoreInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [statusSaving, setStatusSaving] = useState(false);

    const slug = typeof window !== 'undefined' ? getSlug() : 'default';

    const load = useCallback(async () => {
        const headers = { Authorization: `Bearer ${getToken()}` };
        const [mRes, sRes] = await Promise.allSettled([
            fetch(`${API}/api/admin/metrics?slug=${getSlug()}`, { headers }),
            fetch(`${API}/api/admin/profile?slug=${getSlug()}`, { headers }),
        ]);
        if (mRes.status === 'fulfilled' && mRes.value.ok) setMetrics(await mRes.value.json());
        if (sRes.status === 'fulfilled' && sRes.value.ok) setStore(await sRes.value.json());
        setLoading(false);
    }, []);

    useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

    const setStoreStatus = async (status: string) => {
        setStatusSaving(true);
        await fetch(`${API}/api/admin/store?slug=${getSlug()}`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ store_status: status }),
        });
        await load();
        setStatusSaving(false);
    };

    if (loading) return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
    );

    const stCfg = STORE_STATUS_CONFIG[store?.store_status || 'open'];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="text-2xl font-black text-gray-800">📊 Dashboard</h1>

                {/* Store Status Toggle */}
                <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border ${stCfg.color} font-bold`}>
                    <span>{stCfg.emoji} {stCfg.label}</span>
                    <div className="flex gap-1">
                        {['open', 'closed', 'paused', 'busy'].map(s => (
                            <button key={s}
                                disabled={statusSaving || store?.store_status === s}
                                onClick={() => setStoreStatus(s)}
                                className={`text-xs px-2 py-1 rounded-lg border transition font-bold disabled:opacity-40 ${store?.store_status === s
                                    ? 'bg-white border-current shadow'
                                    : 'bg-transparent hover:bg-white/50'
                                    }`}>
                                {STORE_STATUS_CONFIG[s].emoji}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                    <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Pedidos Hoje</div>
                    <div className="text-3xl font-black text-purple-700">{metrics?.today.orders ?? 0}</div>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                    <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Receita Hoje</div>
                    <div className="text-2xl font-black text-green-600">{R(metrics?.today.revenue_cents ?? 0)}</div>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                    <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Pedidos Semana</div>
                    <div className="text-3xl font-black text-gray-800">{metrics?.week.orders ?? 0}</div>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                    <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Receita Semana</div>
                    <div className="text-2xl font-black text-green-600">{R(metrics?.week.revenue_cents ?? 0)}</div>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                    <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Em Andamento</div>
                    <div className="text-3xl font-black text-orange-500">{metrics?.active_orders ?? 0}</div>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                    <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Ticket Médio (mês)</div>
                    <div className="text-2xl font-black text-blue-600">{R(metrics?.avg_ticket_cents ?? 0)}</div>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                    <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Pedidos Mês</div>
                    <div className="text-3xl font-black text-gray-800">{metrics?.month.orders ?? 0}</div>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                    <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Receita Mês</div>
                    <div className="text-2xl font-black text-green-700">{R(metrics?.month.revenue_cents ?? 0)}</div>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm col-span-2">
                    <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Avaliação Média</div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-yellow-500">{metrics?.rating.avg ?? '–'}</span>
                        <span className="text-yellow-400 text-xl">⭐</span>
                        <span className="text-xs text-gray-400">({metrics?.rating.total ?? 0} avaliações)</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Orders by Status */}
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                    <h3 className="font-black text-gray-700 mb-3 text-sm uppercase tracking-widest">Pedidos por Status</h3>
                    {(metrics?.orders_by_status || []).length === 0
                        ? <p className="text-gray-400 text-sm">Sem pedidos ainda.</p>
                        : <div className="space-y-2">
                            {metrics!.orders_by_status.map(s => (
                                <div key={s.status} className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">{STATUS_LABELS[s.status] || s.status}</span>
                                    <span className="font-black text-gray-800 bg-gray-100 px-2 py-0.5 rounded-lg text-sm">{s.count}</span>
                                </div>
                            ))}
                        </div>
                    }
                </div>

                {/* Top Products */}
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                    <h3 className="font-black text-gray-700 mb-3 text-sm uppercase tracking-widest">Mais Vendidos (mês)</h3>
                    {(metrics?.top_products || []).length === 0
                        ? <p className="text-gray-400 text-sm">Sem dados ainda.</p>
                        : <div className="space-y-2">
                            {metrics!.top_products.map((p, i) => (
                                <div key={p.menuItemId || i} className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600 truncate flex-1">{i + 1}. {p.name}</span>
                                    <span className="font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg text-sm ml-2">{p.qty}x</span>
                                </div>
                            ))}
                        </div>
                    }
                </div>
            </div>

            {/* Quick links */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { href: '/admin/orders', icon: '📦', label: 'Ver Pedidos' },
                    { href: '/admin/menu', icon: '🍔', label: 'Cardápio' },
                    { href: '/admin/coupons', icon: '🎟️', label: 'Cupons' },
                    { href: '/admin/settings', icon: '⚙️', label: 'Configurações' },
                ].map(l => (
                    <Link key={l.href} href={l.href}
                        className="bg-white border border-gray-100 rounded-xl p-4 flex flex-col items-center gap-2 shadow-sm hover:shadow-md transition hover:border-purple-200">
                        <span className="text-3xl">{l.icon}</span>
                        <span className="text-xs font-bold text-gray-600">{l.label}</span>
                    </Link>
                ))}
            </div>
        </div>
    );
}
