'use client';

import React, { useState, useEffect } from 'react';
import {
    Activity,
    Clock,
    AlertTriangle,
    MapPin,
    ChevronRight,
    Zap,
    Truck,
    ChefHat,
    ShoppingBag
} from 'lucide-react';

export default function LiveHubPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(new Date());

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    const fetchLiveStatus = async () => {
        try {
            const token = localStorage.getItem('admin_token');
            const slug = localStorage.getItem('admin_slug') || 'default';
            const res = await fetch(`${API_URL}/api/admin/operations/live?slug=${slug}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const json = await res.json();
                setData(json);
                setLastUpdate(new Date());
            }
        } catch (e) {
            console.error('Failed to fetch live status', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLiveStatus();
        const interval = setInterval(fetchLiveStatus, 15000); // 15s polling
        return () => clearInterval(interval);
    }, []);

    if (loading && !data) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700"></div>
            <p className="text-gray-500 font-black animate-pulse uppercase tracking-widest text-xs">Conectando ao Live Hub...</p>
        </div>
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return 'text-emerald-700 bg-emerald-100';
            case 'accepted': return 'text-sky-700 bg-sky-100';
            case 'preparing': return 'text-blue-600 bg-blue-100';
            case 'delivering': return 'text-orange-600 bg-orange-100';
            case 'pending_payment': return 'text-gray-500 bg-gray-100';
            default: return 'text-emerald-600 bg-emerald-100';
        }
    };

    const getPriorityStyle = (priority: string) => {
        switch (priority) {
            case 'high': return 'border-l-4 border-red-500 bg-red-50/50';
            case 'medium': return 'border-l-4 border-amber-500 bg-amber-50/50';
            default: return 'border-l-4 border-emerald-500 bg-white';
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header with Live Pulse */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Live Hub</h1>
                    </div>
                    <p className="text-gray-500 font-medium">Monitoramento operacional em tempo real • Atualizado às {lastUpdate.toLocaleTimeString()}</p>
                </div>

                <div className="flex gap-4">
                    <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 flex items-center gap-2">
                        <Activity size={16} className="text-purple-600" />
                        <span className="text-xs font-black text-gray-700 uppercase">Sistema Operacional</span>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Pendentes', value: data?.stats?.pending || 0, icon: ShoppingBag, color: 'text-gray-600', bg: 'bg-gray-100' },
                    { label: 'Cozinha', value: data?.stats?.preparing || 0, icon: ChefHat, color: 'text-blue-600', bg: 'bg-blue-100' },
                    { label: 'Em Rota', value: data?.stats?.delivering || 0, icon: Truck, color: 'text-orange-600', bg: 'bg-orange-100' },
                    { label: 'Atrasados', value: data?.stats?.delayed_count || 0, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100' }
                ].map((stat, i) => (
                    <div key={i} className={`p-6 rounded-2xl shadow-sm border border-white/50 bg-white/70 backdrop-blur-md flex items-center gap-4 group hover:scale-[1.02] transition-transform cursor-pointer`}>
                        <div className={`${stat.bg} ${stat.color} p-3 rounded-xl group-hover:rotate-6 transition-transform`}>
                            <stat.icon size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
                            <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Active Orders List (the bottleneck monitor) */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
                            <Clock className="text-purple-600" size={20} />
                            Fila de Produção
                        </h2>
                        <span className="text-xs font-bold text-gray-400">{data?.orders?.length || 0} pedidos ativos</span>
                    </div>

                    <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                        {data?.orders?.length === 0 ? (
                            <div className="bg-white/50 border-2 border-dashed border-gray-200 rounded-3xl p-12 text-center">
                                <Zap size={48} className="mx-auto text-gray-300 mb-4" />
                                <p className="text-gray-500 font-bold">Sem pedidos ativos no momento.</p>
                                <p className="text-xs text-gray-400 font-medium">Sua operação está em dia! ✨</p>
                            </div>
                        ) : (
                            data?.orders?.map((order: any) => (
                                <div key={order.id} className={`${getPriorityStyle(order.priority)} p-5 rounded-2xl shadow-sm hover:shadow-md transition-all group relative overflow-hidden`}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center font-black text-gray-400 group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors">
                                                #{order.id.slice(0, 4).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900 group-hover:text-purple-700 transition-colors">{order.customer_name}</h3>
                                                <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                                                    <MapPin size={12} /> {order.address_text}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-tighter ${getStatusColor(order.status)}`}>
                                                {order.status}
                                            </span>
                                            <p className={`mt-2 font-black text-xs ${order.is_delayed ? 'text-red-500 animate-pulse' : 'text-gray-700'}`}>
                                                ⏱️ {order.minutes_elapsed} min
                                            </p>
                                        </div>
                                    </div>

                                    {order.is_delayed && (
                                        <div className="mt-4 flex items-center gap-2 bg-red-100/50 p-2 rounded-lg text-[10px] font-black text-red-700 uppercase tracking-wider">
                                            <AlertTriangle size={12} /> Atrasado: Excedeu o tempo de preparo de {data?.config?.threshold} min
                                        </div>
                                    )}

                                    <div className="absolute right-2 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="text-purple-600 hover:bg-purple-50 p-2 rounded-full transition-colors">
                                            <ChevronRight size={20} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Sidebar: Heatmap & Alerts */}
                <div className="space-y-8">
                    {/* Visual Demand Grid */}
                    <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-lg border border-white/30">
                        <h2 className="text-lg font-black text-gray-800 mb-4 flex items-center gap-2">
                            <MapPin className="text-purple-600" size={20} />
                            Foco de Demanda
                        </h2>
                        <div className="space-y-3">
                            {data?.heatmap?.map((loc: any, i: number) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-gray-50/50 rounded-xl">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 font-black text-xs flex items-center justify-center shrink-0">
                                            {i + 1}
                                        </div>
                                        <p className="text-xs font-bold text-gray-700 truncate">{loc.address_text}</p>
                                    </div>
                                    <span className="font-black text-gray-900 bg-white px-2 py-1 rounded-lg shadow-sm text-xs">
                                        {loc.count}
                                    </span>
                                </div>
                            )) || (
                                    <p className="text-xs text-gray-400 font-medium text-center py-4">Sem dados geográficos hoje.</p>
                                )}
                        </div>
                    </div>

                    {/* Operational Tip */}
                    <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                        <Zap className="absolute -right-4 -bottom-4 text-white/10 w-24 h-24 rotate-12" />
                        <h3 className="text-lg font-black mb-2 flex items-center gap-2">
                            🚀 Dica Pro
                        </h3>
                        <p className="text-indigo-100 text-xs font-medium leading-relaxed">
                            Picos de demanda detectados. Considere ativar o "Modo Turbo" nas mensagens de WhatsApp para agilizar confirmações automáticas.
                        </p>
                        <button className="mt-4 bg-white/20 hover:bg-white/30 text-white text-[10px] font-black px-4 py-2 rounded-lg backdrop-blur-md transition-colors uppercase tracking-widest">
                            Otimizar Agora
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
