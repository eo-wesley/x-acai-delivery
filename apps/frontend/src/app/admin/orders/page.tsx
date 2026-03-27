'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Printer } from 'lucide-react';

/* ─── Types ───────────────────────────────────────────────────────────── */
type OrderItem = { name?: string; menuItemId?: string; qty: number; notes?: string; unitPriceCents?: number; selected_options?: { groupName: string; optionName: string }[]; };
type Order = {
    id: string;
    customer_id: string;
    customer_name?: string;
    customer_phone?: string;
    customer_address?: string;
    address_text?: string;
    status: string;
    total_cents: number;
    subtotal_cents?: number;
    delivery_fee_cents?: number;
    payment_method?: string;
    payment_status?: string;
    notes?: string;
    created_at: string;
    items: OrderItem[];
};

/* ─── Constants ───────────────────────────────────────────────────────── */
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const STATUS_FLOW: Record<string, { next: string; label: string; emoji: string; color: string }> = {
    pending_payment: { next: 'pending', label: 'Aguardando', emoji: '⏳', color: 'yellow' },
    pending: { next: 'preparing', label: 'Pendente', emoji: '📋', color: 'yellow' },
    preparing: { next: 'delivering', label: 'Preparando', emoji: '🍳', color: 'blue' },
    delivering: { next: 'completed', label: 'Na Entrega', emoji: '🏍️', color: 'orange' },
    completed: { next: '', label: 'Concluído', emoji: '✅', color: 'green' },
    cancelled: { next: '', label: 'Cancelado', emoji: '❌', color: 'red' },
};

const STATUS_COLORS: Record<string, string> = {
    pending_payment: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    pending: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    preparing: 'bg-blue-50 text-blue-800 border-blue-200',
    delivering: 'bg-orange-50 text-orange-800 border-orange-200',
    completed: 'bg-green-50 text-green-800 border-green-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200',
};

const STATUS_LABEL_FILTER = ['all', 'pending', 'pending_payment', 'preparing', 'delivering', 'completed', 'cancelled'];

/* ─── Helpers ─────────────────────────────────────────────────────────── */
function ageminutes(created: string): number {
    return Math.floor((Date.now() - new Date(created).getTime()) / 60000);
}

function fmtTime(d: string) {
    return new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function fmtCurrency(cents: number) {
    return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
}

const handlePrintOrder = (order: Order) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsHtml = order.items.map(item => `
        <div style="border-bottom: 1px dashed #ccc; padding: 5px 0;">
            <div style="display: flex; justify-content: space-between;">
                <b>${item.qty}x ${item.name || item.menuItemId}</b>
                <span>${fmtCurrency((item.unitPriceCents || 0) * item.qty)}</span>
            </div>
            ${item.selected_options?.map(opt => `<div style="font-size: 10px; margin-left: 10px;">• ${opt.optionName}</div>`).join('') || ''}
            ${item.notes ? `<div style="font-size: 10px; color: #666;">Obs: ${item.notes}</div>` : ''}
        </div>
    `).join('');

    printWindow.document.write(`
        <html>
            <head>
                <title>Comanda #${order.id.split('-')[0].toUpperCase()}</title>
                <style>
                    body { font-family: 'Courier New', Courier, monospace; width: 80mm; padding: 10px; margin: 0; }
                    h2 { text-align: center; margin: 0; text-transform: uppercase; }
                    .header { text-align: center; font-size: 12px; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 5px; }
                    .footer { text-align: center; font-size: 12px; margin-top: 10px; border-top: 2px solid #000; padding-top: 5px; }
                    .total { font-size: 16px; font-weight: bold; text-align: right; margin-top: 10px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>X-AÇAÍ</h2>
                    <p>Pedido #${order.id.split('-')[0].toUpperCase()}</p>
                    <p>${new Date(order.created_at).toLocaleString('pt-BR')}</p>
                </div>
                <div>
                    <b>CLIENTE:</b> ${order.customer_name || 'N/A'}<br>
                    <b>TEL:</b> ${order.customer_phone || 'N/A'}<br>
                    <b>ENDEREÇO:</b> ${order.address_text || order.customer_address || 'Retirada'}
                </div>
                <div style="margin-top: 10px; border-top: 1px solid #000; padding-top: 5px;">
                    ${itemsHtml}
                </div>
                <div class="total">
                    TOTAL: ${fmtCurrency(order.total_cents)}
                </div>
                <div class="footer">
                    <p>OBRIGADO PELA PREFERÊNCIA!</p>
                </div>
                <script>window.onload = () => { window.print(); window.close(); };</script>
            </body>
        </html>
    `);
    printWindow.document.close();
};

