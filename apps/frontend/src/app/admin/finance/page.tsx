'use client';

import { useState, useEffect } from 'react';
import { getApiBase, readTenantSlugFromBrowser } from '@/hooks/useTenant';
import {
    DollarSign,
    ArrowUpCircle,
    ArrowDownCircle,
    Pocket,
    History,
    Calendar,
    Plus,
    Minus,
    Lock,
    Unlock,
    TrendingUp,
    TrendingDown,
    FileText,
    RefreshCw
} from 'lucide-react';

const API_BASE = getApiBase();

function getAdminToken() {
    return localStorage.getItem('admin_token') || '';
}

function getAdminSlug() {
    return readTenantSlugFromBrowser({ includeAdminFallback: true });
}

function buildAdminUrl(path: string, params: Record<string, string> = {}) {
    const url = new URL(path, API_BASE);
    url.searchParams.set('slug', getAdminSlug());
    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
    });
    return url.toString();
}

function getAdminHeaders(withJson = false): HeadersInit {
    const headers: HeadersInit = {
        Authorization: `Bearer ${getAdminToken()}`,
    };

    if (withJson) {
        headers['Content-Type'] = 'application/json';
    }

    return headers;
}

export default function FinanceHubPage() {
    const [stats, setStats] = useState({ revenue_cents: 0, expenses_cents: 0, net_profit_cents: 0 });
    const [currentSession, setCurrentSession] = useState<any>(null);
    const [entries, setEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState<any>(null); // 'open', 'add_entry', 'close'
    const [formData, setFormData] = useState({ value: '', description: '', category: 'supply', type: 'in' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const today = new Date().toISOString().split('T')[0];
            const [sessionRes, entriesRes, dreRes] = await Promise.all([
                fetch(buildAdminUrl('/api/admin/finance/cash/current'), { headers: getAdminHeaders() }),
                fetch(buildAdminUrl('/api/admin/finance/entries'), { headers: getAdminHeaders() }),
                fetch(buildAdminUrl('/api/admin/finance/reports/dre', {
                    start: today,
                    end: `${today}T23:59:59`,
                }), { headers: getAdminHeaders() })
            ]);

            const session = await sessionRes.json();
            const entriesList = await entriesRes.json();
            const dre = await dreRes.json();

            setCurrentSession(session.id ? session : null);
            setEntries(entriesList || []);
            setStats(dre);
        } catch (e) {
            console.error('Failed to fetch finance data', e);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCash = async () => {
        const res = await fetch(buildAdminUrl('/api/admin/finance/cash/open'), {
            method: 'POST',
            headers: getAdminHeaders(true),
            body: JSON.stringify({ initialValueCents: Number(formData.value) * 100 })
        });
        if (res.ok) {
            setShowModal(null);
            fetchData();
        }
    };

    const handleCloseCash = async () => {
        const res = await fetch(buildAdminUrl('/api/admin/finance/cash/close'), {
            method: 'POST',
            headers: getAdminHeaders(true),
            body: JSON.stringify({ sessionId: currentSession.id, finalValueCents: Number(formData.value) * 100 })
        });
        if (res.ok) {
            setShowModal(null);
            fetchData();
            const data = await res.json();
            alert(`✅ Caixa fechado! Esperado: R$ ${(data.expectedValueCents / 100).toFixed(2)}`);
        }
    };

    const handleAddEntry = async () => {
        const res = await fetch(buildAdminUrl('/api/admin/finance/entries'), {
            method: 'POST',
            headers: getAdminHeaders(true),
            body: JSON.stringify({
                sessionId: currentSession?.id,
                type: formData.type,
                category: formData.category,
                valueCents: Number(formData.value) * 100,
                description: formData.description
            })
        });
        if (res.ok) {
            setShowModal(null);
            fetchData();
        }
    };

    return (
        <div className="p-6 bg-[#f8fafc] min-h-screen">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-black text-[#1e293b] flex items-center gap-2 uppercase tracking-wide">
                        <DollarSign className="text-emerald-600" size={28} />
                        Gestão de Fluxo de Caixa
                    </h1>
                    <p className="text-slate-500 text-sm">Controle financeiro, sangrias, suprimentos e fechamento de turno</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={fetchData} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 transition">
                        <RefreshCw size={18} className="text-slate-500" />
                    </button>
                    {!currentSession ? (
                        <button
                            onClick={() => { setFormData({ ...formData, value: '' }); setShowModal('open'); }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 px-6 rounded-xl shadow-lg shadow-emerald-100 transition flex items-center gap-2"
                        >
                            <Unlock size={18} />
                            ABRIR CAIXA
                        </button>
                    ) : (
                        <button
                            onClick={() => { setFormData({ ...formData, value: '' }); setShowModal('close'); }}
                            className="bg-red-600 hover:bg-red-700 text-white font-black py-3 px-6 rounded-xl shadow-lg shadow-red-100 transition flex items-center gap-2"
                        >
                            <Lock size={18} />
                            FECHAR CAIXA
                        </button>
                    )}
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {[
                    { label: 'Receitas (Dia)', value: stats.revenue_cents, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Despesas (Dia)', value: stats.expenses_cents, icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' },
                    { label: 'Lucro Líquido', value: stats.net_profit_cents, icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
                        <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color}`}>
                            <stat.icon size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                            <p className="text-2xl font-black text-slate-800">
                                R$ {(stat.value / 100).toFixed(2).replace('.', ',')}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Cash Session Status */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                        <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase tracking-wide text-sm">
                            <Pocket className="text-purple-600" size={18} />
                            Sessão de Caixa Ativa
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${currentSession ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {currentSession ? 'ABERTO' : 'FECHADO'}
                        </span>
                    </div>
                    {currentSession ? (
                        <div className="p-8 space-y-8">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Aberto por</p>
                                    <p className="text-slate-800 font-black">Admin Profissional</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Horário de Abertura</p>
                                    <p className="text-slate-800 font-black">{new Date(currentSession.opened_at).toLocaleTimeString()}</p>
                                </div>
                            </div>
                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex justify-between items-center">
                                <div>
                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Saldo Inicial</p>
                                    <p className="text-xl font-black text-slate-800">R$ {(currentSession.initial_value_cents / 100).toFixed(2).replace('.', ',')}</p>
                                </div>
                                <History className="text-slate-200" size={40} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => { setFormData({ ...formData, type: 'in', category: 'supply', value: '' }); setShowModal('add_entry'); }}
                                    className="bg-white border-2 border-emerald-100 text-emerald-600 hover:bg-emerald-50 font-black py-4 rounded-2xl transition flex flex-col items-center gap-2"
                                >
                                    <ArrowUpCircle size={28} />
                                    <span className="text-xs uppercase tracking-wide">Suprimento</span>
                                </button>
                                <button
                                    onClick={() => { setFormData({ ...formData, type: 'out', category: 'bleed', value: '' }); setShowModal('add_entry'); }}
                                    className="bg-white border-2 border-red-100 text-red-600 hover:bg-red-50 font-black py-4 rounded-2xl transition flex flex-col items-center gap-2"
                                >
                                    <ArrowDownCircle size={28} />
                                    <span className="text-xs uppercase tracking-wide">Sangria</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-40">
                            <Lock size={64} className="text-slate-300 mb-4" />
                            <p className="text-slate-800 font-bold">Nenhum caixa aberto no momento.</p>
                            <p className="text-slate-400 text-xs">Abra o caixa para começar a registrar transações.</p>
                        </div>
                    )}
                </div>

                {/* Recent Entries */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-50">
                        <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase tracking-wide text-sm">
                            <History className="text-blue-500" size={18} />
                            Últimos Lançamentos
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto max-h-[400px]">
                        {entries.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 text-sm italic">Nenhum lançamento registrado.</div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {entries.map(entry => (
                                    <div key={entry.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2 rounded-xl ${entry.type === 'in' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                {entry.type === 'in' ? <Plus size={16} /> : <Minus size={16} />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-700">{entry.description || (entry.category === 'sale' ? 'Venda PDV' : entry.category)}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{new Date(entry.created_at).toLocaleTimeString()}</p>
                                            </div>
                                        </div>
                                        <p className={`font-black ${entry.type === 'in' ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {entry.type === 'in' ? '+' : '-'} R$ {(entry.value_cents / 100).toFixed(2).replace('.', ',')}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-8">
                            <h2 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-wide">
                                {showModal === 'open' && 'Abrir Turno de Caixa'}
                                {showModal === 'close' && 'Fechar Turno de Caixa'}
                                {showModal === 'add_entry' && (formData.type === 'in' ? 'Novo Suprimento' : 'Nova Sangria')}
                            </h2>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] block mb-2">Valor (R$)</label>
                                    <input
                                        type="number"
                                        placeholder="0,00"
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-2xl font-black text-slate-800 outline-none focus:border-purple-500 transition"
                                        value={formData.value}
                                        onChange={e => setFormData({ ...formData, value: e.target.value })}
                                        autoFocus
                                    />
                                </div>

                                {showModal === 'add_entry' && (
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] block mb-2">Motivo / Descrição</label>
                                        <input
                                            type="text"
                                            placeholder="Ex: Troco inicial, retirada para doces..."
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-slate-700 outline-none focus:border-purple-500 transition"
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        />
                                    </div>
                                )}

                                <div className="flex gap-4 pt-4">
                                    <button
                                        onClick={() => setShowModal(null)}
                                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-4 rounded-2xl transition"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (showModal === 'open') handleOpenCash();
                                            if (showModal === 'close') handleCloseCash();
                                            if (showModal === 'add_entry') handleAddEntry();
                                        }}
                                        disabled={!formData.value}
                                        className={`flex-1 font-black py-4 rounded-2xl shadow-lg transition active:scale-95 disabled:opacity-50 ${showModal === 'close' ? 'bg-red-600 shadow-red-100 text-white' : 'bg-emerald-600 shadow-emerald-100 text-white'}`}
                                    >
                                        Confirmar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
