'use client';

import { useState, useEffect } from 'react';
import {
    Truck,
    MapPin,
    Clock,
    CheckCircle,
    AlertCircle,
    Users,
    Package,
    Navigation,
    MoreHorizontal,
    Play,
    Pause,
    ChevronRight,
    LayoutDashboard
} from 'lucide-react';

/* 
  Simulação de dados de mapa para o "Logistics Hub"
*/
const MOCK_MAP_POINTS = [
    { id: 1, type: 'driver', name: 'João Silva', lat: 20, lng: 30, status: 'delivering' },
    { id: 2, type: 'driver', name: 'Maria Souza', lat: 60, lng: 45, status: 'available' },
    { id: 3, type: 'order', id_order: 'ORD-123', lat: 40, lng: 70 },
    { id: 4, type: 'order', id_order: 'ORD-124', lat: 80, lng: 20 },
];

export default function LogisticsHubPage() {
    const [stats, setStats] = useState({
        total_drivers: 0,
        active_drivers: 0,
        delivering_now: 0,
        pending_orders: 0
    });
    const [drivers, setDrivers] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [batchingMode, setBatchingMode] = useState(false);

    useEffect(() => {
        fetchOverview();

        // SSE Real-time Updates for Admin
        const sseUrl = `${process.env.NEXT_PUBLIC_API_URL || ''}/api/logistics/track/admin/stream`;
        const eventSource = new EventSource(sseUrl);

        eventSource.onmessage = (event) => {
            try {
                if (event.data === ': keepalive') return;
                const update = JSON.parse(event.data);

                if (update.type === 'location') {
                    // Update driver location in the drivers list or map
                    setDrivers(prev => prev.map(d =>
                        d.id === update.driverId
                            ? { ...d, latitude: update.latitude, longitude: update.longitude, last_update: new Date().toISOString() }
                            : d
                    ));
                } else if (update.type === 'status') {
                    // Refresh overview if an order status changes (more reliable than manual state patching for complex stats)
                    fetchOverview();
                }
            } catch (e) {
                console.error('SSE data parse error:', e);
            }
        };

        eventSource.onerror = (err) => {
            console.error('SSE Connection error:', err);
            eventSource.close();
        };

        return () => {
            eventSource.close();
        };
    }, []);

    const fetchOverview = async () => {
        try {
            const res = await fetch('/api/admin/logistics/overview');
            const data = await res.json();
            if (data.stats) {
                setStats(data.stats);
                setDrivers(data.drivers || []);
                setOrders(data.orders || []);
            }
        } catch (error) {
            console.error('Failed to fetch logistics overview', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBatchAssign = async (driverId: string) => {
        if (selectedOrders.length === 0) return;

        try {
            const res = await fetch('/api/admin/logistics/batch-assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ driverId, orderIds: selectedOrders })
            });
            if (res.ok) {
                setSelectedOrders([]);
                setBatchingMode(false);
                fetchOverview();
                alert(`✅ ${selectedOrders.length} pedidos despachados com sucesso!`);
            }
        } catch (error) {
            alert('Falha ao despachar pedidos em lote.');
        }
    };

    const toggleOrderSelection = (id: string) => {
        setSelectedOrders(prev =>
            prev.includes(id) ? prev.filter(oid => oid !== id) : [...prev, id]
        );
    };

    return (
        <div className="p-6 bg-[#f8fafc] min-h-screen">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-black text-[#1e293b] flex items-center gap-2">
                        <Navigation className="text-purple-600" size={28} />
                        Logística 2.0
                    </h1>
                    <p className="text-slate-500 text-sm">Monitoramento de frota e despacho inteligente em tempo real</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setBatchingMode(!batchingMode)}
                        className={`px-4 py-2 rounded-xl font-bold text-sm transition ${batchingMode ? 'bg-purple-100 text-purple-700 ring-2 ring-purple-600' : 'bg-white text-slate-700 shadow-sm border border-slate-200'}`}
                    >
                        {batchingMode ? 'Ativado: Seleção em Lote' : 'Modo Logística em Lote'}
                    </button>
                    <button onClick={fetchOverview} className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 transition">
                        <Clock size={20} className="text-slate-500" />
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                {[
                    { label: 'Total Entregadores', value: stats.total_drivers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Online agora', value: stats.active_drivers, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Em Rota', value: stats.delivering_now, icon: Truck, color: 'text-purple-600', bg: 'bg-purple-50' },
                    { label: 'Aguardando Despacho', value: stats.pending_orders, icon: Package, color: 'text-amber-600', bg: 'bg-amber-50' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                            <stat.icon size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                            <p className="text-2xl font-black text-slate-800">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Simulated Map View */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-[#1e293b] rounded-3xl overflow-hidden shadow-xl aspect-[16/9] relative group border-4 border-white">
                        {/* Map Grid Pattern */}
                        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="text-slate-500 text-xs font-bold tracking-[10px] uppercase opacity-20">Live Fleet View (Simulation)</span>
                        </div>

                        {/* Mock Map Points */}
                        {MOCK_MAP_POINTS.map(point => (
                            <div
                                key={point.id}
                                className="absolute transition-all duration-1000 group-hover:scale-110 cursor-pointer"
                                style={{ top: `${point.lat}%`, left: `${point.lng}%` }}
                            >
                                <div className={`relative flex items-center justify-center w-10 h-10 rounded-full shadow-lg border-2 border-white ${point.type === 'driver' ? (point.status === 'delivering' ? 'bg-purple-600' : 'bg-emerald-500') : 'bg-amber-500'}`}>
                                    {point.type === 'driver' ? <Truck size={18} className="text-white" /> : <MapPin size={18} className="text-white" />}

                                    {/* Tooltip */}
                                    <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-white px-2 py-1 rounded text-[10px] font-bold shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition">
                                        {point.name || point.id_order}
                                    </div>

                                    {/* Pulse for delivering */}
                                    {point.status === 'delivering' && (
                                        <div className="absolute inset-0 rounded-full bg-purple-600 animate-ping opacity-25" />
                                    )}
                                </div>
                            </div>
                        ))}

                        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur p-3 rounded-2xl shadow-lg flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-700">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" /> Disponível
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-700">
                                <div className="w-2 h-2 rounded-full bg-purple-600" /> Em Rota
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-700">
                                <div className="w-2 h-2 rounded-full bg-amber-500" /> Destino (Pedido)
                            </div>
                        </div>
                    </div>

                    {/* Pending Orders List */}
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                            <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase tracking-wide text-sm">
                                <Package className="text-amber-500" size={18} />
                                Pedidos Aguardando Despacho
                            </h3>
                            {batchingMode && (
                                <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                                    {selectedOrders.length} Selecionados
                                </span>
                            )}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                                    <tr>
                                        {batchingMode && <th className="px-6 py-4 w-10"></th>}
                                        <th className="px-6 py-4">ID / Cliente</th>
                                        <th className="px-6 py-4 text-center">Status</th>
                                        <th className="px-6 py-4">Tempo</th>
                                        <th className="px-6 py-4">Valor</th>
                                        <th className="px-6 py-4 text-right">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {orders.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">Nenhum pedido pronto para despacho.</td>
                                        </tr>
                                    ) : orders.map(order => (
                                        <tr
                                            key={order.id}
                                            className={`hover:bg-slate-50 transition cursor-pointer ${selectedOrders.includes(order.id) ? 'bg-purple-50/50' : ''}`}
                                            onClick={() => batchingMode && toggleOrderSelection(order.id)}
                                        >
                                            {batchingMode && (
                                                <td className="px-6 py-4">
                                                    <div className={`w-5 h-5 rounded border-2 transition flex items-center justify-center ${selectedOrders.includes(order.id) ? 'bg-purple-600 border-purple-600 text-white' : 'border-slate-200 bg-white'}`}>
                                                        {selectedOrders.includes(order.id) && <CheckCircle size={12} />}
                                                    </div>
                                                </td>
                                            )}
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-700">#{order.id.slice(-4)}</div>
                                                <div className="text-xs text-slate-400">{order.customer_name}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${order.status === 'ready' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {order.status === 'ready' ? 'Pronto' : 'Preparando'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1 text-slate-500 text-xs">
                                                    <Clock size={12} />
                                                    {Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000)} min
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-slate-700 text-sm">
                                                R$ {(order.total_cents / 100).toFixed(2).replace('.', ',')}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="p-2 hover:bg-slate-200 rounded-lg text-slate-400 transition">
                                                    <MoreHorizontal size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Active Drivers Column */}
                <div className="space-y-6">
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full">
                        <div className="p-6 border-b border-slate-50">
                            <h3 className="font-black text-slate-800 flex items-center justify-between uppercase tracking-wide text-sm">
                                <div className="flex items-center gap-2">
                                    <Users className="text-blue-500" size={18} />
                                    Frota Ativa
                                </div>
                                <span className="text-[10px] text-slate-400">{drivers.length} TOTAL</span>
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {drivers.length === 0 ? (
                                <div className="text-center py-10 opacity-40 grayscale flex flex-col items-center gap-2">
                                    <AlertCircle size={32} />
                                    <p className="text-xs font-bold">Nenhum entregador cadastrado</p>
                                </div>
                            ) : drivers.map(driver => (
                                <div
                                    key={driver.id}
                                    className={`p-4 rounded-2xl border transition group ${driver.status === 'active' ? 'bg-slate-50 border-slate-100' : 'bg-white border-dashed border-slate-200 grayscale opacity-60'}`}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black">
                                                    {driver.name[0]}
                                                </div>
                                                <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${driver.status === 'active' ? (driver.active_orders_count > 0 ? 'bg-purple-600' : 'bg-emerald-500') : 'bg-slate-300'}`} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800 text-sm leading-tight">{driver.name}</h4>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                                                    {driver.active_orders_count > 0 ? `${driver.active_orders_count} ENTREGA(S) ATIVA(S)` : 'DISPONÍVEL AGORA'}
                                                </p>
                                            </div>
                                        </div>
                                        {driver.status === 'active' && driver.active_orders_count > 0 && (
                                            <div className="animate-pulse bg-purple-100 text-purple-600 p-1.5 rounded-lg">
                                                <Truck size={14} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Button for Batch Assign */}
                                    {batchingMode && selectedOrders.length > 0 && driver.status === 'active' && (
                                        <button
                                            onClick={() => handleBatchAssign(driver.id)}
                                            className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-black py-2.5 rounded-xl shadow-lg shadow-purple-200 transition active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            <Play size={12} fill="currentColor" />
                                            DESPACHAR {selectedOrders.length} PEDIDOS
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 italic text-[10px] text-slate-400 text-center">
                            Ative o modo "Seleção em Lote" para despachar múltiplos pedidos.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
