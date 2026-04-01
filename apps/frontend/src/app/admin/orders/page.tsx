'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Printer } from 'lucide-react';

type SelectedOption = {
    groupName: string;
    optionName: string;
};

type OrderItem = {
    name?: string;
    menuItemId?: string;
    qty: number;
    notes?: string;
    unitPriceCents?: number;
    selected_options?: SelectedOption[];
};

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

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const NEW_ORDER_STATUSES = ['pending_payment', 'pending', 'accepted', 'confirmed'];
const FINAL_ORDER_STATUSES = ['completed', 'cancelled'];
const STATUS_LABEL_FILTER = ['all', 'pending_payment', 'pending', 'accepted', 'confirmed', 'preparing', 'delivering', 'completed', 'cancelled'];

const STATUS_FLOW: Record<string, { next: string; label: string; badge: string }> = {
    pending_payment: { next: '', label: 'Aguardando PIX', badge: 'PIX' },
    pending: { next: 'preparing', label: 'Pendente', badge: 'Novo' },
    accepted: { next: 'preparing', label: 'Aceito', badge: 'Pago' },
    confirmed: { next: 'preparing', label: 'Confirmado', badge: 'Pago' },
    preparing: { next: 'delivering', label: 'Preparando', badge: 'Cozinha' },
    delivering: { next: 'completed', label: 'Na entrega', badge: 'Rota' },
    completed: { next: '', label: 'Concluido', badge: 'Finalizado' },
    cancelled: { next: '', label: 'Cancelado', badge: 'Cancelado' },
};

const STATUS_COLORS: Record<string, string> = {
    pending_payment: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    pending: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    accepted: 'bg-sky-50 text-sky-800 border-sky-200',
    confirmed: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    preparing: 'bg-blue-50 text-blue-800 border-blue-200',
    delivering: 'bg-orange-50 text-orange-800 border-orange-200',
    completed: 'bg-green-50 text-green-800 border-green-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200',
};

const FILTER_LABELS: Record<string, string> = {
    all: 'Todos',
    pending_payment: 'Aguard. PIX',
    pending: 'Pendentes',
    accepted: 'Aceitos',
    confirmed: 'Confirmados',
    preparing: 'Preparando',
    delivering: 'Na entrega',
    completed: 'Concluidos',
    cancelled: 'Cancelados',
};

function ageminutes(created: string): number {
    return Math.floor((Date.now() - new Date(created).getTime()) / 60000);
}

function fmtTime(value: string) {
    return new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function fmtCurrency(cents: number) {
    return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
}

function getNextActionLabel(status: string, nextStatus: string) {
    if (nextStatus === 'preparing') {
        return NEW_ORDER_STATUSES.includes(status) ? 'Iniciar preparo' : 'Preparar';
    }
    if (nextStatus === 'delivering') return 'Sair para entrega';
    if (nextStatus === 'completed') return 'Concluir pedido';
    return `Atualizar para ${nextStatus}`;
}

function handlePrintOrder(order: Order) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsHtml = order.items.map((item) => `
        <div style="border-bottom: 1px dashed #ccc; padding: 5px 0;">
            <div style="display: flex; justify-content: space-between;">
                <b>${item.qty}x ${item.name || item.menuItemId}</b>
                <span>${fmtCurrency((item.unitPriceCents || 0) * item.qty)}</span>
            </div>
            ${(item.selected_options || []).map((opt) => `<div style="font-size: 10px; margin-left: 10px;">- ${opt.optionName}</div>`).join('')}
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
                    <h2>X-ACAI</h2>
                    <p>Pedido #${order.id.split('-')[0].toUpperCase()}</p>
                    <p>${new Date(order.created_at).toLocaleString('pt-BR')}</p>
                </div>
                <div>
                    <b>CLIENTE:</b> ${order.customer_name || 'N/A'}<br>
                    <b>TEL:</b> ${order.customer_phone || 'N/A'}<br>
                    <b>ENDERECO:</b> ${order.address_text || order.customer_address || 'Retirada'}
                </div>
                <div style="margin-top: 10px; border-top: 1px solid #000; padding-top: 5px;">
                    ${itemsHtml}
                </div>
                <div class="total">
                    TOTAL: ${fmtCurrency(order.total_cents)}
                </div>
                <div class="footer">
                    <p>OBRIGADO PELA PREFERENCIA</p>
                </div>
                <script>window.onload = () => { window.print(); window.close(); };</script>
            </body>
        </html>
    `);
    printWindow.document.close();
}

