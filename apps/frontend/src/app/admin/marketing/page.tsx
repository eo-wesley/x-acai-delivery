'use client';

import React, { useState, useEffect } from 'react';
import {
    Users,
    Send,
    History,
    Target,
    MessageSquare,
    CheckCircle2,
    AlertCircle,
    Calendar,
    BarChart3
} from 'lucide-react';

export default function MarketingPage() {
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [potentialCount, setPotentialCount] = useState<number | null>(null);
    const [calculating, setCalculating] = useState(false);

    // Form states
    const [name, setName] = useState('');
    const [message, setMessage] = useState('Olá {nome}! Temos uma novidade deliciosa para você no X-Açaí 🍇');
    const [filters, setFilters] = useState({
        lastOrderDays: 30,
        minOrders: 0,
        minSpentCents: 0,
        tag: ''
    });

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    const fetchCampaigns = async () => {
        try {
            const token = localStorage.getItem('admin_token');
            const slug = localStorage.getItem('admin_slug') || 'default';
            const res = await fetch(`${API_URL}/api/admin/marketing/campaigns?slug=${slug}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setCampaigns(await res.json());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const calculateAudience = async () => {
        setCalculating(true);
        try {
            const token = localStorage.getItem('admin_token');
            const slug = localStorage.getItem('admin_slug') || 'default';
            const params = new URLSearchParams({
                slug,
                lastOrderDays: filters.lastOrderDays.toString(),
                minOrders: filters.minOrders.toString(),
                minSpentCents: filters.minSpentCents.toString(),
                tag: filters.tag
            });
            const res = await fetch(`${API_URL}/api/admin/marketing/segmented-count?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setPotentialCount(data.count);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setCalculating(false);
        }
    };

    const handleCreateCampaign = async () => {
        if (!name || !message || potentialCount === 0) return;

        try {
            const token = localStorage.getItem('admin_token');
            const slug = localStorage.getItem('admin_slug') || 'default';
            const res = await fetch(`${API_URL}/api/admin/marketing/campaigns?slug=${slug}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name, message, filters })
            });

            if (res.ok) {
                alert('Campanha iniciada com sucesso!');
                setName('');
                fetchCampaigns();
            } else {
                const err = await res.json();
                alert(err.error);
            }
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchCampaigns();
    }, []);

    useEffect(() => {
        const timer = setTimeout(calculateAudience, 500);
        return () => clearTimeout(timer);
    }, [filters]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                    <Target className="text-purple-600" size={32} />
                    WhatsApp Marketing Pro
                </h1>
                <p className="text-gray-500 font-medium">Engaje seus clientes com disparos segmentados e inteligentes.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Campaign Creator */}
                <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-white/30 space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
                            <Send size={20} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800">Nova Campanha</h2>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Nome Interno</label>
                            <input
                                type="text"
                                placeholder="Ex: Promoção de Verão - Inativos"
                                className="w-full bg-gray-50/50 border border-gray-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 transition-all outline-none font-medium"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Mensagem (WhatsApp)</label>
                            <textarea
                                rows={4}
                                placeholder="Use {nome} para personalizar..."
                                className="w-full bg-gray-50/50 border border-gray-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 transition-all outline-none font-medium resize-none"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                            />
                            <p className="text-[10px] text-gray-400 mt-1 ml-1 font-bold">Variáveis: <span className="text-purple-600">{"{nome}"}</span></p>
                        </div>

                        <div className="pt-4 border-t border-gray-100">
                            <h3 className="text-sm font-black text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Users size={16} className="text-gray-400" /> Público Alvo (Filtros RFM)
                            </h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">Último Pedido (atrás)</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            className="w-full bg-gray-50/50 border border-gray-100 rounded-lg px-3 py-2 text-sm font-bold"
                                            value={filters.lastOrderDays}
                                            onChange={(e) => setFilters({ ...filters, lastOrderDays: parseInt(e.target.value) })}
                                        />
                                        <span className="text-xs font-bold text-gray-500 whitespace-nowrap">dias</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">Mínimo de Pedidos</label>
                                    <input
                                        type="number"
                                        className="w-full bg-gray-50/50 border border-gray-100 rounded-lg px-3 py-2 text-sm font-bold"
                                        value={filters.minOrders}
                                        onChange={(e) => setFilters({ ...filters, minOrders: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Potential Audience Summary */}
                        <div className="bg-purple-50/50 border border-purple-100 p-4 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="bg-purple-600 p-2 rounded-lg text-white">
                                    <Users size={18} />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-purple-900/50 uppercase">Audiência Estimada</p>
                                    <p className="text-xl font-black text-purple-900">
                                        {calculating ? 'Calculando...' : `${potentialCount || 0} clientes`}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleCreateCampaign}
                                disabled={!name || potentialCount === 0 || calculating}
                                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white font-black px-6 py-3 rounded-xl transition-all shadow-lg hover:shadow-purple-200 active:scale-95 flex items-center gap-2"
                            >
                                <Send size={18} /> Iniciar Disparo
                            </button>
                        </div>
                    </div>
                </div>

                {/* Campaign History */}
                <div className="space-y-6">
                    <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-white/30">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                                    <History size={20} />
                                </div>
                                <h2 className="text-xl font-bold text-gray-800">Histórico de Disparos</h2>
                            </div>
                            <button onClick={fetchCampaigns} className="text-gray-400 hover:text-purple-600 transition-colors">
                                <BarChart3 size={20} />
                            </button>
                        </div>

                        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                            {campaigns.length === 0 && !loading && (
                                <div className="text-center py-12">
                                    <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                                        <MessageSquare size={32} />
                                    </div>
                                    <p className="text-gray-500 font-bold">Nenhuma campanha realizada.</p>
                                </div>
                            )}

                            {campaigns.map((camp: any) => (
                                <div key={camp.id} className="p-4 bg-gray-50/50 border border-gray-100 rounded-2xl hover:bg-white transition-all group">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 className="font-black text-gray-800 tracking-tight">{camp.name}</h3>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                                                <Calendar size={10} /> {new Date(camp.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${camp.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                                camp.status === 'sending' ? 'bg-blue-100 text-blue-700 animate-pulse' :
                                                    camp.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                                            }`}>
                                            {camp.status}
                                        </span>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="mt-4">
                                        <div className="flex justify-between text-[10px] font-black uppercase mb-1 text-gray-500">
                                            <span>Progresso: {camp.sent_count + camp.error_count} / {camp.total_target}</span>
                                            <span className="text-emerald-600">{Math.round(((camp.sent_count || 0) / (camp.total_target || 1)) * 100)}%</span>
                                        </div>
                                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden flex">
                                            <div
                                                className="h-full bg-emerald-500 transition-all duration-500"
                                                style={{ width: `${((camp.sent_count || 0) / (camp.total_target || 1)) * 100}%` }}
                                            />
                                            <div
                                                className="h-full bg-red-400 transition-all duration-500"
                                                style={{ width: `${((camp.error_count || 0) / (camp.total_target || 1)) * 100}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-3 grid grid-cols-2 gap-2">
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-700">
                                            <CheckCircle2 size={12} /> {camp.sent_count} Enviados
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-red-600">
                                            <AlertCircle size={12} /> {camp.error_count} Falhas
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
