'use client';

import React, { useEffect, useState, use } from 'react';

type OptionItem = {
    id: string;
    name: string;
    price_cents: number;
    available: boolean;
    sort_order: number;
};

type OptionGroup = {
    id: string;
    name: string;
    required: boolean;
    min_select: number;
    max_select: number;
    sort_order: number;
    options: OptionItem[];
};

export default function AdminMenuOptions({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [groups, setGroups] = useState<OptionGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Modals
    const [groupForm, setGroupForm] = useState<Partial<OptionGroup> | null>(null);
    const [itemForm, setItemForm] = useState<{ groupId: string; data: Partial<OptionItem> } | null>(null);

    const fetchGroups = async () => {
        try {
            const token = localStorage.getItem('admin_token');
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
            const res = await fetch(`${API_URL}/api/admin/menu/${id}/options`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Falha ao buscar opções');
            const data = await res.json();
            setGroups(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGroups();
    }, [id]);

    // --- Group Actions ---
    const handleSaveGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!groupForm) return;
        try {
            const token = localStorage.getItem('admin_token');
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
            const isUpdate = !!groupForm.id;
            const url = isUpdate
                ? `${API_URL}/api/admin/menu/options/groups/${groupForm.id}`
                : `${API_URL}/api/admin/menu/${id}/options/groups`;
            const method = isUpdate ? 'PUT' : 'POST';

            const payload = {
                ...groupForm,
                min_select: Number(groupForm.min_select || 0),
                max_select: Number(groupForm.max_select || 1),
                sort_order: Number(groupForm.sort_order || 0),
            };

            const res = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setGroupForm(null);
                fetchGroups();
            } else alert('Falha ao salvar grupo.');
        } catch (err) { alert('Erro de requisição.'); }
    };

    const handleDeleteGroup = async (groupId: string) => {
        if (!confirm('Excluir este grupo de adicionais e todos os seus itens?')) return;
        try {
            const token = localStorage.getItem('admin_token');
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
            const res = await fetch(`${API_URL}/api/admin/menu/options/groups/${groupId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) fetchGroups();
        } catch (err) { alert('Erro.'); }
    };

    // --- Item Actions ---
    const handleSaveItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!itemForm) return;
        try {
            const token = localStorage.getItem('admin_token');
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
            const isUpdate = !!itemForm.data.id;
            const url = isUpdate
                ? `${API_URL}/api/admin/menu/options/items/${itemForm.data.id}`
                : `${API_URL}/api/admin/menu/options/groups/${itemForm.groupId}/items`;
            const method = isUpdate ? 'PUT' : 'POST';

            const payload = {
                ...itemForm.data,
                price_cents: Number(itemForm.data.price_cents || 0),
                sort_order: Number(itemForm.data.sort_order || 0),
            };

            const res = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setItemForm(null);
                fetchGroups();
            } else alert('Falha ao salvar item.');
        } catch (err) { alert('Erro de requisição.'); }
    };

    const handleDeleteItem = async (itemId: string) => {
        if (!confirm('Excluir este adicional permanentemente?')) return;
        try {
            const token = localStorage.getItem('admin_token');
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
            const res = await fetch(`${API_URL}/api/admin/menu/options/items/${itemId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) fetchGroups();
        } catch (err) { alert('Erro.'); }
    };

    if (loading) return <div>Carregando opções...</div>;
    if (error) return <div className="text-red-500">{error}</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <button onClick={() => window.location.href = '/admin/menu'} className="text-purple-600 hover:underline mb-2 text-sm font-semibold">← Voltar ao Cardápio</button>
                    <h1 className="text-2xl font-bold text-gray-800">Modificadores do Produto</h1>
                </div>
                <button onClick={() => setGroupForm({ name: '', required: false, min_select: 0, max_select: 1, sort_order: 0 })} className="bg-purple-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-purple-700 transition">
                    + Novo Grupo
                </button>
            </div>

            {/* Modal: Group Form */}
            {groupForm && (
                <div className="bg-white p-6 rounded-xl shadow-lg border mb-8 animate-fade-in ring-2 ring-purple-100">
                    <h2 className="text-lg font-bold mb-4">{groupForm.id ? 'Editar Grupo' : 'Novo Grupo'}</h2>
                    <form onSubmit={handleSaveGroup} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <label className="flex flex-col text-sm text-gray-600 md:col-span-2">
                            Nome (ex: Escolha a base, Adicionais) *
                            <input required value={groupForm.name || ''} onChange={e => setGroupForm({ ...groupForm, name: e.target.value })} className="border p-2 rounded-md mt-1 outline-none focus:border-purple-500" />
                        </label>
                        <div className="flex items-center gap-2 md:col-span-1 mt-6">
                            <input type="checkbox" id="g-req" checked={groupForm.required || false} onChange={e => setGroupForm({ ...groupForm, required: e.target.checked })} />
                            <label htmlFor="g-req" className="text-sm font-bold cursor-pointer text-gray-700">Obrigatório</label>
                        </div>
                        <label className="flex flex-col text-sm text-gray-600 md:col-span-1">
                            Ordem de exibição
                            <input type="number" value={groupForm.sort_order || 0} onChange={e => setGroupForm({ ...groupForm, sort_order: parseInt(e.target.value) })} className="border p-2 rounded-md mt-1 outline-none" />
                        </label>
                        <label className="flex flex-col text-sm text-gray-600 md:col-span-2">
                            Seleção Mínima
                            <input type="number" min="0" value={groupForm.min_select || 0} onChange={e => setGroupForm({ ...groupForm, min_select: parseInt(e.target.value) })} className="border p-2 rounded-md mt-1 outline-none" />
                        </label>
                        <label className="flex flex-col text-sm text-gray-600 md:col-span-2">
                            Seleção Máxima
                            <input type="number" min="1" value={groupForm.max_select || 1} onChange={e => setGroupForm({ ...groupForm, max_select: parseInt(e.target.value) })} className="border p-2 rounded-md mt-1 outline-none" />
                        </label>
                        <div className="md:col-span-4 flex gap-3 mt-4 pt-4 border-t border-gray-100">
                            <button type="submit" className="bg-green-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-700">Salvar Grupo</button>
                            <button type="button" onClick={() => setGroupForm(null)} className="bg-gray-200 text-gray-700 font-bold py-2 px-6 rounded-lg hover:bg-gray-300">Cancelar</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Modal: Item Form */}
            {itemForm && (
                <div className="bg-white p-6 rounded-xl shadow-lg border mb-8 animate-fade-in ring-2 ring-blue-100">
                    <h2 className="text-lg font-bold mb-4">{itemForm.data.id ? 'Editar Opção' : 'Nova Opção'}</h2>
                    <form onSubmit={handleSaveItem} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <label className="flex flex-col text-sm text-gray-600 md:col-span-1">
                            Nome da Opção *
                            <input required value={itemForm.data.name || ''} onChange={e => setItemForm({ ...itemForm, data: { ...itemForm.data, name: e.target.value } })} className="border p-2 rounded-md mt-1 outline-none focus:border-blue-500" />
                        </label>
                        <label className="flex flex-col text-sm text-gray-600 md:col-span-1">
                            Preço Adicional (centavos) *
                            <input required type="number" min="0" value={itemForm.data.price_cents || 0} onChange={e => setItemForm({ ...itemForm, data: { ...itemForm.data, price_cents: parseInt(e.target.value) } })} className="border p-2 rounded-md mt-1 outline-none focus:border-blue-500" />
                        </label>
                        <label className="flex flex-col text-sm text-gray-600 md:col-span-1">
                            Ordem
                            <input type="number" value={itemForm.data.sort_order || 0} onChange={e => setItemForm({ ...itemForm, data: { ...itemForm.data, sort_order: parseInt(e.target.value) } })} className="border p-2 rounded-md mt-1 outline-none" />
                        </label>
                        <div className="flex items-center gap-2 md:col-span-3 mt-2">
                            <input type="checkbox" id="i-avail" checked={itemForm.data.available !== false} onChange={e => setItemForm({ ...itemForm, data: { ...itemForm.data, available: e.target.checked } })} />
                            <label htmlFor="i-avail" className="text-sm font-bold cursor-pointer text-gray-700">Disponível em Estoque</label>
                        </div>
                        <div className="md:col-span-3 flex gap-3 mt-4 pt-4 border-t border-gray-100">
                            <button type="submit" className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700">Salvar Opção</button>
                            <button type="button" onClick={() => setItemForm(null)} className="bg-gray-200 text-gray-700 font-bold py-2 px-6 rounded-lg hover:bg-gray-300">Cancelar</button>
                        </div>
                    </form>
                </div>
            )}

            {/* List Groups */}
            <div className="space-y-6">
                {groups.length === 0 && !groupForm && (
                    <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                        <p className="text-gray-500 font-medium">Nenhum modificador configurado.</p>
                        <p className="text-xs text-gray-400 mt-2">Ex: "Adicionais" (Mín: 0, Máx: 5)</p>
                    </div>
                )}

                {groups.map(group => (
                    <div key={group.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="bg-gray-50 p-4 border-b flex justify-between items-center">
                            <div>
                                <h3 className="font-black text-lg text-gray-800 flex items-center gap-2">
                                    {group.name}
                                    {group.required && <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">Obrigatório</span>}
                                </h3>
                                <p className="text-xs text-gray-500 mt-1 font-semibold">
                                    Escolha de {group.min_select} até {group.max_select} opções · Ordem: {group.sort_order}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setItemForm({ groupId: group.id, data: { name: '', price_cents: 0, available: true, sort_order: 0 } })} className="text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1.5 rounded-lg font-bold transition">+ Opção</button>
                                <button onClick={() => setGroupForm(group)} className="text-sm bg-gray-200 text-gray-700 hover:bg-gray-300 px-3 py-1.5 rounded-lg font-bold transition">Editar</button>
                                <button onClick={() => handleDeleteGroup(group.id)} className="text-sm border border-red-200 text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg font-bold transition">✕</button>
                            </div>
                        </div>

                        <div className="p-0">
                            {group.options.length === 0 ? (
                                <div className="p-4 text-center text-sm text-gray-400 italic">Nenhuma opção cadastrada neste grupo.</div>
                            ) : (
                                <ul className="divide-y divide-gray-50">
                                    {group.options.map((opt) => (
                                        <li key={opt.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition">
                                            <div className="flex items-center gap-3">
                                                <span className="font-semibold text-gray-800">{opt.name}</span>
                                                <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                                                    + R$ {(opt.price_cents / 100).toFixed(2).replace('.', ',')}
                                                </span>
                                                {!opt.available && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-sm uppercase tracking-wide font-black">Esgotado</span>}
                                            </div>
                                            <div className="flex gap-2 items-center">
                                                <span className="text-[10px] text-gray-400 font-mono mr-2">#{opt.sort_order}</span>
                                                <button onClick={() => setItemForm({ groupId: group.id, data: opt })} className="text-xs text-blue-600 font-semibold hover:underline">Editar</button>
                                                <span className="text-gray-300">|</span>
                                                <button onClick={() => handleDeleteItem(opt.id)} className="text-xs text-red-500 font-semibold hover:underline">Apagar</button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
