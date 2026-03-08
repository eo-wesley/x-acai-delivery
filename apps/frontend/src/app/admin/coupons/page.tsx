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
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');
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

    const createCoupon = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        setError('');
        try {
            const body: Record<string, any> = {
                code: form.code.toUpperCase().trim(),
                description: form.description || undefined,
                type: form.type,
                discount_value: form.type === 'flat'
                    ? Math.round(parseFloat(form.discount_value) * 100)
                    : Math.round(parseFloat(form.discount_value) * 100), // percent: basis points (e.g. 10% = 1000)
                min_order_cents: form.min_order_cents ? Math.round(parseFloat(form.min_order_cents) * 100) : 0,
                max_uses: form.max_uses ? parseInt(form.max_uses) : 0,
                expires_at: form.expires_at || undefined,
            };
            const res = await fetch(`${API}/api/admin/coupons?slug=${getSlug()}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (res.ok) {
                setForm({ code: '', description: '', type: 'flat', discount_value: '', min_order_cents: '', max_uses: '', expires_at: '' });
                loadCoupons();
            } else {
                setError(data.error || 'Erro ao criar cupom');
            }
        } catch { setError('Falha na comunicação'); }
        setCreating(false);
    };

    const toggleActive = async (id: string, current: number) => {
        await fetch(`${API}/api/admin/coupons/${id}`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ active: current ? 0 : 1 }),
        });
        loadCoupons();
    };

    const deleteCoupon = async (id: string) => {
        if (!confirm('Excluir este cupom?')) return;
        await fetch(`${API}/api/admin/coupons/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${getToken()}` },
        });
        loadCoupons();
    };

    return (
        <div>
            <h1 className="text-2xl font-black text-gray-800 mb-6">🎟️ Cupons de Desconto</h1>

            {/* Create Form */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
                <h2 className="font-bold text-gray-700 mb-4 text-sm uppercase tracking-widest">Criar Novo Cupom</h2>
                <form onSubmit={createCoupon} className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <input required placeholder="Código (ex: PROMO10)" className="border rounded-lg p-3 text-sm uppercase outline-none focus:border-purple-500 col-span-2 md:col-span-1"
                        value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} />
                    <input placeholder="Descrição" className="border rounded-lg p-3 text-sm outline-none focus:border-purple-500 col-span-2 md:col-span-2"
                        value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                    <select className="border rounded-lg p-3 text-sm outline-none focus:border-purple-500"
                        value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                        <option value="flat">Valor fixo (R$)</option>
                        <option value="percent">Percentual (%)</option>
                    </select>
                    <input required type="number" step="0.01" placeholder={form.type === 'flat' ? 'Desconto em R$' : 'Desconto em %'}
                        className="border rounded-lg p-3 text-sm outline-none focus:border-purple-500"
                        value={form.discount_value} onChange={e => setForm({ ...form, discount_value: e.target.value })} />
                    <input type="number" step="0.01" placeholder="Pedido mínimo (R$)" className="border rounded-lg p-3 text-sm outline-none focus:border-purple-500"
                        value={form.min_order_cents} onChange={e => setForm({ ...form, min_order_cents: e.target.value })} />
                    <input type="number" placeholder="Máx. usos (0=sem limite)" className="border rounded-lg p-3 text-sm outline-none focus:border-purple-500"
                        value={form.max_uses} onChange={e => setForm({ ...form, max_uses: e.target.value })} />
                    <input type="datetime-local" placeholder="Expira em" className="border rounded-lg p-3 text-sm outline-none focus:border-purple-500 col-span-2 md:col-span-1"
                        value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} />
                    {error && <p className="col-span-2 md:col-span-3 text-red-500 text-xs">{error}</p>}
                    <button type="submit" disabled={creating}
                        className="col-span-2 md:col-span-3 bg-purple-600 hover:bg-purple-700 text-white font-black py-3 rounded-xl disabled:opacity-50 transition">
                        {creating ? 'Criando...' : '+ Criar Cupom'}
                    </button>
                </form>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
                {loading ? (
                    <div className="p-8 text-center text-gray-400 animate-pulse">Carregando...</div>
                ) : coupons.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">Nenhum cupom ainda.</div>
                ) : (
                    <table className="w-full text-sm text-left">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-widest border-b">
                                <th className="p-4">Código</th>
                                <th className="p-4">Tipo</th>
                                <th className="p-4">Desconto</th>
                                <th className="p-4">Mín. Pedido</th>
                                <th className="p-4">Usos</th>
                                <th className="p-4">Expira</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {coupons.map(c => (
                                <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50 transition">
                                    <td className="p-4 font-black font-mono text-purple-700">{c.code}</td>
                                    <td className="p-4 text-gray-600">{c.type === 'flat' ? 'Valor fixo' : 'Percentual'}</td>
                                    <td className="p-4 font-bold text-gray-800">
                                        {c.type === 'flat'
                                            ? `R$ ${(c.discount_value / 100).toFixed(2)}`
                                            : `${c.discount_value / 100}%`}
                                    </td>
                                    <td className="p-4 text-gray-500">{c.min_order_cents > 0 ? `R$ ${(c.min_order_cents / 100).toFixed(2)}` : '—'}</td>
                                    <td className="p-4 text-gray-500">{c.used_count}/{c.max_uses === 0 ? '∞' : c.max_uses}</td>
                                    <td className="p-4 text-gray-500 text-xs">{c.expires_at ? new Date(c.expires_at).toLocaleDateString('pt-BR') : '—'}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${c.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                            {c.active ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </td>
                                    <td className="p-4 flex gap-2">
                                        <button onClick={() => toggleActive(c.id, c.active)}
                                            className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg font-bold text-gray-700 transition">
                                            {c.active ? 'Desativar' : 'Ativar'}
                                        </button>
                                        <button onClick={() => deleteCoupon(c.id)}
                                            className="text-xs bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg font-bold text-red-500 transition">
                                            Excluir
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
