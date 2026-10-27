'use client';

import React, { useEffect, useState } from 'react';

type CostProfileState = {
    id: string;
    purchase_price_cents: number;
    purchase_quantity: number;
    purchase_unit: 'g' | 'kg' | 'ml' | 'l' | 'un';
    yield_percent: number;
    cost_evidence_state: 'unvalidated' | 'informed' | 'measured' | 'invoice';
};

export default function InventoryPage() {
    const [items, setItems] = useState<any[]>([]);
    const [forecasts, setForecasts] = useState<any[]>([]);
    const [movements, setMovements] = useState<any[]>([]);
    const [consumption, setConsumption] = useState<any[]>([]);
    const [mktLogs, setMktLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [showItemForm, setShowItemForm] = useState(false);
    const [newItem, setNewItem] = useState({
        name: '', unit: 'un', current_qty: 0, min_stock: 0, acquisition_cost_cents: 0,
        purchase_price_cents: 0, purchase_quantity: 1, purchase_unit: 'un', yield_percent: 100,
        cost_evidence_state: 'unvalidated'
    });

    const [adjustState, setAdjustState] = useState<{ id: string, qty: number, reason: string } | null>(null);
    const [costProfile, setCostProfile] = useState<CostProfileState | null>(null);
    const updateCostProfile = (patch: Partial<CostProfileState>) => {
        setCostProfile(current => current ? { ...current, ...patch } : current);
    };

    const fetchData = async (slug = 'default') => {
        setLoading(true);
        try {
            const token = localStorage.getItem('admin_token');
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
            const headers = { 'Authorization': `Bearer ${token}` };

            const [invRes, moveRes, foreRes, consRes, logsRes] = await Promise.all([
                fetch(`${API_URL}/api/admin/inventory?slug=${slug}`, { headers }),
                fetch(`${API_URL}/api/admin/inventory/movements?slug=${slug}`, { headers }),
                fetch(`${API_URL}/api/admin/ai/forecast?slug=${slug}`, { headers }),
                fetch(`${API_URL}/api/admin/inventory/consumption-by-channel?slug=${slug}`, { headers }),
                fetch(`${API_URL}/api/${slug}/marketplace/logs`, { headers })
            ]);

            if (invRes.ok) setItems(await invRes.json());
            if (moveRes.ok) setMovements(await moveRes.json());
            if (foreRes.ok) setForecasts(await foreRes.json());
            if (consRes.ok) setConsumption(await consRes.json());
            if (logsRes.ok) setMktLogs(await logsRes.json());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const slug = localStorage.getItem('admin_slug') || 'default';
        fetchData(slug);

        const handleTenantChange = () => fetchData(localStorage.getItem('admin_slug') || 'default');
        window.addEventListener('tenant_changed', handleTenantChange);
        return () => window.removeEventListener('tenant_changed', handleTenantChange);
    }, []);

    const handleCreateItem = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('admin_token');
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        const slug = localStorage.getItem('admin_slug') || 'default';

        try {
            await fetch(`${API_URL}/api/admin/inventory?slug=${slug}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(newItem)
            });
            setShowItemForm(false);
            setNewItem({
                name: '', unit: 'un', current_qty: 0, min_stock: 0, acquisition_cost_cents: 0,
                purchase_price_cents: 0, purchase_quantity: 1, purchase_unit: 'un', yield_percent: 100,
                cost_evidence_state: 'unvalidated'
            });
            fetchData(slug);
        } catch (e) {
            console.error(e);
        }
    };

    const handleCostProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!costProfile) return;
        const token = localStorage.getItem('admin_token');
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        const slug = localStorage.getItem('admin_slug') || 'default';
        const response = await fetch(`${API_URL}/api/admin/inventory/${costProfile.id}?slug=${slug}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
                purchase_price_cents: costProfile.purchase_price_cents,
                purchase_quantity: costProfile.purchase_quantity,
                purchase_unit: costProfile.purchase_unit,
                yield_percent: costProfile.yield_percent,
                cost_evidence_state: costProfile.cost_evidence_state
            })
        });
        if (!response.ok) throw new Error('Não foi possível salvar o perfil de compra.');
        setCostProfile(null);
        await fetchData(slug);
    };

    const handleAdjust = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!adjustState) return;

        const token = localStorage.getItem('admin_token');
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        const slug = localStorage.getItem('admin_slug') || 'default';

        try {
            await fetch(`${API_URL}/api/admin/inventory/${adjustState.id}/adjust?slug=${slug}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ qty: adjustState.qty, reason: adjustState.reason })
            });
            setAdjustState(null);
            fetchData(slug);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-black text-gray-800 flex items-center gap-2">
                    📦 Estoque e Insumos
                </h1>
                <button
                    onClick={() => setShowItemForm(!showItemForm)}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-purple-700 transition"
                >
                    + Novo Insumo
                </button>
            </div>

            {showItemForm && (
                <form onSubmit={handleCreateItem} className="bg-white p-6 rounded-xl shadow-sm border border-purple-100 flex gap-4 items-end flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                        <label className="text-xs font-bold text-gray-500 uppercase">Nome</label>
                        <input required type="text" className="w-full border p-2 mt-1 rounded outline-none focus:ring-1 focus:ring-purple-500" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Unidade</label>
                        <select className="w-full border p-2 mt-1 rounded outline-none bg-white" value={newItem.unit} onChange={e => setNewItem({ ...newItem, unit: e.target.value })}>
                            <option value="un">un</option>
                            <option value="ml">ml</option>
                            <option value="g">g</option>
                            <option value="kg">kg</option>
                            <option value="l">l</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Estoque Atual</label>
                        <input required type="number" step="0.01" className="w-full border p-2 mt-1 rounded outline-none w-24" value={newItem.current_qty} onChange={e => setNewItem({ ...newItem, current_qty: parseFloat(e.target.value) })} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Estoque Mínimo</label>
                        <input required type="number" step="0.01" className="w-full border p-2 mt-1 rounded outline-none w-24" value={newItem.min_stock} onChange={e => setNewItem({ ...newItem, min_stock: parseFloat(e.target.value) })} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Custo (R$)</label>
                        <input required type="number" step="0.01" className="w-full border p-2 mt-1 rounded outline-none w-28" placeholder="0,00" value={newItem.acquisition_cost_cents / 100} onChange={e => setNewItem({ ...newItem, acquisition_cost_cents: Math.round(parseFloat(e.target.value) * 100) })} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Preço da compra (R$)</label>
                        <input required type="number" min="0" step="0.01" className="w-32 border p-2 mt-1 rounded outline-none" value={newItem.purchase_price_cents / 100} onChange={e => setNewItem({ ...newItem, purchase_price_cents: Math.round(Number(e.target.value || 0) * 100) })} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Conteúdo comprado</label>
                        <input required type="number" min="0.0001" step="0.01" className="w-28 border p-2 mt-1 rounded outline-none" value={newItem.purchase_quantity} onChange={e => setNewItem({ ...newItem, purchase_quantity: Number(e.target.value || 0) })} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Unidade da compra</label>
                        <select className="w-24 border p-2 mt-1 rounded outline-none bg-white" value={newItem.purchase_unit} onChange={e => setNewItem({ ...newItem, purchase_unit: e.target.value })}>
                            <option value="g">g</option><option value="kg">kg</option><option value="ml">ml</option><option value="l">l</option><option value="un">un</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Rendimento (%)</label>
                        <input required type="number" min="0.01" max="100" step="0.01" className="w-24 border p-2 mt-1 rounded outline-none" value={newItem.yield_percent} onChange={e => setNewItem({ ...newItem, yield_percent: Number(e.target.value || 0) })} />
                    </div>
                    <button type="submit" className="bg-green-600 text-white font-bold p-2 px-6 rounded hover:bg-green-700">Salvar</button>
                </form>
            )}

            {loading ? (
                <div className="text-gray-500 font-bold p-8 text-center animate-pulse">Carregando Estoque...</div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <div className="xl:col-span-2 space-y-4">
                        <h2 className="text-xl font-bold text-gray-800">Insumos Cadastrados</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {items.map(item => {
                                // A zero minimum means "not configured"; it must not
                                // paint every empty item as a low-stock alert.
                                const isAlert = item.min_stock > 0 && item.current_qty <= item.min_stock;
                                return (
                                    <div key={item.id} className={`bg-white border-l-4 p-5 rounded-xl shadow-sm hover:shadow-md transition ${isAlert ? 'border-red-500' : 'border-green-500'}`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-lg text-gray-800">{item.name}</h3>
                                            <div className="flex flex-col items-end">
                                                <span className="text-gray-500 text-[10px] font-black bg-gray-100 px-2 py-1 rounded uppercase tracking-tighter mb-1">{item.unit}</span>
                                                <div className="flex items-center gap-1">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                                    <span className="text-[9px] font-black text-purple-400 uppercase tracking-tight">Sync iFood</span>
                                                </div>
                                                <span className="text-purple-600 text-xs font-bold">R$ {(item.acquisition_cost_cents / 100).toFixed(2)} / {item.unit}</span>
                                            </div>
                                        </div>

                                        {item.purchase_price_cents != null && item.purchase_quantity > 0 ? (
                                            <div className="mb-4 rounded-lg border border-purple-100 bg-purple-50 p-3 text-xs text-purple-900">
                                                <div className="font-black uppercase">Perfil de compra</div>
                                                <div className="mt-1">R$ {(item.purchase_price_cents / 100).toFixed(2)} por {item.purchase_quantity} {item.purchase_unit} · rendimento {item.yield_percent ?? 100}%</div>
                                                <div className="mt-1 text-[10px] font-bold uppercase text-purple-500">Evidência: {item.cost_evidence_state || 'não validada'}</div>
                                            </div>
                                        ) : (
                                            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800">Perfil de compra pendente: o custeio ficará provisório.</div>
                                        )}

                                        <div className="flex justify-between items-center mb-4 text-sm">
                                            <div className="text-gray-600">
                                                Atual: <span className={`font-black text-lg ${isAlert ? 'text-red-600' : 'text-gray-800'}`}>{item.current_qty}</span>
                                            </div>
                                            <div className="text-gray-400">
                                                Mínimo: {item.min_stock}
                                            </div>
                                        </div>

                                        {/* Forecast Info */}
                                        {(() => {
                                            const f = forecasts.find(f => f.itemId === item.id);
                                            if (!f) return null;
                                            return (
                                                <div className="mb-4 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-gray-400">
                                                        <span>Previsão IA</span>
                                                        <span className={f.recommendation === 'critical' ? 'text-red-500' : f.recommendation === 'buy' ? 'text-orange-500' : 'text-green-500'}>
                                                            {f.recommendation === 'critical' ? 'Crítico' : f.recommendation === 'buy' ? 'Repor' : 'Estável'}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs font-bold text-gray-700 mt-1">
                                                        {f.daysRemaining === 'inf' ? 'Consumo não detectado' : `Esgota em aproximadamente ${f.daysRemaining} dias`}
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {isAlert && <div className="text-xs text-red-500 font-bold mb-3 animate-pulse">⚠️ ALERTA DE ESTOQUE BAIXO</div>}

                                        {costProfile && costProfile.id === item.id ? (
                                            <form onSubmit={handleCostProfile} className="mt-2 grid grid-cols-2 gap-2 rounded-lg border border-purple-200 bg-purple-50 p-3">
                                                <label className="text-[10px] font-black uppercase text-gray-500">Preço da compra (R$)<input required type="number" min="0" step="0.01" className="mt-1 w-full rounded border p-2 text-sm" value={costProfile.purchase_price_cents / 100} onChange={e => updateCostProfile({ purchase_price_cents: Math.round(Number(e.target.value || 0) * 100) })} /></label>
                                                <label className="text-[10px] font-black uppercase text-gray-500">Conteúdo<input required type="number" min="0.0001" step="0.01" className="mt-1 w-full rounded border p-2 text-sm" value={costProfile.purchase_quantity} onChange={e => updateCostProfile({ purchase_quantity: Number(e.target.value || 0) })} /></label>
                                                <label className="text-[10px] font-black uppercase text-gray-500">Unidade<select className="mt-1 w-full rounded border bg-white p-2 text-sm" value={costProfile.purchase_unit} onChange={e => updateCostProfile({ purchase_unit: e.target.value as CostProfileState['purchase_unit'] })}><option value="g">g</option><option value="kg">kg</option><option value="ml">ml</option><option value="l">l</option><option value="un">un</option></select></label>
                                                <label className="text-[10px] font-black uppercase text-gray-500">Rendimento (%)<input required type="number" min="0.01" max="100" step="0.01" className="mt-1 w-full rounded border p-2 text-sm" value={costProfile.yield_percent} onChange={e => updateCostProfile({ yield_percent: Number(e.target.value || 0) })} /></label>
                                                <label className="col-span-2 text-[10px] font-black uppercase text-gray-500">Base da evidência<select className="mt-1 w-full rounded border bg-white p-2 text-sm" value={costProfile.cost_evidence_state} onChange={e => updateCostProfile({ cost_evidence_state: e.target.value as CostProfileState['cost_evidence_state'] })}><option value="unvalidated">Não validada</option><option value="informed">Informada pelo proprietário</option><option value="measured">Medida</option><option value="invoice">Nota ou comprovante</option></select></label>
                                                <button type="submit" className="rounded bg-purple-600 p-2 font-bold text-white">Salvar custo</button>
                                                <button type="button" onClick={() => setCostProfile(null)} className="rounded bg-white p-2 font-bold text-gray-600">Cancelar</button>
                                            </form>
                                        ) : adjustState?.id === item.id ? (
                                            <form onSubmit={handleAdjust} className="flex flex-col gap-2 mt-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                                                <div className="flex gap-2">
                                                    <input required type="number" step="0.01" placeholder="Delta (ex: -5 ou 10)" className="border p-2 rounded text-sm w-full outline-none" value={adjustState?.qty ?? 0} onChange={e => adjustState && setAdjustState({ ...adjustState, qty: parseFloat(e.target.value) })} />
                                                </div>
                                                <div className="flex gap-2">
                                                    <select className="border p-2 rounded text-sm w-full outline-none" value={adjustState?.reason ?? 'manual_adjust'} onChange={e => adjustState && setAdjustState({ ...adjustState, reason: e.target.value })}>
                                                        <option value="manual_adjust">Ajuste Manual</option>
                                                        <option value="waste">Desperdício</option>
                                                        <option value="purchase">Compra</option>
                                                    </select>
                                                    <button type="submit" className="bg-purple-600 text-white font-bold p-2 px-4 rounded hover:bg-purple-700">OK</button>
                                                    <button type="button" onClick={() => setAdjustState(null)} className="text-gray-500 p-2 hover:bg-gray-100 rounded">X</button>
                                                </div>
                                            </form>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-2">
                                                <button onClick={() => setAdjustState({ id: item.id, qty: 0, reason: 'manual_adjust' })} className="text-xs bg-gray-100 text-gray-700 font-bold px-3 py-2 rounded shadow-sm hover:bg-gray-200">Ajustar estoque</button>
                                                <button onClick={() => setCostProfile({ id: item.id, purchase_price_cents: item.purchase_price_cents ?? item.acquisition_cost_cents ?? 0, purchase_quantity: item.purchase_quantity ?? 1, purchase_unit: item.purchase_unit ?? item.unit ?? 'un', yield_percent: item.yield_percent ?? 100, cost_evidence_state: item.cost_evidence_state ?? 'unvalidated' })} className="text-xs bg-purple-100 text-purple-700 font-bold px-3 py-2 rounded shadow-sm hover:bg-purple-200">Custo da compra</button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {items.length === 0 && <div className="col-span-2 text-center p-8 text-gray-500 bg-white rounded-xl border">Nenhum insumo cadastrado para este Tenant.</div>}
                        </div>
                    </div>

                    <div className="bg-white border rounded-xl shadow-sm p-5 h-fit max-h-[800px] overflow-y-auto">
                        <h2 className="text-xl font-bold text-gray-800 mb-4 sticky top-0 bg-white pb-2 border-b uppercase text-xs tracking-widest">Giro por Canal</h2>
                        {consumption.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">Sem dados de consumo por canal.</p>
                        ) : (
                            <div className="space-y-6">
                                {Array.from(new Set(consumption.map(c => c.item_name))).map(itemName => {
                                    const itemCons = consumption.filter(c => c.item_name === itemName);
                                    const totalForItem = itemCons.reduce((acc, current) => acc + current.total_qty, 0);

                                    return (
                                        <div key={itemName} className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold text-gray-800 text-sm">{itemName}</span>
                                                <span className="text-[10px] font-black text-gray-400">{totalForItem} consumidos</span>
                                            </div>
                                            <div className="w-full h-2.5 bg-gray-100 rounded-full flex overflow-hidden">
                                                {itemCons.map((c, idx) => {
                                                    const perc = (c.total_qty / totalForItem) * 100;
                                                    const color = c.source === 'ifood' ? 'bg-red-500' : c.source === 'pdv' ? 'bg-blue-500' : 'bg-orange-500';
                                                    return (
                                                        <div
                                                            key={idx}
                                                            className={`${color} h-full transition-all`}
                                                            style={{ width: `${perc}%` }}
                                                            title={`${c.source}: ${perc.toFixed(1)}%`}
                                                        ></div>
                                                    );
                                                })}
                                            </div>
                                            <div className="flex gap-3 mt-1">
                                                {itemCons.map((c, idx) => (
                                                    <div key={idx} className="flex items-center gap-1 text-[9px] font-black uppercase text-gray-400">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${c.source === 'ifood' ? 'bg-red-500' : c.source === 'pdv' ? 'bg-blue-500' : 'bg-orange-500'}`}></div>
                                                        {c.source}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <h2 className="text-xl font-bold text-gray-800 mb-4 mt-8 sticky top-0 bg-white pb-2 border-b uppercase text-xs tracking-widest">Últimas Movimentações</h2>
                        {movements.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">Sem histórico de movimentação.</p>
                        ) : (
                            <div className="space-y-3">
                                {movements.map(m => (
                                    <div key={m.id} className="text-sm border-b pb-2">
                                        <div className="flex justify-between font-bold text-gray-700">
                                            <span>{m.item_name}</span>
                                            <span className={m.type === 'out' ? 'text-red-500' : 'text-green-600'}>
                                                {m.type === 'out' ? '-' : m.type === 'in' ? '+' : ''}{m.qty}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                                            <span>Motivo: {m.reason}</span>
                                            <span>{new Date(m.created_at).toLocaleString('pt-BR').substring(0, 16)}</span>
                                        </div>
                                        {m.ref_order_id && <div className="text-[10px] text-purple-400 mt-1">Ref: {m.ref_order_id.substring(0, 8)}...</div>}
                                    </div>
                                ))}
                            </div>
                        )}

                        <h2 className="text-xl font-bold text-gray-800 mb-4 mt-8 sticky top-0 bg-white pb-2 border-b uppercase text-xs tracking-widest">Log de Automação Marketplaces</h2>
                        {mktLogs.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">Nenhuma ação de sync executada.</p>
                        ) : (
                            <div className="space-y-3">
                                {mktLogs.map(log => (
                                    <div key={log.id} className="text-xs bg-purple-50 p-2 rounded border border-purple-100">
                                        <div className="flex justify-between font-black text-purple-700 uppercase mb-1">
                                            <span>{log.platform} - {log.action}</span>
                                            <span>{new Date(log.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <p className="text-gray-700 text-[11px] leading-tight">{log.details}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
