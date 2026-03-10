'use client';

import { useState, useEffect, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type Coupon = {
    id: string;
    code: string;
    description?: string;
    type: 'flat' | 'percent';
    discount_value: number;
    min_order_cents: number;
    max_uses: number;
    used_count: number;
    expires_at?: string;
    active: number;
    created_at: string;
};

function getToken() { return localStorage.getItem('admin_token') || ''; }
function getSlug() { return localStorage.getItem('admin_slug') || 'default'; }

export default function AdminCoupons() {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({
        code: '', description: '', type: 'flat', discount_value: '',
        min_order_cents: '', max_uses: '', expires_at: '',
    });

    const loadCoupons = useCallback(async () => {
        try {
            const res = await fetch(`${API}/api/admin/coupons?slug=${getSlug()}`, {
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            if (res.ok) setCoupons(await res.json());
        } catch { }
        setLoading(false);
    }, []);

    useEffect(() => { loadCoupons(); }, [loadCoupons]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            const body = {
                code: form.code.toUpperCase().trim(),
                description: form.description || undefined,
                type: form.type,
                discount_value: Math.round(parseFloat(form.discount_value) * 100),
                min_order_cents: form.min_order_cents ? Math.round(parseFloat(form.min_order_cents) * 100) : 0,
                max_uses: form.max_uses ? parseInt(form.max_uses) : 0,
                expires_at: form.expires_at || undefined,
            };

            const url = editingId
                ? `${API}/api/admin/coupons/${editingId}?slug=${getSlug()}`
                : `${API}/api/admin/coupons?slug=${getSlug()}`;

            const res = await fetch(url, {
                method: editingId ? 'PATCH' : 'POST',
                headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                setForm({ code: '', description: '', type: 'flat', discount_value: '', min_order_cents: '', max_uses: '', expires_at: '' });
                setEditingId(null);
                loadCoupons();
            } else {
                const data = await res.json();
                setError(data.error || 'Erro ao salvar cupom');
            }
        } catch { setError('Falha na comunicação'); }
        setSubmitting(false);
    };

    const startEdit = (c: Coupon) => {
        setEditingId(c.id);
        setForm({
            code: c.code,
            description: c.description || '',
            type: c.type,
            discount_value: (c.discount_value / 100).toString(),
            min_order_cents: (c.min_order_cents / 100).toString(),
            max_uses: c.max_uses.toString(),
            expires_at: c.expires_at ? new Date(c.expires_at).toISOString().slice(0, 16) : '',
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const toggleActive = async (id: string, current: number) => {
        await fetch(`${API}/api/admin/coupons/${id}?slug=${getSlug()}`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ active: current ? 0 : 1 }),
        });
        loadCoupons();
    };

    const deleteCoupon = async (id: string) => {
        if (!confirm('Excluir este cupom permanentemente?')) return;
        await fetch(`${API}/api/admin/coupons/${id}?slug=${getSlug()}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${getToken()}` },
        });
        loadCoupons();
    };

    // Stats
    const totalActive = coupons.filter(c => c.active).length;
    const totalUses = coupons.reduce((sum, c) => sum + c.used_count, 0);

    return (
        <div className="max-w-6xl mx-auto pb-20">
            <header className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black text-gray-800">🎟️ Gestão de Cupons</h1>
                    <p className="text-gray-500">Crie campanhas e ofereça descontos estratégicos.</p>
                </div>
            </header>

            {/* Performance Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Ativos</div>
                    <div className="text-3xl font-black text-purple-600 mt-1">{totalActive}</div>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Resgates Totais</div>
                    <div className="text-3xl font-black text-blue-600 mt-1">{totalUses}</div>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mais Usado</div>
                    <div className="text-xl font-black text-gray-800 mt-1 truncate">
                        {coupons.sort((a, b) => b.used_count - a.used_count)[0]?.code || '—'}
                    </div>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Conversão Méd.</div>
                    <div className="text-3xl font-black text-green-600 mt-1">
                        {totalActive ? Math.round((totalUses / totalActive) * 10) / 10 : 0}
                    </div>
                </div>
            </div>

            {/* Form & List Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form */}
                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 sticky top-4">
                        <h2 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                            {editingId ? '✏️ Editar Cupom' : '✨ Novo Cupom'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Código</label>
                                <input required placeholder="PROMO10" className="w-full border rounded-2xl p-4 mt-1 font-mono uppercase bg-gray-50 focus:bg-white transition-all outline-none focus:ring-2 focus:ring-purple-500"
                                    value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Descrição</label>
                                <input placeholder="Ex: Desconto de Boas-vindas" className="w-full border rounded-2xl p-4 mt-1 text-sm bg-gray-50 focus:bg-white transition-all outline-none focus:ring-2 focus:ring-purple-500"
                                    value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Tipo</label>
                                    <select className="w-full border rounded-2xl p-4 mt-1 text-sm bg-gray-50 outline-none focus:ring-2 focus:ring-purple-500"
                                        value={form.type} onChange={e => setForm({ ...form, type: e.target.value as any })}>
                                        <option value="flat">R$ Fixo</option>
                                        <option value="percent">% Percentual</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Valor</label>
                                    <input required type="number" step="0.01" className="w-full border rounded-2xl p-4 mt-1 bg-gray-50 focus:bg-white transition-all outline-none focus:ring-2 focus:ring-purple-500"
                                        value={form.discount_value} onChange={e => setForm({ ...form, discount_value: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Mín. Pedido</label>
                                    <input type="number" step="0.01" className="w-full border rounded-2xl p-4 mt-1 text-sm bg-gray-50 outline-none focus:ring-2 focus:ring-purple-500"
                                        value={form.min_order_cents} onChange={e => setForm({ ...form, min_order_cents: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Máx. Usos</label>
                                    <input type="number" className="w-full border rounded-2xl p-4 mt-1 text-sm bg-gray-50 outline-none focus:ring-2 focus:ring-purple-500"
                                        value={form.max_uses} onChange={e => setForm({ ...form, max_uses: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Expiração</label>
                                <input type="datetime-local" className="w-full border rounded-2xl p-4 mt-1 text-sm bg-gray-50 outline-none focus:ring-2 focus:ring-purple-500"
                                    value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} />
                            </div>

                            {error && <p className="text-red-500 text-xs font-bold text-center bg-red-50 p-2 rounded-lg">{error}</p>}

                            <div className="flex gap-2">
                                <button type="submit" disabled={submitting}
                                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-purple-100 transition disabled:opacity-50">
                                    {submitting ? 'Salvando...' : editingId ? 'Atualizar Cupom' : 'Criar Cupom'}
                                </button>
                                {editingId && (
                                    <button type="button" onClick={() => { setEditingId(null); setForm({ code: '', description: '', type: 'flat', discount_value: '', min_order_cents: '', max_uses: '', expires_at: '' }); }}
                                        className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 rounded-2xl font-bold transition">
                                        Cancelar
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>

                {/* Table */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-0 overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-400 text-xs uppercase font-bold border-b">
                                    <tr>
                                        <th className="p-4">Código</th>
                                        <th className="p-4 text-center">Desconto</th>
                                        <th className="p-4 text-center">Usos</th>
                                        <th className="p-4 text-center">Status</th>
                                        <th className="p-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {coupons.map(c => (
                                        <tr key={c.id} className="hover:bg-gray-50/50 transition-all">
                                            <td className="p-4">
                                                <div className="font-black font-mono text-purple-700 text-base">{c.code}</div>
                                                <div className="text-[10px] text-gray-400 font-bold uppercase mt-1">{c.description || 'Sem descrição'}</div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="font-bold text-gray-800">
                                                    {c.type === 'flat' ? `R$ ${(c.discount_value / 100).toFixed(2)}` : `${c.discount_value / 100}%`}
                                                </div>
                                                <div className="text-[10px] text-gray-400 mt-1">Mín. R$ {(c.min_order_cents / 100).toFixed(2)}</div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="font-black text-gray-700">{c.used_count} <span className="text-gray-300 font-normal">/ {c.max_uses || '∞'}</span></div>
                                                <div className="w-full h-1 bg-gray-100 rounded-full mt-2 overflow-hidden">
                                                    <div className="h-full bg-blue-400" style={{ width: c.max_uses ? `${(c.used_count / c.max_uses) * 100}%` : '5%' }}></div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <button onClick={() => toggleActive(c.id, c.active)}
                                                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter transition-all ${c.active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}>
                                                    {c.active ? 'Ativo' : 'Inativo'}
                                                </button>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => startEdit(c)} className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all">
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5M16.242 3.758a3 3 0 114.242 4.242L12 11.314l-4 1 1-4 7.242-7.242z" /></svg>
                                                    </button>
                                                    <button onClick={() => deleteCoupon(c.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {coupons.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-12 text-center text-gray-400 italic">Nenhum cupom disponível.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
