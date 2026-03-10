'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    LayoutDashboard,
    Plus,
    User,
    Clock,
    CheckCircle2,
    AlertTriangle,
    MoreVertical,
    QrCode,
    Utensils,
    Receipt,
    X,
    ChevronRight,
    Search
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
function getToken() { return localStorage.getItem('admin_token') || ''; }

export default function TablesPage() {
    const [tables, setTables] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTable, setSelectedTable] = useState<any>(null);
    const [showNewTable, setShowNewTable] = useState(false);
    const [showOrderModal, setShowOrderModal] = useState(false);

    // Form states
    const [newTable, setNewTable] = useState({ number: '', capacity: 4, location: 'Salão' });
    const [newOrderItems, setNewOrderItems] = useState<any[]>([]);

    const loadData = useCallback(async () => {
        setLoading(true);
        const headers = { Authorization: `Bearer ${getToken()}` };
        try {
            const [tRes, pRes] = await Promise.all([
                fetch(`${API}/api/admin/tables`, { headers }),
                fetch(`${API}/api/menu/items`, { headers }) // Reusando rota de menu existente
            ]);
            if (tRes.ok) setTables(await tRes.json());
            if (pRes.ok) setProducts(await pRes.json());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleCreateTable = async (e: React.FormEvent) => {
        e.preventDefault();
        const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` };
        const res = await fetch(`${API}/api/admin/tables`, {
            method: 'POST',
            headers,
            body: JSON.stringify(newTable)
        });
        if (res.ok) {
            setShowNewTable(false);
            setNewTable({ number: '', capacity: 4, location: 'Salão' });
            loadData();
        }
    };

    const handleAddOrder = async () => {
        const total = newOrderItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
        const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` };
        const res = await fetch(`${API}/api/admin/tables/${selectedTable.id}/orders`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                items: newOrderItems,
                total_value: total
            })
        });
        if (res.ok) {
            setShowOrderModal(false);
            setNewOrderItems([]);
            loadData();
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'free': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
            case 'occupied': return 'bg-blue-50 text-blue-600 border-blue-200';
            case 'check_requested': return 'bg-amber-50 text-amber-600 border-amber-200';
            default: return 'bg-slate-50 text-slate-600 border-slate-200';
        }
    };

    if (loading) return <div className="p-8 animate-pulse text-slate-400">Carregando mapa de mesas...</div>;

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-800 flex items-center gap-4 uppercase tracking-tighter">
                        <Utensils className="text-blue-600" size={40} />
                        Gestão de Salão
                    </h1>
                    <p className="text-slate-500 font-bold">Controle em tempo real do atendimento no restaurante</p>
                </div>
                <button
                    onClick={() => setShowNewTable(true)}
                    className="bg-blue-600 text-white font-black px-8 py-4 rounded-[20px] shadow-xl shadow-blue-100 flex items-center gap-2 hover:bg-blue-700 transition active:scale-95 text-sm uppercase tracking-widest"
                >
                    <Plus size={20} /> Adicionar Mesa
                </button>
            </div>

            {/* Mapa de Mesas */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {tables.map((table) => (
                    <div
                        key={table.id}
                        onClick={() => {
                            setSelectedTable(table);
                            setShowOrderModal(true);
                        }}
                        className={`relative group cursor-pointer aspect-square bg-white border-2 rounded-[40px] p-6 flex flex-col items-center justify-center gap-4 transition-all hover:shadow-2xl hover:-translate-y-2 ${table.status === 'occupied' ? 'border-blue-500 shadow-lg shadow-blue-50' : 'border-slate-100'}`}
                    >
                        <div className={`p-4 rounded-3xl transition ${getStatusColor(table.status)}`}>
                            <Utensils size={32} />
                        </div>
                        <div className="text-center">
                            <span className="text-2xl font-black text-slate-800 uppercase leading-none">Mesa {table.number}</span>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{table.location}</p>
                        </div>

                        {table.status === 'occupied' && (
                            <div className="absolute top-4 right-4 flex gap-1">
                                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            </div>
                        )}

                        <div className="absolute inset-0 bg-blue-600 rounded-[40px] opacity-0 group-hover:opacity-10 pointer-events-none transition" />
                    </div>
                ))}

                {tables.length === 0 && (
                    <div className="col-span-full py-20 bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-200 text-center">
                        <p className="text-slate-400 font-black uppercase tracking-widest">Nenhuma mesa cadastrada. Comece adicionando uma!</p>
                    </div>
                )}
            </div>

            {/* Modal de Pedido/Comanda */}
            {showOrderModal && selectedTable && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-end">
                    <div className="bg-white w-full max-w-xl h-full shadow-2xl p-10 flex flex-col relative animate-in slide-in-from-right duration-300">
                        <button onClick={() => setShowOrderModal(false)} className="absolute top-8 left-[-60px] bg-white p-4 rounded-full shadow-xl text-slate-800 active:scale-90 transition">
                            <X size={24} />
                        </button>

                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(selectedTable.status)}`}>
                                    {selectedTable.status === 'free' ? 'Livre' : 'Em atendimento'}
                                </span>
                                <h2 className="text-4xl font-black text-slate-800 uppercase tracking-tighter mt-2">Mesa {selectedTable.number}</h2>
                            </div>
                            <div className="flex gap-2">
                                <button className="p-4 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition">
                                    <QrCode size={24} />
                                </button>
                                <button className="p-4 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition">
                                    <Receipt size={24} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-4 space-y-6">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[3px]">Novo Pedido / Lançamento</h3>
                            <div className="grid grid-cols-1 gap-3">
                                {products.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => {
                                            const existing = newOrderItems.find(i => i.id === p.id);
                                            if (existing) {
                                                setNewOrderItems(newOrderItems.map(i => i.id === p.id ? { ...i, quantity: i.quantity + 1 } : i));
                                            } else {
                                                setNewOrderItems([...newOrderItems, { ...p, quantity: 1 }]);
                                            }
                                        }}
                                        className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-blue-50 hover:text-blue-700 transition group"
                                    >
                                        <div className="flex items-center gap-4 text-left">
                                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center font-black text-blue-600 shadow-sm">
                                                {p.price.toString().slice(-2)}
                                            </div>
                                            <div>
                                                <p className="font-black uppercase text-xs">{p.name}</p>
                                                <p className="text-[10px] font-bold opacity-50">R$ {p.price.toFixed(2)}</p>
                                            </div>
                                        </div>
                                        <Plus size={20} className="opacity-0 group-hover:opacity-100 transition" />
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="pt-8 border-t border-slate-100 mt-auto">
                            <div className="space-y-4 mb-8">
                                {newOrderItems.map(item => (
                                    <div key={item.id} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-600 rounded-lg text-xs font-black">{item.quantity}x</span>
                                            <span className="font-bold text-slate-700 text-sm">{item.name}</span>
                                        </div>
                                        <span className="font-black text-slate-800 text-sm">R$ {(item.price * item.quantity).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-slate-900 rounded-[30px] p-8 text-white">
                                <div className="flex items-center justify-between mb-6">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Comanda</span>
                                    <span className="text-3xl font-black">R$ {newOrderItems.reduce((acc, i) => acc + (i.price * i.quantity), 0).toFixed(2)}</span>
                                </div>
                                <button
                                    onClick={handleAddOrder}
                                    disabled={newOrderItems.length === 0}
                                    className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl shadow-2xl shadow-blue-500/20 active:scale-95 transition disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
                                >
                                    Confirmar Pedido <ChevronRight size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Nova Mesa */}
            {showNewTable && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl p-10 relative overflow-hidden">
                        <button onClick={() => setShowNewTable(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition">
                            <X size={20} />
                        </button>
                        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-8">Cadastrar Mesa</h2>
                        <form onSubmit={handleCreateTable} className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Número da Mesa</label>
                                <input required type="text" placeholder="Ex: 01" value={newTable.number} onChange={e => setNewTable({ ...newTable, number: e.target.value })} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 transition" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Capacidade</label>
                                    <input required type="number" value={newTable.capacity} onChange={e => setNewTable({ ...newTable, capacity: parseInt(e.target.value) })} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 transition" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Localização</label>
                                    <select value={newTable.location} onChange={e => setNewTable({ ...newTable, location: e.target.value })} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 transition">
                                        <option value="Salão">Salão</option>
                                        <option value="Terraço">Terraço</option>
                                        <option value="VIP">Área VIP</option>
                                    </select>
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-100 active:scale-95 transition">SALVAR MESA</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
