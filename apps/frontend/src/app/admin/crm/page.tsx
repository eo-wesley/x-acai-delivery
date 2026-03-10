'use client';

import { useState, useEffect } from 'react';
import {
    Users,
    Ticket,
    Send,
    TrendingUp,
    Star,
    AlertCircle,
    Clock,
    DollarSign,
    Plus,
    ChevronRight,
    Target
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function CRMDashboard() {
    const [rfm, setRfm] = useState<any>(null);
    const [coupons, setCoupons] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCouponForm, setShowCouponForm] = useState(false);
    const [newCoupon, setNewCoupon] = useState({ code: '', type: 'fixed', value: 0, usage_limit: 0 });

    useEffect(() => {
        const fetchData = async () => {
            const slug = localStorage.getItem('admin_slug') || 'default';
            const headers = { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` };

            try {
                const [rfmRes, couponRes] = await Promise.all([
                    fetch(`${API}/api/${slug}/marketing/admin/marketing/rfm`, { headers }),
                    fetch(`${API}/api/${slug}/marketing/admin/marketing/coupons`, { headers })
                ]);

                if (rfmRes.ok) setRfm(await rfmRes.json());
                if (couponRes.ok) setCoupons(await couponRes.json());
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) return <div className="p-12 text-center animate-pulse text-indigo-600 font-black tracking-widest uppercase">Analisando Comportamento dos Clientes...</div>;

    const segments = [
        { key: 'champions', label: 'Clientes Campeões', icon: Star, color: 'emerald', desc: 'Compram sempre e gastam muito.' },
        { key: 'promising', label: 'Promissores', icon: TrendingUp, color: 'blue', desc: 'Novos clientes com alto potencial.' },
        { key: 'churn_risk', label: 'Risco de Churn', icon: AlertCircle, color: 'orange', desc: 'Grandes clientes que sumiram.' },
        { key: 'hibernating', label: 'Hibernando', icon: Clock, color: 'gray', desc: 'Fazem tempo que não compram.' }
    ];

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-10 bg-gray-50 min-h-screen">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase leading-none mb-2">Customer Intelligence</h1>
                    <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">X-Açaí CRM • Automação de Marketing</p>
                </div>
                <div className="bg-indigo-600 p-4 rounded-2xl shadow-lg shadow-indigo-200 text-white text-right">
                    <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest">Base Ativa</p>
                    <p className="text-2xl font-black">
                        {(rfm?.champions?.length || 0) + (rfm?.promising?.length || 0) + (rfm?.churn_risk?.length || 0) + (rfm?.hibernating?.length || 0)}
                    </p>
                </div>
            </header>

            {/* RFM Segmentation Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {segments.map(seg => (
                    <div key={seg.key} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition group overflow-hidden relative">
                        <div className={`w-12 h-12 rounded-2xl bg-${seg.color}-50 text-${seg.color}-600 flex items-center justify-center mb-4`}>
                            <seg.icon size={24} />
                        </div>
                        <h3 className="font-black text-gray-900 uppercase text-sm tracking-tight mb-1">{seg.label}</h3>
                        <p className="text-[10px] text-gray-400 font-bold leading-tight uppercase mb-4">{seg.desc}</p>
                        <div className="flex items-end justify-between">
                            <span className="text-3xl font-black text-gray-800">{rfm?.[seg.key]?.length || 0}</span>
                            <button className={`text-[10px] font-black text-${seg.color}-600 uppercase tracking-widest flex items-center gap-1 opacity-0 group-hover:opacity-100 transition`}>
                                Ver Lista <ChevronRight size={14} />
                            </button>
                        </div>
                        <div className={`absolute top-0 right-0 w-24 h-24 bg-${seg.color}-50 rounded-full blur-3xl -mr-12 -mt-12 opacity-50`}></div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Coupon Management */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <Ticket className="text-indigo-600" size={24} />
                            <h2 className="text-xl font-black text-gray-800 uppercase tracking-tighter">Gestão de Cupons</h2>
                        </div>
                        <button
                            onClick={() => setShowCouponForm(!showCouponForm)}
                            className="bg-black text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-900 transition flex items-center gap-2"
                        >
                            <Plus size={16} /> Novo Cupom
                        </button>
                    </div>

                    {showCouponForm && (
                        <div className="bg-indigo-950 p-6 rounded-[2rem] text-white shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-indigo-400 uppercase">Código</label>
                                    <input placeholder="EX: AÇAI20" className="w-full bg-white/10 border-white/10 border p-3 rounded-xl text-sm font-bold uppercase outline-none focus:ring-1 focus:ring-indigo-500" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-indigo-400 uppercase">Desconto (R$)</label>
                                    <input type="number" placeholder="5.00" className="w-full bg-white/10 border-white/10 border p-3 rounded-xl text-sm font-bold outline-none focus:ring-1 focus:ring-indigo-500" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-indigo-400 uppercase">Limite Usos</label>
                                    <input type="number" placeholder="100" className="w-full bg-white/10 border-white/10 border p-3 rounded-xl text-sm font-bold outline-none focus:ring-1 focus:ring-indigo-500" />
                                </div>
                                <div className="flex items-end">
                                    <button className="w-full bg-indigo-500 hover:bg-indigo-600 p-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition">Criar</button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-sm">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Código</th>
                                    <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor</th>
                                    <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Uso/Limite</th>
                                    <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {coupons.map(coupon => (
                                    <tr key={coupon.id} className="hover:bg-gray-50/50 transition">
                                        <td className="px-6 py-4">
                                            <span className="font-black text-indigo-600 uppercase text-sm font-mono tracking-tighter">{coupon.code}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="font-bold text-gray-700">R$ {(coupon.value / 100).toFixed(2)}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-[10px] font-black text-gray-500">{coupon.used_count} / {coupon.usage_limit || '∞'}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest ${coupon.active ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                                {coupon.active ? 'Ativo' : 'Pausado'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-[10px] font-black text-gray-400 hover:text-red-500 uppercase tracking-widest">Encerrar</button>
                                        </td>
                                    </tr>
                                ))}
                                {coupons.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-bold uppercase text-xs">Nenhum cupom ativo no momento.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Automation & Insights */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                        <Target className="absolute top-2 right-2 text-white/10" size={120} />
                        <h3 className="text-lg font-black uppercase tracking-tighter mb-4 relative z-10">Automações Sugeridas</h3>
                        <div className="space-y-4 relative z-10">
                            {[
                                { title: 'Cupom de Boas Vindas', sub: 'Disparo no 1º cadastro', icon: Plus },
                                { title: 'Resgate de Churn', sub: 'Clientes s/ compra há 30 dias', icon: AlertCircle },
                                { title: 'Parabéns VIP', sub: 'Cupom p/ melhores clientes', icon: Star }
                            ].map((task, i) => (
                                <div key={i} className="bg-white/10 p-4 rounded-2xl flex items-center gap-4 hover:bg-white/20 transition cursor-pointer group">
                                    <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                                        <task.icon size={18} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-tight">{task.title}</p>
                                        <p className="text-[10px] text-indigo-200 font-medium">{task.sub}</p>
                                    </div>
                                    <ChevronRight size={14} className="ml-auto opacity-0 group-hover:opacity-100 transition-all" />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6">Mecânicas de Retenção</h3>
                        <div className="space-y-5">
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Taxa de Recompra</span>
                                    <span className="text-[10px] font-black text-emerald-500 tracking-tighter">ALTA</span>
                                </div>
                                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="bg-emerald-500 h-full w-[64%]"></div>
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-2xl flex items-center gap-3">
                                <span className="text-xl font-black text-indigo-600 leading-none">R$ {((rfm?.champions?.reduce((acc: any, c: any) => acc + c.monetary, 0) / (rfm?.champions?.length || 1)) / 100).toFixed(0)}</span>
                                <p className="text-[10px] font-black text-gray-500 uppercase leading-none">Ticket Médio<br />Dos Campeões</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
