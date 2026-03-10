'use client';

import { useState, useEffect } from 'react';
import { Save, Zap, Clock, Percent, ArrowLeft, Info } from 'lucide-react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function PricingSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [rules, setRules] = useState({
        surge: { enabled: false, threshold_orders_per_hour: 5, fee_multiplier: 1.2 },
        happy_hour: { enabled: false, start_time: "14:00", end_time: "17:00", discount_percentage: 10, categories: [] as string[] }
    });

    useEffect(() => {
        const fetchRules = async () => {
            try {
                const token = localStorage.getItem('admin_token');
                const slug = localStorage.getItem('admin_slug') || 'default';
                const res = await fetch(`${API}/api/admin/pricing/rules?slug=${slug}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.surge) setRules(data);
                }
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        fetchRules();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem('admin_token');
            const slug = localStorage.getItem('admin_slug') || 'default';
            const res = await fetch(`${API}/api/admin/pricing/rules?slug=${slug}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(rules)
            });
            if (res.ok) alert('Configurações salvas com sucesso!');
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
    };

    if (loading) return <div className="p-8 animate-pulse text-center font-bold">Carregando Inteligência de Preço...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8 p-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/admin/settings" className="p-2 hover:bg-slate-100 rounded-xl transition">
                        <ArrowLeft size={24} className="text-slate-600" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tight">Otimização de Receita</h1>
                        <p className="text-slate-500 font-medium">Configure seu Oráculo de Preços Dinâmicos</p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-purple-600 text-white font-black px-8 py-4 rounded-2xl flex items-center gap-2 hover:bg-purple-700 transition active:scale-95 shadow-xl shadow-purple-200"
                >
                    <Save size={20} />
                    {saving ? 'SALVANDO...' : 'SALVAR REGRAS'}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Surge Pricing Card */}
                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition">
                        <Zap size={80} className="text-amber-500" />
                    </div>

                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl">
                            <Zap size={24} />
                        </div>
                        <h2 className="text-xl font-black uppercase tracking-tight text-slate-800">Taxa de Pico (Surge)</h2>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl">
                            <span className="font-bold text-slate-700">Ativar Surge Pricing</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={rules.surge.enabled} onChange={e => setRules({ ...rules, surge: { ...rules.surge, enabled: e.target.checked } })} className="sr-only peer" />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                            </label>
                        </div>

                        <div className="space-y-4">
                            <label className="block">
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Gatilho (Pedidos/Hora)</span>
                                <input
                                    type="number"
                                    value={rules.surge.threshold_orders_per_hour}
                                    onChange={e => setRules({ ...rules, surge: { ...rules.surge, threshold_orders_per_hour: Number(e.target.value) } })}
                                    className="w-full border-2 border-slate-100 p-4 rounded-2xl outline-none focus:border-amber-400 font-bold"
                                />
                                <span className="text-[10px] text-slate-400 mt-1 block italic flex items-center gap-1">
                                    <Info size={12} /> Ativa quando houver mais de {rules.surge.threshold_orders_per_hour} pedidos na última hora.
                                </span>
                            </label>

                            <label className="block">
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Multiplicador de Taxa</span>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={rules.surge.fee_multiplier}
                                    onChange={e => setRules({ ...rules, surge: { ...rules.surge, fee_multiplier: Number(e.target.value) } })}
                                    className="w-full border-2 border-slate-100 p-4 rounded-2xl outline-none focus:border-amber-400 font-bold"
                                />
                                <span className="text-[10px] text-slate-400 mt-1 block italic">Ex: 1.2 = 20% de acréscimo na taxa de entrega.</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Happy Hour Card */}
                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition">
                        <Clock size={80} className="text-emerald-500" />
                    </div>

                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
                            <Clock size={24} />
                        </div>
                        <h2 className="text-xl font-black uppercase tracking-tight text-slate-800">Happy Hour IA</h2>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl">
                            <span className="font-bold text-slate-700">Ativar Happy Hour</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={rules.happy_hour.enabled} onChange={e => setRules({ ...rules, happy_hour: { ...rules.happy_hour, enabled: e.target.checked } })} className="sr-only peer" />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                            </label>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <label>
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Início</span>
                                <input
                                    type="time"
                                    value={rules.happy_hour.start_time}
                                    onChange={e => setRules({ ...rules, happy_hour: { ...rules.happy_hour, start_time: e.target.value } })}
                                    className="w-full border-2 border-slate-100 p-4 rounded-2xl outline-none focus:border-emerald-400 font-bold text-sm"
                                />
                            </label>
                            <label>
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Fim</span>
                                <input
                                    type="time"
                                    value={rules.happy_hour.end_time}
                                    onChange={e => setRules({ ...rules, happy_hour: { ...rules.happy_hour, end_time: e.target.value } })}
                                    className="w-full border-2 border-slate-100 p-4 rounded-2xl outline-none focus:border-emerald-400 font-bold text-sm"
                                />
                            </label>
                        </div>

                        <label className="block">
                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Desconto (%)</span>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={rules.happy_hour.discount_percentage}
                                    onChange={e => setRules({ ...rules, happy_hour: { ...rules.happy_hour, discount_percentage: Number(e.target.value) } })}
                                    className="w-full border-2 border-slate-100 p-4 pr-12 rounded-2xl outline-none focus:border-emerald-400 font-bold"
                                />
                                <Percent size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
                            </div>
                        </label>
                    </div>
                </div>
            </div>

            <div className="bg-slate-900 p-8 rounded-[40px] text-white flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                    <h3 className="text-xl font-black uppercase tracking-widest flex items-center gap-2 mb-2">
                        <Info className="text-purple-400" /> Como funciona a Inteligência?
                    </h3>
                    <p className="text-slate-400 font-medium">As regras são aplicadas em tempo real no app do cliente. Quando a Taxa de Pico está ativa, um alerta de "Alta Demanda" aparece no Checkout. O Happy Hour é aplicado automaticamente nos produtos selecionados.</p>
                </div>
            </div>
        </div>
    );
}