/* ─── Summary Card ────────────────────────────────────────────────────── */
function SummaryBar({ orders }: { orders: Order[] }) {
    const today = new Date().toDateString();
    const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === today);
    const stats = [
        { label: 'Novos', count: orders.filter(o => ['pending', 'pending_payment'].includes(o.status)).length, color: 'text-yellow-600', bg: 'bg-yellow-50' },
        { label: 'Preparando', count: orders.filter(o => o.status === 'preparing').length, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Na Entrega', count: orders.filter(o => o.status === 'delivering').length, color: 'text-orange-600', bg: 'bg-orange-50' },
        { label: 'Concluídos', count: todayOrders.filter(o => o.status === 'completed').length, color: 'text-green-600', bg: 'bg-green-50' },
    ];

    const revToday = todayOrders
        .filter(o => o.status === 'completed')
        .reduce((acc, o) => acc + o.total_cents, 0);

    return (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
            {stats.map(s => (
                <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center border border-opacity-30`}>
                    <div className={`text-2xl font-black ${s.color}`}>{s.count}</div>
                    <div className="text-xs text-gray-600 mt-0.5 font-medium">{s.label}</div>
                </div>
            ))}
            <div className="bg-purple-50 rounded-xl p-3 text-center border border-purple-100">
                <div className="text-lg font-black text-purple-700">{fmtCurrency(revToday)}</div>
                <div className="text-xs text-gray-600 mt-0.5 font-medium">Faturado hoje</div>
            </div>
        </div>
    );
}

/* ─── Order Card ──────────────────────────────────────────────────────── */
function OrderCard({ order, onStatusChange, onAutoDispatch }: { order: Order; onStatusChange: (id: string, s: string) => void; onAutoDispatch: (id: string) => void }) {

    const age = ageminutes(order.created_at);
    const overdue = age > 30 && !['completed', 'cancelled'].includes(order.status);
    const info = STATUS_FLOW[order.status];
    const colorClass = STATUS_COLORS[order.status] || 'bg-gray-50 text-gray-700 border-gray-200';

    return (
        <div className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${overdue ? 'ring-2 ring-red-400' : ''}`}>
            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-2.5 border-b ${colorClass}`}>
                <div className="flex items-center gap-2">
                    <span className="text-lg">{info?.emoji || '📦'}</span>
                    <div>
                        <span className="font-black text-sm">#{order.id.split('-')[0].toUpperCase()}</span>
                        <span className="ml-2 text-xs opacity-70">{fmtTime(order.created_at)}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {overdue && (
                        <span className="bg-red-500 text-white text-xs font-black px-2 py-0.5 rounded-full animate-pulse">
                            ⏰ {age}min
                        </span>
                    )}
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${colorClass}`}>
                        {info?.label || order.status}
                    </span>
                </div>
            </div>

            {/* Body */}
            <div className="p-4">
                {/* Customer */}
                <div className="mb-3 flex flex-col gap-0.5">
                    <p className="font-bold text-gray-800 text-sm">
                        👤 {order.customer_name || order.customer_id || '—'}
                        {order.customer_phone && (
                            <a href={`https://wa.me/55${order.customer_phone.replace(/\D/g, '')}`}
                                target="_blank" rel="noreferrer"
                                className="ml-2 text-green-600 hover:underline text-xs font-normal">
                                📱 {order.customer_phone}
                            </a>
                        )}
                    </p>
                    {(order.address_text || order.customer_address) && (
                        <p className="text-xs text-gray-500">📍 {order.address_text || order.customer_address}</p>
                    )}
                </div>

                {/* Items */}
                <div className="mb-3 space-y-2">
                    {order.items.map((item, i) => (
                        <div key={i} className="flex flex-col text-sm border-b border-gray-50 pb-1 last:border-0 last:pb-0">
                            <span className="text-gray-700">
                                <span className="font-bold">{item.qty}x</span> {item.name || item.menuItemId}
                                {item.notes && <span className="text-orange-500 ml-1 text-xs">({item.notes})</span>}
                            </span>
                            {item.selected_options && item.selected_options.length > 0 && (
                                <ul className="pl-5 text-xs text-gray-500 mt-1 list-none space-y-0.5 border-l-2 border-purple-100 ml-1">
                                    {item.selected_options.map((opt: any, idx: number) => (
                                        <li key={idx}>
                                            <span className="text-gray-400 mr-1">└</span> {opt.optionName} <span className="opacity-70">({opt.groupName})</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ))}
                    {order.notes && (
                        <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mt-1">
                            📝 {order.notes}
                        </p>
                    )}
                </div>

                {/* Footer row */}
                <div className="flex items-center justify-between flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
                    <div>
                        <span className="font-black text-purple-700 text-base">{fmtCurrency(order.total_cents)}</span>
                        {order.payment_method && (
                            <span className="ml-2 text-xs flex items-center gap-1 inline-flex">
                                <span className="text-gray-400">
                                    {order.payment_method === 'pix' ? '💸 PIX' : order.payment_method === 'card' ? '💳 Cartão' : '💵 Dinheiro'}
                                </span>
                                {order.status !== 'cancelled' && (
                                    order.payment_status === 'paid' 
                                      ? <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded text-[10px] font-bold">Pago</span> 
                                      : <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded text-[10px] font-bold">Pendente</span>
                                )}
                            </span>
                        )}
                    </div>
                    {/* Actions */}
                    <div className="flex gap-2 flex-wrap">
                        {info?.next && (
                            <button
                                onClick={() => onStatusChange(order.id, info.next)}
                                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition active:scale-95"
                            >
                                {info.next === 'preparing' ? '✅ Aceitar' :
                                    info.next === 'delivering' ? '🏍️ Sair p/ Entrega' :
                                        info.next === 'completed' ? '✅ Concluir' : `→ ${info.next}`}
                            </button>
                        )}
                        {order.status === 'preparing' && (
                            <button
                                onClick={() => onAutoDispatch(order.id)}
                                title="Despacho Automático (IA)"
                                className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition active:scale-95 flex items-center gap-1"
                            >
                                ⚡ Auto
                            </button>
                        )}
                        <button
                            onClick={() => handlePrintOrder(order)}
                            title="Imprimir Comanda"
                            className="border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm p-1.5 rounded-lg transition"
                        >
                            <Printer size={16} />
                        </button>
                        {!['cancelled', 'completed'].includes(order.status) && (
                            <button
                                onClick={() => onStatusChange(order.id, 'cancelled')}
                                className="border border-red-200 text-red-500 hover:bg-red-50 text-xs font-bold px-3 py-1.5 rounded-lg transition"
                            >
                                ✕ Cancelar
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Age helper
function ageminister(created: string): number { return Math.floor((Date.now() - new Date(created).getTime()) / 60000); }

/* ─── Main Page ───────────────────────────────────────────────────────── */
export default function AdminOrders() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
    const [newCount, setNewCount] = useState(0);
    const prevOrderIds = useRef<Set<string>>(new Set());

    const getToken = () => localStorage.getItem('admin_token') || '';
    const getSlug = () => localStorage.getItem('admin_slug') || 'default';

    const fetchOrders = useCallback(async () => {
        try {
            const res = await fetch(`${API}/api/admin/orders?slug=${getSlug()}`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            if (!res.ok) return;
            const data: Order[] = (await res.json()).map((o: any) => ({
                ...o,
                items: typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []),
            }));

            // Detect genuinely new orders
            const newIds = data.filter(o => !prevOrderIds.current.has(o.id)).map(o => o.id);
            if (newIds.length > 0 && prevOrderIds.current.size > 0) {
                setNewCount(n => n + newIds.length);
            }
            data.forEach(o => prevOrderIds.current.add(o.id));

            setOrders(data);
            setLastRefresh(new Date());
        } catch { }
        finally { setLoading(false); }
    }, []);

    useEffect(() => {
        fetchOrders();
        const iv = setInterval(fetchOrders, 5000);
        const onTenantChanged = () => fetchOrders();
        window.addEventListener('tenant_changed', onTenantChanged);
        return () => { clearInterval(iv); window.removeEventListener('tenant_changed', onTenantChanged); };
    }, [fetchOrders]);

    const updateStatus = async (orderId: string, newStatus: string) => {
        // Optimistic update first
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        try {
            await fetch(`${API}/api/admin/orders/${orderId}/status`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
        } catch (e) {
            // Revert on failure
            fetchOrders();
        }
    };

    const handleAutoDispatch = async (orderId: string) => {
        try {
            const res = await fetch(`${API}/api/admin/driver-orders/auto?slug=${getSlug()}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId }),
            });
            const data = await res.json();
            if (res.ok) {
                alert(`🚀 Despachado para ${data.driver}!\nEstimativa: ${data.estimates.distanceKm}km em ${data.estimates.estimatedMinutes}min.`);
                fetchOrders();
            } else {
                alert(`❌ Erro: ${data.error}`);
            }
        } catch (e) {
            alert('Erro ao tentar despacho automático.');
        }
    };

    const displayed = filter === 'all'
        ? orders
        : orders.filter(o => o.status === filter);

    const FILTER_LABELS: Record<string, string> = {
        all: 'Todos', pending: 'Pendentes', pending_payment: 'Aguard. Pgto',
        preparing: 'Preparando', delivering: 'Na Entrega', completed: 'Concluídos', cancelled: 'Cancelados',
    };

    return (
        <div>
            {/* Page Header */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                    <h1 className="text-2xl font-black text-gray-800">Pedidos</h1>
                    {lastRefresh && (
                        <p className="text-xs text-gray-400 mt-0.5">
                            Atualizado {lastRefresh.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} · auto a cada 5s
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {newCount > 0 && (
                        <button
                            onClick={() => setNewCount(0)}
                            className="bg-red-500 text-white text-xs font-black px-3 py-1.5 rounded-full animate-bounce"
                        >
                            🔔 +{newCount} novo{newCount > 1 ? 's' : ''}
                        </button>
                    )}
                    <span className="flex items-center gap-1.5 text-xs text-green-600 font-semibold bg-green-50 px-3 py-1.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                        Live
                    </span>
                </div>
            </div>

            {/* Summary */}
            <SummaryBar orders={orders} />

            {/* Filters */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                {STATUS_LABEL_FILTER.map(s => {
                    const count = s === 'all' ? orders.length : orders.filter(o => o.status === s).length;
                    return (
                        <button
                            key={s}
                            onClick={() => setFilter(s)}
                            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold border transition flex items-center gap-1 ${filter === s ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                        >
                            {FILTER_LABELS[s]}
                            <span className={`inline-block min-w-[18px] h-[18px] text-center leading-[18px] rounded-full text-[10px] ${filter === s ? 'bg-purple-500' : 'bg-gray-100'}`}>{count}</span>
                        </button>
                    );
                })}
            </div>

            {/* Orders Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />)}
                </div>
            ) : displayed.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <div className="text-5xl mb-3">📭</div>
                    <p className="font-semibold">Nenhum pedido {filter !== 'all' ? `com status "${FILTER_LABELS[filter]}"` : 'ainda'}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {displayed.map(order => (
                        <OrderCard key={order.id} order={order} onStatusChange={updateStatus} onAutoDispatch={handleAutoDispatch} />
                    ))}
                </div>
            )}
        </div>
    );
}
