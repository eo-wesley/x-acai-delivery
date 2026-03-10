'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    TrendingUp,
    Users,
    Truck,
    AlertCircle,
    DollarSign,
    ShoppingBag,
    Clock,
    Zap,
    ArrowRight,
    Sparkles,
    LayoutDashboard,
    Activity
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
function getToken() { return localStorage.getItem('admin_token') || ''; }
function getSlug() { return localStorage.getItem('admin_slug') || 'default'; }

const R = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;

export default function AdminDashboard() {
    const [kpis, setKpis] = useState<any>(null);
    const [store, setStore] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        const headers = { Authorization: `Bearer ${getToken()}` };
        try {
            const [kpiRes, profileRes] = await Promise.all([
                fetch(`${API}/api/admin/analytics/kpis`, { headers }),
                fetch(`${API}/api/admin/profile?slug=${getSlug()}`, { headers }),
            ]);

            if (kpiRes.ok) setKpis(await kpiRes.json());
            if (profileRes.ok) setStore(await profileRes.json());
        } catch (e) {
            console.error('Failed to load dashboard data', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, [load]);

    if (loading) return (
        <div className="p-8 animate-pulse space-y-8">
            <div className="h-12 bg-slate-200 rounded-2xl w-48" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-slate-100 rounded-[32px]" />)}
            </div>
            <div className="h-64 bg-slate-100 rounded-[40px]" />
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            {/* Header / Welcome Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3 uppercase tracking-tight">
                        <LayoutDashboard className="text-purple-600" size={32} />
                        Central de Comando
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">Bem-vindo ao cockpit operacional do {store?.name || 'seu restaurante'}</p>
                </div>
                <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100">
                    <span className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                        <Activity size={18} />
                    </span>
                    <span className="text-xs font-black text-slate-700 px-3 uppercase tracking-widest">
                        Operação Online
                    </span>
                </div>
            </div>

            {/* Critical Real-time KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Vendas Hoje', value: R(kpis?.today?.revenue_cents || 0), sub: `${kpis?.today?.orders || 0} pedidos concluídos`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Saldo em Caixa', value: R(kpis?.current_cash_cents || 0), sub: 'Turno atual aberto', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'Pedidos Ativos', value: kpis?.pending_orders || 0, sub: 'Em preparação / entrega', icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Drivers Ativos', value: kpis?.active_drivers || 0, sub: 'Motoristas online agora', icon: Truck, color: 'text-purple-600', bg: 'bg-purple-50' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-7 rounded-[32px] shadow-sm border border-slate-100 hover:shadow-md transition group">
                        <div className="flex items-start justify-between mb-4">
                            <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} group-hover:scale-110 transition`}>
                                <stat.icon size={24} />
                            </div>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] mb-1">{stat.label}</p>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight">{stat.value}</h2>
                        <p className="text-xs text-slate-500 font-medium mt-2">{stat.sub}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* AI Growth Oracle Widget */}
                <div className="lg:col-span-2 bg-gradient-to-br from-purple-700 via-indigo-800 to-indigo-950 rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden group">
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-white/10 transition duration-1000" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/20 rounded-full -ml-16 -mb-16 blur-2xl" />

                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                                <Sparkles size={24} className="text-purple-300" />
                            </div>
                            <h3 className="text-xl font-black uppercase tracking-widest">Oráculo de Crescimento</h3>
                        </div>

                        <div className="space-y-6 flex-1">
                            <div className="bg-white/10 border border-white/10 p-6 rounded-[28px] backdrop-blur-sm hover:bg-white/15 transition">
                                <div className="flex items-center gap-4 mb-3">
                                    <TrendingUp size={20} className="text-emerald-400" />
                                    <span className="font-black text-xs uppercase tracking-widest text-purple-200">Insights de IA</span>
                                </div>
                                <p className="text-lg font-bold leading-relaxed">
                                    Sua taxa de conversão no PWA subiu 12% após a inclusão do PIX.
                                    <span className="text-purple-300"> Sugestão:</span> Ative uma campanha de cashback para reativar 45 clientes fiéis que não pedem há 15 dias.
                                </p>
                            </div>

                            <div className="bg-white/10 border border-white/10 p-6 rounded-[28px] backdrop-blur-sm hover:bg-white/15 transition">
                                <div className="flex items-center gap-4 mb-3">
                                    <Users size={20} className="text-purple-300" />
                                    <span className="font-black text-xs uppercase tracking-widest text-purple-200">Retenção de Clientes</span>
                                </div>
                                <p className="text-lg font-bold leading-relaxed">
                                    Identificamos <span className="text-orange-400 font-black">{kpis?.customer_health?.atRisk || 0}</span> clientes em risco e <span className="text-red-400 font-black">{kpis?.customer_health?.inactive || 0}</span> inativos.
                                    <span className="text-purple-300"> Sugestão:</span> Use o CRM para enviar ofertas de recuperação personalizadas.
                                </p>
                            </div>
                        </div>

                        <div className="mt-10 flex gap-4">
                            <Link href="/admin/customers" className="bg-white text-indigo-900 font-black px-8 py-4 rounded-2xl flex items-center gap-2 hover:bg-purple-100 transition active:scale-95 shadow-xl shadow-indigo-950/20">
                                ACESSAR CRM <ArrowRight size={18} />
                            </Link>
                            <Link href="/admin/marketing" className="bg-indigo-600/50 border border-white/20 text-white font-bold px-8 py-4 rounded-2xl hover:bg-indigo-600 transition">
                                MARKETING
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Performance & Shortcuts Column */}
                <div className="space-y-8">
                    {/* Customer Health (Churn Prediction) Card */}
                    <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
                        <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-6 border-b pb-4 border-slate-50 flex items-center justify-between">
                            Saúde da Base
                            <Users size={18} className="text-indigo-500" />
                        </h3>

                        <div className="space-y-6">
                            {[
                                { label: 'Saudáveis', count: kpis?.customer_health?.healthy || 0, color: 'bg-emerald-500', text: 'text-emerald-600' },
                                { label: 'Em Risco', count: kpis?.customer_health?.atRisk || 0, color: 'bg-orange-500', text: 'text-orange-600' },
                                { label: 'Inativos', count: kpis?.customer_health?.inactive || 0, color: 'bg-red-500', text: 'text-red-600' }
                            ].map((h, i) => (
                                <div key={i} className="space-y-2">
                                    <div className="flex justify-between text-xs font-black uppercase tracking-tight">
                                        <span className="text-slate-500">{h.label}</span>
                                        <span className={h.text}>{h.count}</span>
                                    </div>
                                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                        <div
                                            className={`${h.color} h-full transition-all duration-1000`}
                                            style={{ width: `${(h.count / (kpis?.customer_health?.total || 1)) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <Link href="/admin/customers" className="mt-6 w-full flex items-center justify-center gap-2 text-xs font-black text-indigo-600 bg-indigo-50 py-3 rounded-2xl hover:bg-indigo-100 transition uppercase tracking-widest">
                            Ver Detalhes no CRM
                        </Link>
                    </div>

                    {/* Operation Status Card (Shortcuts) */}
                    <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 shadow-xl shadow-slate-200/50">
                        <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-6 border-b pb-4 border-slate-50 flex items-center justify-between">
                            Acesso Rápido
                            <span className="p-1.5 bg-slate-50 rounded-lg"><Activity size={14} className="text-slate-400" /></span>
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { label: 'PDV', icon: ShoppingBag, color: 'text-purple-600', bg: 'bg-purple-50', href: '/admin/pdv' },
                                { label: 'CRM', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50', href: '/admin/customers' },
                                { label: 'Marketing', icon: Zap, color: 'text-orange-600', bg: 'bg-orange-50', href: '/admin/marketing' },
                                { label: 'Finanças', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50', href: '/admin/finance' },
                            ].map((item, i) => (
                                <Link key={i} href={item.href} className="flex flex-col items-center gap-3 p-6 rounded-[28px] border border-slate-50 hover:border-purple-100 hover:bg-purple-50/20 transition group">
                                    <div className={`p-3 rounded-2xl ${item.bg} ${item.color} group-hover:scale-110 transition`}>
                                        <item.icon size={20} />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.label}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Bar */}
            <div className="flex bg-white p-4 rounded-3xl border border-slate-100 items-center justify-between shadow-lg shadow-slate-200/20">
                <p className="text-sm font-bold text-slate-500 px-4 flex items-center gap-2">
                    <AlertCircle size={16} className="text-blue-500" />
                    Última atualização: {new Date().toLocaleTimeString()}
                </p>
                <button onClick={load} className="bg-slate-900 text-white font-black px-6 py-3 rounded-2xl hover:bg-slate-800 transition active:scale-95 text-xs uppercase tracking-widest">
                    Atualizar Dados
                </button>
            </div>
        </div>
    );
}
