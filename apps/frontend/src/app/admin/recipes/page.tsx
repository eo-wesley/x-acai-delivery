'use client';

import React, { useEffect, useState } from 'react';

export default function RecipesPage() {
    const [recipesSummary, setRecipesSummary] = useState<any[]>([]);
    const [inventory, setInventory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
    const [recipeDetails, setRecipeDetails] = useState<any>(null);

    const [newItem, setNewItem] = useState({ inventory_item_id: '', qty: 0, unit: 'un' });

    const fetchData = async (slug = 'default') => {
        setLoading(true);
        try {
            const token = localStorage.getItem('admin_token');
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
            const headers = { 'Authorization': `Bearer ${token}` };

            const [recRes, invRes] = await Promise.all([
                fetch(`${API_URL}/api/admin/recipes?slug=${slug}`, { headers }),
                fetch(`${API_URL}/api/admin/inventory?slug=${slug}`, { headers })
            ]);

            if (recRes.ok) setRecipesSummary(await recRes.json());
            if (invRes.ok) setInventory(await invRes.json());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchRecipeDetails = async (menuItemId: string) => {
        const slug = localStorage.getItem('admin_slug') || 'default';
        const token = localStorage.getItem('admin_token');
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

        try {
            const res = await fetch(`${API_URL}/api/admin/recipes/${menuItemId}?slug=${slug}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setRecipeDetails({
                    ...data,
                    items: data.items || []
                });
            }
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        const slug = localStorage.getItem('admin_slug') || 'default';
        fetchData(slug);

        const handleTenantChange = () => {
            setSelectedMenuId(null);
            fetchData(localStorage.getItem('admin_slug') || 'default');
        };
        window.addEventListener('tenant_changed', handleTenantChange);
        return () => window.removeEventListener('tenant_changed', handleTenantChange);
    }, []);

    const handleSelectMenu = (id: string) => {
        setSelectedMenuId(id);
        fetchRecipeDetails(id);
    };

    const handleAddItem = () => {
        if (!newItem.inventory_item_id || newItem.qty <= 0) return;

        const invItem = inventory.find(i => i.id === newItem.inventory_item_id);
        const addedUnit = newItem.unit || invItem?.unit || 'un';

        setRecipeDetails((prev: any) => ({
            ...prev,
            items: [...prev.items, {
                inventory_item_id: newItem.inventory_item_id,
                qty: newItem.qty,
                unit: addedUnit,
                inventory_name: invItem?.name || 'Item Desconhecido'
            }]
        }));
        setNewItem({ inventory_item_id: '', qty: 0, unit: 'un' });
    };

    const handleRemoveItem = (index: number) => {
        setRecipeDetails((prev: any) => {
            const newItems = [...prev.items];
            newItems.splice(index, 1);
            return { ...prev, items: newItems };
        });
    };

    const handleSaveRecipe = async () => {
        if (!selectedMenuId) return;

        const slug = localStorage.getItem('admin_slug') || 'default';
        const token = localStorage.getItem('admin_token');
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

        try {
            await fetch(`${API_URL}/api/admin/recipes?slug=${slug}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    menuItemId: selectedMenuId,
                    name: `Receita Padrão`,
                    items: recipeDetails.items.map((i: any) => ({
                        inventory_item_id: i.inventory_item_id,
                        qty: i.qty,
                        unit: i.unit
                    }))
                })
            });
            alert('Receita salva com sucesso!');
            fetchData(slug); // Refresh summary badges
        } catch (e) {
            console.error('Failed to save recipe', e);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-black text-gray-800 flex items-center gap-2">
                📝 Fichas Técnicas (Receitas)
            </h1>

            {loading ? (
                <div className="text-gray-500 font-bold p-8 text-center animate-pulse">Carregando Cardápio...</div>
            ) : (
                <div className="flex flex-col xl:flex-row gap-6">
                    {/* Lista de Produtos */}
                    <div className="xl:w-1/3 bg-white border border-gray-200 rounded-xl shadow-sm p-4 h-fit max-h-[800px] overflow-y-auto">
                        <h2 className="font-bold text-gray-800 mb-4 sticky top-0 bg-white pb-2 border-b">Produtos do Cardápio</h2>
                        <div className="space-y-2">
                            {recipesSummary.map(r => (
                                <button
                                    key={r.menu_item_id}
                                    onClick={() => handleSelectMenu(r.menu_item_id)}
                                    className={`w-full text-left p-3 rounded-lg flex justify-between items-center transition ${selectedMenuId === r.menu_item_id ? 'bg-purple-100 border-purple-300 border' : 'bg-gray-50 hover:bg-gray-100 border border-transparent'}`}
                                >
                                    <span className="font-bold text-gray-700 text-sm truncate">{r.menu_name}</span>
                                    {r.recipe_id ? (
                                        <span className="bg-green-100 text-green-700 text-[10px] font-black px-2 py-1 rounded">BOM OK</span>
                                    ) : (
                                        <span className="bg-red-100 text-red-700 text-[10px] font-black px-2 py-1 rounded">SEM RECEITA</span>
                                    )}
                                </button>
                            ))}
                            {recipesSummary.length === 0 && <p className="text-xs text-center text-gray-400 py-4">Cardápio vazio.</p>}
                        </div>
                    </div>

                    {/* Detalhe da Receita (BOM) */}
                    <div className="xl:w-2/3 bg-white border border-gray-200 rounded-xl shadow-sm p-6 overflow-hidden">
                        {!selectedMenuId || !recipeDetails ? (
                            <div className="h-full flex flex-col justify-center items-center text-gray-400 py-20">
                                <span className="text-4xl mb-4">🍽️</span>
                                <p>Selecione um produto do cardápio ao lado para montar a receita.</p>
                            </div>
                        ) : (
                            <div>
                                <div className="flex justify-between items-center mb-6 pb-4 border-b">
                                    <h2 className="text-2xl font-black text-gray-800">
                                        Montagem: {recipesSummary.find(r => r.menu_item_id === selectedMenuId)?.menu_name}
                                    </h2>
                                    <button onClick={handleSaveRecipe} className="bg-green-600 text-white font-bold px-6 py-2 rounded-lg hover:bg-green-700 shadow flex items-center gap-2">
                                        💾 Salvar Receita
                                    </button>
                                </div>

                                {/* Form Add Item */}
                                <div className="bg-gray-50 p-4 rounded-xl border flex gap-3 flex-wrap items-end mb-6">
                                    <div className="flex-1 min-w-[200px]">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Insumo</label>
                                        <select
                                            className="w-full border p-2 mt-1 rounded outline-none"
                                            value={newItem.inventory_item_id}
                                            onChange={e => setNewItem({ ...newItem, inventory_item_id: e.target.value })}
                                        >
                                            <option value="">-- Selecione do Estoque --</option>
                                            {inventory.map(i => (
                                                <option key={i.id} value={i.id}>{i.name} (Estoque: {i.current_qty}{i.unit})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="w-24">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Gasto</label>
                                        <input type="number" step="0.01" className="w-full border p-2 mt-1 rounded outline-none" value={newItem.qty} onChange={e => setNewItem({ ...newItem, qty: parseFloat(e.target.value) })} />
                                    </div>
                                    <div className="w-20">
                                        <label className="text-xs font-bold text-gray-500 uppercase">UN</label>
                                        <select className="w-full border p-2 mt-1 rounded outline-none bg-white" value={newItem.unit} onChange={e => setNewItem({ ...newItem, unit: e.target.value })}>
                                            <option value="un">un</option>
                                            <option value="ml">ml</option>
                                            <option value="g">g</option>
                                            <option value="kg">kg</option>
                                        </select>
                                    </div>
                                    <button type="button" onClick={handleAddItem} className="bg-gray-800 text-white font-bold px-4 py-2 rounded hover:bg-gray-900">
                                        + Add
                                    </button>
                                </div>

                                {/* BOM Items Table */}
                                <h3 className="font-bold text-gray-700 mb-3">Ingredientes (BOM)</h3>
                                {recipeDetails.items.length === 0 ? (
                                    <div className="text-center p-8 bg-red-50 text-red-500 rounded-lg border border-red-100 font-bold border-dashed">
                                        Nenhum ingrediente. Este produto não dará baixa automática no estoque!
                                    </div>
                                ) : (
                                    <div className="bg-white border rounded-lg overflow-hidden">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-gray-50 border-b text-gray-600 font-bold">
                                                <tr>
                                                    <th className="p-3">Insumo Base</th>
                                                    <th className="p-3">Quantidade por Venda</th>
                                                    <th className="p-3 text-right">Ação</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {recipeDetails.items.map((item: any, idx: number) => (
                                                    <tr key={idx} className="border-b hover:bg-gray-50">
                                                        <td className="p-3 font-semibold text-gray-800">{item.inventory_name}</td>
                                                        <td className="p-3 text-red-600 font-bold">
                                                            - {item.qty} <span className="text-gray-400 text-xs">{item.unit}</span>
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            <button onClick={() => handleRemoveItem(idx)} className="text-red-500 hover:bg-red-50 p-1 px-2 rounded font-bold">Remover</button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
