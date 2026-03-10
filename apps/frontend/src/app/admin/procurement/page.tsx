'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Plus,
    Search,
    Truck,
    ShoppingBag,
    History,
    Save,
    X,
    ChevronRight,
    ArrowLeft,
    AlertCircle,
    Calendar,
    Users
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
function getToken() { return localStorage.getItem('admin_token') || ''; }

const R = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;

export default function ProcurementPage() {
    const [view, setView] = useState<'purchases' | 'suppliers'>('purchases');
    const [purchases, setPurchases] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [inventory, setInventory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewPurchase, setShowNewPurchase] = useState(false);
    const [showNewSupplier, setShowNewSupplier] = useState(false);

    // Form states
    const [newSupplier, setNewSupplier] = useState({ name: '', contact_name: '', phone: '', email: '', category: 'food' });
    const [newPurchase, setNewPurchase] = useState({
        supplier_id: '',
        observation: '',
        items: [{ inventory_item_id: '', quantity: 1, unit_price_cents: 0 }]
    });

    const loadData = useCallback(async () => {
        setLoading(true);
        const headers = { Authorization: `Bearer ${getToken()}` };
        try {
            const [pRes, sRes, iRes] = await Promise.all([
                fetch(`${API}/api/admin/procurement/purchases`, { headers }),
                fetch(`${API}/api/admin/procurement/suppliers`, { headers }),
                fetch(`${API}/api/admin/inventory`, { headers })
            ]);
            if (pRes.ok) setPurchases(await pRes.json());
            if (sRes.ok) setSuppliers(await sRes.json());
            if (iRes.ok) setInventory(await iRes.json());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleCreateSupplier = async (e: React.FormEvent) => {
        e.preventDefault();
        const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` };
        const res = await fetch(`${API}/api/admin/procurement/suppliers`, {
            method: 'POST',
            headers,
            body: JSON.stringify(newSupplier)
        });
        if (res.ok) {
            setShowNewSupplier(false);
            setNewSupplier({ name: '', contact_name: '', phone: '', email: '', category: 'food' });
            loadData();
        }
    };

    const handleRecordPurchase = async (e: React.FormEvent) => {
        e.preventDefault();
        const totalValue = newPurchase.items.reduce((acc, item) => acc + (item.quantity * item.unit_price_cents), 0);
        const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` };
        const res = await fetch(`${API}/api/admin/procurement/purchases`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ ...newPurchase, total_value_cents: totalValue })
        });
        if (res.ok) {
            setShowNewPurchase(false);
            setNewPurchase({
                supplier_id: '',
                observation: '',
                items: [{ inventory_item_id: '', quantity: 1, unit_price_cents: 0 }]
            });
            loadData();
        }
    };

    if (loading) return <div className="p-8 animate-pulse text-slate-400">Carregando suprimentos...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3 uppercase tracking-tight">
                        <ShoppingBag className="text-blue-600" size={32} />
                        Gestão de Compras
                    </h1>
                    <p className="text-slate-500 font-medium">Controle de fornecedores e entrada de insumos</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setView('purchases')}
                        className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition ${view === 'purchases' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100'}`}
                    >
                        Histórico de Compras
                    </button>
                    <button
                        onClick={() => setView('suppliers')}
                        className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition ${view === 'suppliers' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100'}`}
                    >
                        Fornecedores
                    </button>
                </div>
            </div>

            {view === 'purchases' ? (
                <div className="space-y-6">
                    <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <History size={20} className="text-blue-500" />
                                Últimas Aquisições
                            </h3>
                            <button
                                onClick={() => setShowNewPurchase(true)}
                                className="bg-emerald-500 text-white font-black px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-emerald-600 transition active:scale-95 text-xs uppercase tracking-widest shadow-lg shadow-emerald-100"
                            >
                                <Plus size={18} /> Registrar Compra
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                                        <th className="pb-4 px-2">Data</th>
                                        <th className="pb-4 px-2">Fornecedor</th>
                                        <th className="pb-4 px-2">Valor Total</th>
                                        <th className="pb-4 px-2 text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {purchases.map((p) => (
                                        <tr key={p.id} className="group hover:bg-slate-50/50 transition">
                                            <td className="py-4 px-2 text-sm font-bold text-slate-600">
                                                {new Date(p.purchase_date).toLocaleDateString('pt-BR')}
                                            </td>
                                            <td className="py-4 px-2 text-sm font-black text-slate-800">
                                                {p.supplier_name}
                                            </td>
                                            <td className="py-4 px-2 text-sm font-black text-blue-600">
                                                {R(p.total_value_cents)}
                                            </td>
                                            <td className="py-4 px-2 text-right">
                                                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                    Concluída
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {purchases.length === 0 && (
                                        <tr><td colSpan={4} className="py-8 text-center text-slate-400 font-medium">Nenhuma compra registrada.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <button
                        onClick={() => setShowNewSupplier(true)}
                        className="bg-white border-2 border-dashed border-slate-200 p-8 rounded-[40px] flex flex-col items-center justify-center gap-4 hover:border-blue-400 hover:bg-blue-50/20 transition group"
                    >
                        <div className="p-4 bg-slate-50 rounded-2xl text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition">
                            <Plus size={32} />
                        </div>
                        <span className="font-black text-slate-500 uppercase tracking-widest text-xs">Adicionar Fornecedor</span>
                    </button>

                    {suppliers.map(s => (
                        <div key={s.id} className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 hover:shadow-md transition">
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
                                    <Truck size={24} />
                                </div>
                                <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest">
                                    {s.category}
                                </span>
                            </div>
                            <h3 className="text-xl font-black text-slate-800 mb-1">{s.name}</h3>
                            <p className="text-sm text-slate-500 font-medium">{s.contact_name || 'Sem contato'}</p>
                            <div className="mt-4 pt-4 border-t border-slate-50 space-y-2">
                                <p className="text-xs text-slate-400 flex items-center gap-2"><Users size={14} /> {s.phone || '-'}</p>
                                <p className="text-xs text-slate-400 flex items-center gap-2">✉ {s.email || '-'}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal Novo Fornecedor */}
            {showNewSupplier && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl p-10 relative overflow-hidden">
                        <button onClick={() => setShowNewSupplier(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition">
                            <X size={20} />
                        </button>
                        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-8">Novo Fornecedor</h2>
                        <form onSubmit={handleCreateSupplier} className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Nome da Empresa</label>
                                <input required type="text" value={newSupplier.name} onChange={e => setNewSupplier({ ...newSupplier, name: e.target.value })} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 transition" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Contato</label>
                                    <input type="text" value={newSupplier.contact_name} onChange={e => setNewSupplier({ ...newSupplier, contact_name: e.target.value })} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 transition" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Telefone</label>
                                    <input type="text" value={newSupplier.phone} onChange={e => setNewSupplier({ ...newSupplier, phone: e.target.value })} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 transition" />
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-100 active:scale-95 transition">SALVAR FORNECEDOR</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Registrar Compra */}
            {showNewPurchase && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl p-10 relative max-h-[90vh] overflow-y-auto">
                        <button onClick={() => setShowNewPurchase(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition">
                            <X size={20} />
                        </button>
                        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-8">Registrar Compra</h2>
                        <form onSubmit={handleRecordPurchase} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Fornecedor</label>
                                    <select required value={newPurchase.supplier_id} onChange={e => setNewPurchase({ ...newPurchase, supplier_id: e.target.value })} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 transition">
                                        <option value="">Selecione...</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Observação</label>
                                    <input type="text" value={newPurchase.observation} onChange={e => setNewPurchase({ ...newPurchase, observation: e.target.value })} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 transition" placeholder="Ex: NF 1234" />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Itens da Compra</h4>
                                    <button type="button" onClick={() => setNewPurchase({ ...newPurchase, items: [...newPurchase.items, { inventory_item_id: '', quantity: 1, unit_price_cents: 0 }] })} className="text-blue-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-1 hover:underline">
                                        <Plus size={14} /> Adicionar Item
                                    </button>
                                </div>
                                {newPurchase.items.map((item, idx) => (
                                    <div key={idx} className="bg-slate-50 p-6 rounded-3xl grid grid-cols-1 md:grid-cols-4 gap-4 items-end relative">
                                        <div className="md:col-span-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] mb-2 block">Insumo</label>
                                            <select required value={item.inventory_item_id} onChange={e => {
                                                const items = [...newPurchase.items];
                                                items[idx].inventory_item_id = e.target.value;
                                                setNewPurchase({ ...newPurchase, items });
                                            }} className="w-full bg-white border-none rounded-2xl p-3 font-bold text-slate-700">
                                                <option value="">Selecione...</option>
                                                {inventory.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] mb-2 block">Qtd</label>
                                            <input required type="number" step="any" value={item.quantity} onChange={e => {
                                                const items = [...newPurchase.items];
                                                items[idx].quantity = parseFloat(e.target.value);
                                                setNewPurchase({ ...newPurchase, items });
                                            }} className="w-full bg-white border-none rounded-2xl p-3 font-bold text-slate-700" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] mb-2 block">Preço Unit. (Cents)</label>
                                            <input required type="number" value={item.unit_price_cents} onChange={e => {
                                                const items = [...newPurchase.items];
                                                items[idx].unit_price_cents = parseInt(e.target.value);
                                                setNewPurchase({ ...newPurchase, items });
                                            }} className="w-full bg-white border-none rounded-2xl p-3 font-bold text-slate-700" />
                                        </div>
                                        {idx > 0 && (
                                            <button type="button" onClick={() => setNewPurchase({ ...newPurchase, items: newPurchase.items.filter((_, i) => i !== idx) })} className="absolute -top-2 -right-2 bg-red-100 text-red-600 p-1.5 rounded-full hover:bg-red-200 transition">
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="bg-blue-50 p-8 rounded-[32px] flex items-center justify-between border border-blue-100">
                                <div>
                                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Valor Total da Compra</p>
                                    <h3 className="text-3xl font-black text-blue-900">{R(newPurchase.items.reduce((acc, i) => acc + (i.quantity * i.unit_price_cents), 0))}</h3>
                                </div>
                                <button type="submit" className="bg-blue-600 text-white font-black px-10 py-5 rounded-2xl shadow-xl shadow-blue-200 active:scale-95 transition">
                                    CONCLUIR COMPRA
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
