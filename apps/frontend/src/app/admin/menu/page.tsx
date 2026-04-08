'use client';

import React, { useEffect, useState } from 'react';

type MenuItem = {
    id: string;
    name: string;
    description: string;
    price_cents: number;
    category: string;
    sort_order: number;
    available: boolean;
    image_url: string;
};

export default function AdminMenu() {
    const [menu, setMenu] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isEditing, setIsEditing] = useState<MenuItem | null>(null);

    const [formItem, setFormItem] = useState<Partial<MenuItem>>({});

    const fetchMenu = async () => {
        try {
            const token = localStorage.getItem('admin_token');
            const slug = localStorage.getItem('admin_slug') || 'default';
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
            const res = await fetch(`${API_URL}/api/admin/menu?slug=${slug}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Falha ao buscar cardápio');
            const data = await res.json();
            setMenu(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMenu();
        const onTenantChanged = () => { fetchMenu(); };
        window.addEventListener('tenant_changed', onTenantChanged);
        return () => window.removeEventListener('tenant_changed', onTenantChanged);
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja apagar?')) return;
        try {
            const token = localStorage.getItem('admin_token');
            const slug = localStorage.getItem('admin_slug') || 'default';
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
            await fetch(`${API_URL}/api/admin/menu/${id}?slug=${slug}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setMenu(menu.filter(m => m.id !== id));
        } catch (err) {
            alert('Falha ao deletar item');
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('admin_token');
            const slug = localStorage.getItem('admin_slug') || 'default';
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

            const isUpdate = !!formItem.id;
            const url = isUpdate ? `${API_URL}/api/admin/menu/${formItem.id}?slug=${slug}` : `${API_URL}/api/admin/menu?slug=${slug}`;
            const method = isUpdate ? 'PUT' : 'POST';

            // Ensure price is integer cents
            const payload = {
                ...formItem,
                price_cents: Math.round(Number(formItem.price_cents)),
                sort_order: Math.max(0, Math.round(Number(formItem.sort_order ?? 0)))
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
                setFormItem({});
                setIsEditing(null);
                fetchMenu(); // reload list
            } else {
                alert('Falha ao salvar. Verifique permissões.');
            }
        } catch (err) {
            alert('Erro de requisição.');
        }
    };

    const openEdit = (item: MenuItem) => {
        setIsEditing(item);
        setFormItem(item);
    };

    const openNew = () => {
        setIsEditing(null);
        const nextSortOrder = menu.length > 0
            ? Math.max(...menu.map(item => Number(item.sort_order ?? 0))) + 1
            : 0;
        setFormItem({ name: '', description: '', price_cents: 0, category: '', sort_order: nextSortOrder, available: true, image_url: '' });
    };

    if (loading) return <div>Carregando cardápio...</div>;
    if (error) return <div className="text-red-500 font-bold">{error}</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Gerenciador de Cardápio</h1>
                <button onClick={openNew} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-purple-700 transition">
                    + Novo Produto
                </button>
            </div>

            {/* Modal de Formulário (inline version prop design pattern) */}
            {Object.keys(formItem).length > 0 && (
                <div className="bg-white p-6 rounded-xl shadow-lg border mb-8 animate-fade-in">
                    <h2 className="text-lg font-bold mb-4">{isEditing ? 'Editar Produto' : 'Adicionar Novo Produto'}</h2>
                    <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="flex flex-col text-sm text-gray-600">
                            Nome *
                            <input required value={formItem.name || ''} onChange={e => setFormItem({ ...formItem, name: e.target.value })} className="border p-2 rounded-md mt-1 outline-none focus:border-purple-500" />
                        </label>
                        <label className="flex flex-col text-sm text-gray-600">
                            Categoria
                            <input value={formItem.category || ''} onChange={e => setFormItem({ ...formItem, category: e.target.value })} className="border p-2 rounded-md mt-1 outline-none focus:border-purple-500" />
                        </label>
                        <label className="flex flex-col text-sm text-gray-600">
                            Preço (em centavos, ex: 1500 = R$15) *
                            <input required type="number" value={formItem.price_cents || 0} onChange={e => setFormItem({ ...formItem, price_cents: parseInt(e.target.value) })} className="border p-2 rounded-md mt-1 outline-none focus:border-purple-500" />
                        </label>
                        <label className="flex flex-col text-sm text-gray-600">
                            Ordem no cardapio
                            <input type="number" min="0" value={formItem.sort_order ?? 0} onChange={e => setFormItem({ ...formItem, sort_order: parseInt(e.target.value) || 0 })} className="border p-2 rounded-md mt-1 outline-none focus:border-purple-500" />
                        </label>
                        <label className="flex flex-col text-sm text-gray-600">
                            Imagem URL
                            <input value={formItem.image_url || ''} onChange={e => setFormItem({ ...formItem, image_url: e.target.value })} className="border p-2 rounded-md mt-1 outline-none focus:border-purple-500" />
                        </label>
                        <label className="flex flex-col md:col-span-2 text-sm text-gray-600">
                            Descrição
                            <textarea value={formItem.description || ''} onChange={e => setFormItem({ ...formItem, description: e.target.value })} className="border p-2 rounded-md mt-1 outline-none focus:border-purple-500" rows={3}></textarea>
                        </label>
                        <div className="md:col-span-2 flex items-center gap-2 mt-2">
                            <input type="checkbox" id="avail" checked={formItem.available !== false} onChange={e => setFormItem({ ...formItem, available: e.target.checked })} />
                            <label htmlFor="avail" className="text-sm font-semibold cursor-pointer">Produto Disponível no App</label>
                        </div>
                        <div className="md:col-span-2 flex gap-3 mt-4">
                            <button type="submit" className="bg-green-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-700">
                                Salvar Produto
                            </button>
                            <button type="button" onClick={() => { setFormItem({}); setIsEditing(null); }} className="bg-gray-200 text-gray-700 font-bold py-2 px-6 rounded-lg hover:bg-gray-300">
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {menu.map(item => (
                    <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col gap-3">
                        <div className="flex gap-4">
                            <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                {item.image_url ? (
                                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">Sem Img</div>
                                )}
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                    {item.name}
                                    {!item.available && <span className="bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded-full">Inativo</span>}
                                </h3>
                                <p className="text-sm font-semibold text-purple-600">R$ {(item.price_cents / 100).toFixed(2)}</p>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md inline-block">{item.category || 'Sem Categoria'}</span>
                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md inline-block">Ordem #{item.sort_order ?? 0}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-auto pt-3 border-t">
                            <button onClick={() => { window.location.href = `/admin/menu/${item.id}/options` }} className="flex-1 text-sm bg-purple-50 text-purple-600 py-2 rounded-lg font-semibold hover:bg-purple-100 transition">Opções</button>
                            <button onClick={() => openEdit(item)} className="flex-1 text-sm bg-blue-50 text-blue-600 py-2 rounded-lg font-semibold hover:bg-blue-100 transition">Editar</button>
                            <button onClick={() => handleDelete(item.id)} className="flex-1 text-sm bg-red-50 text-red-600 py-2 rounded-lg font-semibold hover:bg-red-100 transition">Apagar</button>
                        </div>
                    </div>
                ))}
                {menu.length === 0 && (
                    <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center text-gray-500 py-8">Cardápio Vazio.</div>
                )}
            </div>
        </div>
    );
}
