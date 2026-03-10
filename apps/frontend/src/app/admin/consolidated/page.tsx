'use client';

import { useState, useEffect } from 'react';
import {
    BarChart3,
    TrendingUp,
    AlertTriangle,
    Lightbulb,
    Store,
    DollarSign,
    ShoppingBag,
    ChevronRight,
    Search,
    BrainCircuit,
    Layers
} from 'lucide-react';
import CloneMenuModal from '@/components/admin/CloneMenuModal';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function ConsolidatedDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [insights, setInsights] = useState<any[]>([]);
    const [abcData, setAbcData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [ownerId, setOwnerId] = useState('default_owner');
    const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, insightsRes, abcRes] = await Promise.all([
                    fetch(`${API}/api/admin/scaling/consolidated-stats?owner_id=${ownerId}`),
                    fetch(`${API}/api/admin/scaling/ai-insights?restaurant_id=default_tenant`),
                    fetch(`${API}/api/admin/scaling/abc-curve?restaurant_id=default_tenant`)
                ]);

                if (statsRes.ok) setStats(await statsRes.json());
                if (insightsRes.ok) setInsights(await insightsRes.json());
                if (abcRes.ok) setAbcData(await abcRes.json());
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [ownerId]);

    if (loading) return <div className="p-12 text-center animate-pulse text-purple-600 font-black tracking-widest uppercase">Processando Big Data em Tempo Real...</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-10 bg-gray-50 min-h-screen">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase leading-none mb-2">Visão Consolidada</h1>
                    <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">Grupo Premium X-Açaí • {stats?.store_count || 0} Lojas Ativas</p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 text-right">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Faturamento Total</p>
                        <p className="text-2xl font-black text-emerald-600">R$ {((stats?.total_revenue || 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="bg-purple-600 p-4 rounded-2xl shadow-lg shadow-purple-200 text-white text-right">
                        <p className="text-[10px] font-black text-purple-200 uppercase tracking-widest">Pedidos Totais</p>
                        <p className="text-2xl font-black">{stats?.total_orders || 0}</p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* AI Insights Panel */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                        <BrainCircuit className="text-purple-600" size={24} />
                        <h2 className="text-xl font-black text-gray-800 uppercase tracking-tighter">AI Business Insights</h2>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {insights.length === 0 ? (
                            <div className="bg-white p-12 rounded-[2rem] text-center border-2 border-dashed border-gray-200">
                                <Lightbulb className="mx-auto text-yellow-400 mb-4" size={48} />
                                <p className="text-gray-500 font-bold uppercase text-sm">Nenhuma anomalia detectada. Sua operação está otimizada!</p>
                            </div>
                        ) : (
                            insights.map((insight, idx) => (
                                <div key={idx} className={`relative overflow-hidden p-6 rounded-[2rem] border shadow-sm transition hover:shadow-md ${insight.type === 'danger' ? 'bg-red-50 border-red-100' :
                                    insight.type === 'warning' ? 'bg-orange-50 border-orange-100' :
                                        'bg-blue-50 border-blue-100'
                                    }`}>
                                    <div className="flex gap-4 items-start relative z-10">
                                        <div className={`p-4 rounded-2xl ${insight.type === 'danger' ? 'bg-red-500 text-white' :
                                            insight.type === 'warning' ? 'bg-orange-500 text-white' :
                                                'bg-blue-500 text-white'
                                            }`}>
                                            {insight.type === 'danger' ? <AlertTriangle size={24} /> : <Lightbulb size={24} />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${insight.type === 'danger' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                                                    }`}>
                                                    {insight.impact}
                                                </span>
                                                <h3 className="font-black text-gray-900 uppercase text-sm">{insight.title}</h3>
                                            </div>
                                            <p className="text-sm text-gray-600 font-medium leading-relaxed">{insight.message}</p>
                                        </div>
                                    </div>
                                    <div className="absolute top-[-20px] right-[-20px] opacity-10">
                                        <TrendingUp size={120} />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Store Ranking */}
                    <div className="mt-12 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-black text-gray-800 uppercase tracking-tighter">Performance por Unidade</h2>
                            <button className="text-[10px] font-black text-purple-600 uppercase tracking-widest flex items-center gap-1">Ver Tudo <ChevronRight size={14} /></button>
                        </div>
                        <div className="bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-sm">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Loja</th>
                                        <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Pedidos</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Faturamento</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Share</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {stats?.stores?.map((store: any, idx: number) => (
                                        <tr key={store.restaurant_id} className="hover:bg-gray-50/50 transition cursor-pointer">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${idx === 0 ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-600'
                                                        }`}>
                                                        {idx + 1}
                                                    </div>
                                                    <span className="font-black text-gray-800 uppercase text-sm">{store.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center font-bold text-gray-600">{store.orders}</td>
                                            <td className="px-6 py-4 text-right font-black text-gray-900">R$ {(store.revenue / 100).toLocaleString('pt-BR')}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="bg-purple-500 h-full"
                                                            style={{ width: `${(store.revenue / stats.total_revenue) * 100}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-[10px] font-black text-gray-400">{((store.revenue / stats.total_revenue) * 100).toFixed(0)}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Sidebar Controls */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-indigo-900 to-black p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                        <div className="absolute top-[-40px] right-[-40px] w-48 h-48 bg-purple-500/10 rounded-full blur-3xl"></div>
                        <h3 className="text-lg font-black uppercase tracking-tighter mb-4 relative z-10">Módulo Franqueador</h3>
                        <p className="text-xs text-indigo-200 font-medium mb-6 leading-relaxed relative z-10">Gerencie padrões, clone cardápios e visualize o ecossistema completo.</p>

                        <div className="space-y-3 relative z-10">
                            <button
                                onClick={() => setIsCloneModalOpen(true)}
                                className="w-full bg-white/10 hover:bg-white/20 p-4 rounded-2xl flex items-center justify-between group transition text-left"
                            >
                                <div className="flex items-center gap-3">
                                    <Layers size={20} className="text-purple-400" />
                                    <span className="text-xs font-black uppercase tracking-widest">Clonar Unidade</span>
                                </div>
                                <ChevronRight size={16} className="text-gray-500 group-hover:translate-x-1 transition-transform" />
                            </button>
                            <button className="w-full bg-white/10 hover:bg-white/20 p-4 rounded-2xl flex items-center justify-between group transition">
                                <div className="flex items-center gap-3">
                                    <Store size={20} className="text-purple-400" />
                                    <span className="text-xs font-black uppercase tracking-widest">Multi-loja Setup</span>
                                </div>
                                <ChevronRight size={16} className="text-gray-500 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                        <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-4">Métricas Comparativas</h3>
                        <div className="space-y-4">
                            <div className="p-4 bg-gray-50 rounded-2xl">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Custo Médio Operacional</p>
                                <div className="flex justify-between items-end">
                                    <p className="text-xl font-black text-gray-800">22.4%</p>
                                    <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">+1.2% vs mês ant.</p>
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-2xl">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Satisfação Geral (NPS)</p>
                                <div className="flex justify-between items-end">
                                    <p className="text-xl font-black text-gray-800">9.2/10</p>
                                    <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Meta Atingida</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <CloneMenuModal
                isOpen={isCloneModalOpen}
                onClose={() => setIsCloneModalOpen(false)}
            />
        </div>
    );
}