function SummaryBar({ orders }: { orders: Order[] }) {
    const today = new Date().toDateString();
    const todayOrders = orders.filter((order) => new Date(order.created_at).toDateString() === today);
    const stats = [
        { label: 'Novos', count: orders.filter((order) => NEW_ORDER_STATUSES.includes(order.status)).length, color: 'text-yellow-600', bg: 'bg-yellow-50' },
        { label: 'Preparando', count: orders.filter((order) => order.status === 'preparing').length, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Na entrega', count: orders.filter((order) => order.status === 'delivering').length, color: 'text-orange-600', bg: 'bg-orange-50' },
        { label: 'Concluidos', count: todayOrders.filter((order) => order.status === 'completed').length, color: 'text-green-600', bg: 'bg-green-50' },
    ];

    const revToday = todayOrders
        .filter((order) => order.status === 'completed')
        .reduce((acc, order) => acc + order.total_cents, 0);

    return (
        <div className="grid grid-cols-2 gap-3 mb-5 md:grid-cols-5">
            {stats.map((stat) => (
                <div key={stat.label} className={`${stat.bg} rounded-xl border border-opacity-30 p-3 text-center`}>
                    <div className={`text-2xl font-black ${stat.color}`}>{stat.count}</div>
                    <div className="mt-0.5 text-xs font-medium text-gray-600">{stat.label}</div>
                </div>
            ))}
            <div className="rounded-xl border border-purple-100 bg-purple-50 p-3 text-center">
                <div className="text-lg font-black text-purple-700">{fmtCurrency(revToday)}</div>
                <div className="mt-0.5 text-xs font-medium text-gray-600">Faturado hoje</div>
            </div>
        </div>
    );
}

function OrderCard({
    order,
    onStatusChange,
    onAutoDispatch,
}: {
    order: Order;
    onStatusChange: (id: string, status: string) => void;
    onAutoDispatch: (id: string) => void;
}) {
    const age = ageminutes(order.created_at);
    const overdue = age > 30 && !FINAL_ORDER_STATUSES.includes(order.status);
    const info = STATUS_FLOW[order.status];
    const colorClass = STATUS_COLORS[order.status] || 'bg-gray-50 text-gray-700 border-gray-200';

    return (
        <div className={`overflow-hidden rounded-xl border bg-white shadow-sm transition-all ${overdue ? 'ring-2 ring-red-400' : ''}`}>
            <div className={`flex items-center justify-between border-b px-4 py-2.5 ${colorClass}`}>
                <div className="flex items-center gap-2">
                    <div>
                        <span className="text-sm font-black">#{order.id.split('-')[0].toUpperCase()}</span>
                        <span className="ml-2 text-xs opacity-70">{fmtTime(order.created_at)}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {overdue && (
                        <span className="animate-pulse rounded-full bg-red-500 px-2 py-0.5 text-xs font-black text-white">
                            {age}min
                        </span>
                    )}
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${colorClass}`}>
                        {info?.label || order.status}
                    </span>
                </div>
            </div>

            <div className="p-4">
                <div className="mb-3 flex flex-col gap-0.5">
                    <p className="text-sm font-bold text-gray-800">
                        {order.customer_name || order.customer_id || 'Cliente'}
                        {order.customer_phone && (
                            <a
                                href={`https://wa.me/55${order.customer_phone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="ml-2 text-xs font-normal text-green-600 hover:underline"
                            >
                                {order.customer_phone}
                            </a>
                        )}
                    </p>
                    {(order.address_text || order.customer_address) && (
                        <p className="text-xs text-gray-500">{order.address_text || order.customer_address}</p>
                    )}
                </div>

                <div className="mb-3 space-y-2">
                    {order.items.map((item, index) => (
                        <div key={`${order.id}-${index}`} className="flex flex-col border-b border-gray-50 pb-1 text-sm last:border-0 last:pb-0">
                            <span className="text-gray-700">
                                <span className="font-bold">{item.qty}x</span> {item.name || item.menuItemId}
                                {item.notes && <span className="ml-1 text-xs text-orange-500">({item.notes})</span>}
                            </span>
                            {item.selected_options && item.selected_options.length > 0 && (
                                <ul className="ml-1 mt-1 list-none space-y-0.5 border-l-2 border-purple-100 pl-5 text-xs text-gray-500">
                                    {item.selected_options.map((option, optionIndex) => (
                                        <li key={`${order.id}-${index}-${optionIndex}`}>
                                            <span className="mr-1 text-gray-400">-</span>
                                            {option.optionName}
                                            <span className="opacity-70"> ({option.groupName})</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ))}
                    {order.notes && (
                        <p className="mt-1 rounded bg-amber-50 px-2 py-1 text-xs text-amber-700">
                            {order.notes}
                        </p>
                    )}
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
                    <div>
                        <span className="text-base font-black text-purple-700">{fmtCurrency(order.total_cents)}</span>
                        {order.payment_method && (
                            <span className="ml-2 inline-flex items-center gap-1 text-xs">
                                <span className="text-gray-400 uppercase">{order.payment_method}</span>
                                {order.status !== 'cancelled' && (
                                    order.payment_status === 'paid'
                                        ? <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">Pago</span>
                                        : <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">{info?.badge || 'Pendente'}</span>
                                )}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {info?.next && (
                            <button
                                onClick={() => onStatusChange(order.id, info.next)}
                                className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-purple-700 active:scale-95"
                            >
                                {getNextActionLabel(order.status, info.next)}
                            </button>
                        )}
                        {order.status === 'preparing' && (
                            <button
                                onClick={() => onAutoDispatch(order.id)}
                                title="Despacho automatico"
                                className="flex items-center gap-1 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-orange-600 active:scale-95"
                            >
                                Auto
                            </button>
                        )}
                        <button
                            onClick={() => handlePrintOrder(order)}
                            title="Imprimir comanda"
                            className="rounded-lg border border-gray-200 p-1.5 text-sm text-gray-600 transition hover:bg-gray-50"
                        >
                            <Printer size={16} />
                        </button>
                        {!FINAL_ORDER_STATUSES.includes(order.status) && (
                            <button
                                onClick={() => onStatusChange(order.id, 'cancelled')}
                                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-500 transition hover:bg-red-50"
                            >
                                Cancelar
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

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
            const response = await fetch(`${API}/api/admin/orders?slug=${getSlug()}`, {
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            if (!response.ok) return;

            const data: Order[] = (await response.json()).map((order: any) => ({
                ...order,
                items: typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []),
            }));

            const newIds = data.filter((order) => !prevOrderIds.current.has(order.id)).map((order) => order.id);
            if (newIds.length > 0 && prevOrderIds.current.size > 0) {
                setNewCount((current) => current + newIds.length);
            }
            data.forEach((order) => prevOrderIds.current.add(order.id));

            setOrders(data);
            setLastRefresh(new Date());
        } catch {
            // Keep current snapshot on transient failures.
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOrders();
        const intervalId = setInterval(fetchOrders, 5000);
        const onTenantChanged = () => fetchOrders();
        window.addEventListener('tenant_changed', onTenantChanged);
        return () => {
            clearInterval(intervalId);
            window.removeEventListener('tenant_changed', onTenantChanged);
        };
    }, [fetchOrders]);

    const updateStatus = async (orderId: string, newStatus: string) => {
        setOrders((current) => current.map((order) => (order.id === orderId ? { ...order, status: newStatus } : order)));
        try {
            await fetch(`${API}/api/admin/orders/${orderId}/status`, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${getToken()}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: newStatus }),
            });
        } catch {
            fetchOrders();
        }
    };

    const handleAutoDispatch = async (orderId: string) => {
        try {
            const response = await fetch(`${API}/api/admin/driver-orders/auto?slug=${getSlug()}`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${getToken()}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ orderId }),
            });
            const data = await response.json();
            if (response.ok) {
                alert(`Despachado para ${data.driver}. Estimativa: ${data.estimates.distanceKm}km em ${data.estimates.estimatedMinutes}min.`);
                fetchOrders();
                return;
            }
            alert(`Erro: ${data.error}`);
        } catch {
            alert('Erro ao tentar despacho automatico.');
        }
    };

    const displayed = filter === 'all'
        ? orders
        : orders.filter((order) => order.status === filter);

    return (
        <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h1 className="text-2xl font-black text-gray-800">Pedidos</h1>
                    {lastRefresh && (
                        <p className="mt-0.5 text-xs text-gray-400">
                            Atualizado {lastRefresh.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} · auto a cada 5s
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {newCount > 0 && (
                        <button
                            onClick={() => setNewCount(0)}
                            className="animate-bounce rounded-full bg-red-500 px-3 py-1.5 text-xs font-black text-white"
                        >
                            +{newCount} novo{newCount > 1 ? 's' : ''}
                        </button>
                    )}
                    <span className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-600">
                        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                        Live
                    </span>
                </div>
            </div>

            <SummaryBar orders={orders} />

            <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
                {STATUS_LABEL_FILTER.map((status) => {
                    const count = status === 'all' ? orders.length : orders.filter((order) => order.status === status).length;
                    return (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                                filter === status
                                    ? 'border-purple-600 bg-purple-600 text-white'
                                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                            }`}
                        >
                            <span className="whitespace-nowrap">{FILTER_LABELS[status]}</span>
                            <span className={`inline-block h-[18px] min-w-[18px] rounded-full text-center text-[10px] leading-[18px] ${filter === status ? 'bg-purple-500' : 'bg-gray-100'}`}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {loading ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {[1, 2, 3].map((value) => (
                        <div key={value} className="h-48 animate-pulse rounded-xl bg-gray-100" />
                    ))}
                </div>
            ) : displayed.length === 0 ? (
                <div className="py-16 text-center text-gray-400">
                    <div className="mb-3 text-5xl">-</div>
                    <p className="font-semibold">
                        Nenhum pedido {filter !== 'all' ? `com status "${FILTER_LABELS[filter]}"` : 'ainda'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {displayed.map((order) => (
                        <OrderCard
                            key={order.id}
                            order={order}
                            onStatusChange={updateStatus}
                            onAutoDispatch={handleAutoDispatch}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
