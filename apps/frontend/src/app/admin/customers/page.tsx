'use client';

import React, { useEffect, useState } from 'react';

export default function CustomersPage() {
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [customerOrders, setCustomerOrders] = useState<any[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(false);

    // Loyalty State
    const [loyaltyData, setLoyaltyData] = useState<any>(null);
    const [loadingLoyalty, setLoadingLoyalty] = useState(false);
    const [rewardName, setRewardName] = useState('');
    const [rewardCost, setRewardCost] = useState('');

    const fetchCustomers = async (slug = 'default', q = '') => {
        setLoading(true);
        try {
            const token = localStorage.getItem('admin_token');
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
            const res = await fetch(`${API_URL}/api/admin/customers?slug=${slug}&q=${encodeURIComponent(q)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setCustomers(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const slug = localStorage.getItem('admin_slug') || 'default';
        fetchCustomers(slug);

        const handleTenantChange = () => {
            fetchCustomers(localStorage.getItem('admin_slug') || 'default');
        };
        window.addEventListener('tenant_changed', handleTenantChange);
        return () => window.removeEventListener('tenant_changed', handleTenantChange);
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const slug = localStorage.getItem('admin_slug') || 'default';
        fetchCustomers(slug, searchTerm);
    };

    const handleSelectCustomer = async (customer: any) => {
        setSelectedCustomer(customer);
        setCustomerOrders([]);
        setLoadingOrders(true);
        setLoyaltyData(null);
        setLoadingLoyalty(true);

        const token = localStorage.getItem('admin_token');
        const slug = localStorage.getItem('admin_slug') || 'default';
        if (!token) return;

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

            // Orders Fetch
            const resOrders = await fetch(`${API_URL}/api/admin/customers/${customer.id}/orders?slug=${slug}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (resOrders.ok) {
                setCustomerOrders(await resOrders.json());
            }

            // Loyalty Fetch
            const resLoyalty = await fetch(`${API_URL}/api/admin/loyalty/${customer.id}?slug=${slug}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (resLoyalty.ok) {
                setLoyaltyData(await resLoyalty.json());
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingOrders(false);
            setLoadingLoyalty(false);
        }
    };

    const handleCreateReward = async () => {
        if (!rewardName || !rewardCost || !selectedCustomer) return;

        const token = localStorage.getItem('admin_token');
        const slug = localStorage.getItem('admin_slug') || 'default';
        if (!token) return;

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
            const res = await fetch(`${API_URL}/api/admin/loyalty/${selectedCustomer.id}/reward?slug=${slug}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ rewardName, pointsCost: parseInt(rewardCost) })
            });

            if (res.ok) {
                setRewardName('');
                setRewardCost('');
                // reload data
                handleSelectCustomer(selectedCustomer);
            } else {
                const err = await res.json();
                alert(`Erro: ${err.error}`);
            }
        } catch (err) {
            console.error('Failed to create reward', err);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-black text-gray-800 flex items-center gap-2">
                    👥 CRM de Clientes
                </h1>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4">
                <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                    <input
                        type="text"
                        placeholder="Buscar por nome ou telefone..."
                        className="flex-1 border p-2 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    <button type="submit" className="bg-gray-800 text-white px-4 rounded-lg font-bold hover:bg-gray-900">Buscar</button>
                </form>
            </div>

            {loading ? (
                <div className="text-gray-500 font-bold p-8 text-center animate-pulse">Carregando CRM...</div>
            ) : customers.length === 0 ? (
                <div className="text-gray-500 bg-gray-50 p-8 rounded-xl text-center border">Nenhum cliente encontrado.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {customers.map(c => (
                        <div key={c.id} onClick={() => handleSelectCustomer(c)} className="bg-white border p-5 rounded-2xl shadow-sm hover:shadow-md hover:border-purple-300 transition cursor-pointer">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-800">{c.name}</h3>
                                    <p className="text-gray-500 text-sm">{c.phone}</p>
                                </div>
                                {c.tags && (
                                    <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded-full">
                                        {c.tags}
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                                <div className="bg-gray-50 p-2 rounded-lg text-center">
                                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Pedidos</p>
                                    <p className="font-black text-gray-800 text-lg">{c.total_orders}</p>
                                </div>
                                <div className="bg-green-50 p-2 rounded-lg text-center">
                                    <p className="text-green-700 text-xs font-bold uppercase tracking-wider">Gasto Total</p>
                                    <p className="font-black text-green-800 text-lg">
                                        R$ {(c.total_spent_cents / 100).toFixed(2).replace('.', ',')}
                                    </p>
                                </div>
                            </div>

                            <div className="text-xs text-gray-400">
                                Último pedido: {c.last_order_at ? new Date(c.last_order_at).toLocaleString('pt-BR') : 'N/A'}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal Perfil e Timeline do Cliente */}
            {selectedCustomer && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
                            <div>
                                <h2 className="text-2xl font-black text-gray-800">{selectedCustomer.name}</h2>
                                <p className="text-gray-500 font-medium">{selectedCustomer.phone}</p>
                            </div>
                            <button onClick={() => setSelectedCustomer(null)} className="text-gray-400 hover:text-red-500 font-bold text-xl p-2">✕</button>
                        </div>

                        {/* Corpo Modal */}
                        <div className="p-6 overflow-y-auto flex-1 bg-white space-y-6">
                            {/* Estatísticas */}
                            <div className="flex gap-4">
                                <div className="flex-1 bg-purple-50 p-4 rounded-xl border border-purple-100 flex flex-col justify-between">
                                    <div className="text-purple-600 font-bold text-xs uppercase tracking-wider mb-1">LTV (Gasto Total)</div>
                                    <div className="text-2xl font-black text-purple-900 mb-2">
                                        R$ {(selectedCustomer.total_spent_cents / 100).toFixed(2).replace('.', ',')}
                                    </div>
                                    <div className="flex justify-between items-center text-sm border-t border-purple-200 pt-2">
                                        <span className="text-gray-600 font-medium">Pedidos Finalizados</span>
                                        <span className="font-bold text-purple-700 bg-purple-200 px-2 py-0.5 rounded-full">{selectedCustomer.total_orders}</span>
                                    </div>
                                </div>
                                <div className="flex-1 bg-yellow-50 p-4 rounded-xl border border-yellow-100 flex flex-col justify-between">
                                    <div className="text-yellow-600 font-bold text-xs uppercase tracking-wider mb-1">🪙 Sistema de Pontos</div>
                                    <div className="text-2xl font-black text-yellow-900 mb-2">
                                        {loadingLoyalty ? '...' : (loyaltyData?.points || 0)} <span className="text-sm font-medium text-yellow-700">Pts Livres</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm border-t border-yellow-200 pt-2">
                                        <span className="text-gray-600 font-medium">Recompensas Emitidas</span>
                                        <span className="font-bold text-yellow-700 bg-yellow-200 px-2 py-0.5 rounded-full">{loyaltyData?.availableRewards?.length || 0}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Detalhes do Cliente (Última visita) */}
                            <div className="bg-gray-50 flex justify-between items-center p-4 rounded-xl border border-gray-100">
                                <span className="text-gray-500 font-bold text-xs uppercase">Última Visita</span>
                                <span className="font-bold text-gray-800">
                                    {selectedCustomer.last_order_at ? new Date(selectedCustomer.last_order_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                                </span>
                            </div>

                            {/* Detalhes do Cliente */}
                            {selectedCustomer.tags && (
                                <div>
                                    <h3 className="font-bold text-gray-800 mb-2">🏷️ Tags do CRM</h3>
                                    <div className="flex gap-2 flex-wrap">
                                        {selectedCustomer.tags.split(',').map((tag: string, i: number) => (
                                            <span key={i} className="bg-yellow-100 text-yellow-800 font-bold px-3 py-1 rounded-full text-xs">
                                                {tag.trim()}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Loyalty & Rewards Section */}
                            <div className="border border-yellow-200 rounded-xl overflow-hidden">
                                <div className="bg-yellow-50 p-4 border-b border-yellow-200 flex justify-between items-center">
                                    <h3 className="font-black text-yellow-900">🎁 Recompensas Disponíveis</h3>
                                </div>

                                <div className="p-4 bg-white">
                                    {loadingLoyalty ? (
                                        <div className="text-center p-4 text-gray-400 font-bold animate-pulse">Carregando recompensas...</div>
                                    ) : loyaltyData?.availableRewards?.length > 0 ? (
                                        <div className="space-y-2 mb-4">
                                            {loyaltyData.availableRewards.map((reward: any) => (
                                                <div key={reward.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                    <div>
                                                        <div className="font-bold text-gray-800">{reward.reward_name}</div>
                                                        <div className="text-xs text-gray-500">Emitido em {new Date(reward.created_at).toLocaleDateString('pt-BR')} (Custo: {reward.points_cost} Pts)</div>
                                                    </div>
                                                    <span className="bg-green-100 text-green-700 font-bold px-3 py-1 rounded-full text-xs uppercase">
                                                        Disponível para Resgate
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center p-4 text-gray-500 bg-gray-50 rounded-lg mb-4 text-sm font-medium">Nenhuma recompensa ativa.</div>
                                    )}

                                    {/* Create Reward Form */}
                                    <div className="border-t border-dashed border-gray-200 pt-4 mt-2">
                                        <h4 className="text-sm font-bold text-gray-700 mb-2">Nova Recompensa Manual (Desconta Pontos)</h4>
                                        <div className="flex gap-2">
                                            <input
                                                className="border rounded-lg px-3 py-2 text-sm flex-1"
                                                placeholder="Ex: Açaí 500ml Grátis"
                                                value={rewardName}
                                                onChange={e => setRewardName(e.target.value)}
                                            />
                                            <input
                                                className="border rounded-lg px-3 py-2 text-sm w-24"
                                                placeholder="Pts Custo"
                                                type="number"
                                                value={rewardCost}
                                                onChange={e => setRewardCost(e.target.value)}
                                            />
                                            <button
                                                onClick={handleCreateReward}
                                                disabled={!rewardName || !rewardCost || (loyaltyData?.points || 0) < parseInt(rewardCost)}
                                                className="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white font-bold px-4 rounded-lg text-sm transition"
                                            >
                                                Emitir
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Timeline de Pedidos */}
                            <div>
                                <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">📦 Histórico de Pedidos (Timeline)</h3>
                                {loadingOrders ? (
                                    <div className="text-center p-8 text-gray-400 font-bold animate-pulse">Carregando pedidos...</div>
                                ) : customerOrders.length === 0 ? (
                                    <div className="text-center p-8 text-gray-400 bg-gray-50 rounded-lg">Nenhum pedido atrelado a este cliente diretamente.</div>
                                ) : (
                                    <div className="space-y-4">
                                        {customerOrders.map(order => (
                                            <div key={order.id} className="border border-gray-100 rounded-xl p-4 flex justify-between items-center hover:bg-gray-50 transition">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-bold text-gray-800 uppercase tracking-wider text-xs">#{order.id.slice(-6)}</span>
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider
                                                            ${order.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                                order.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}
                                                        `}>
                                                            {order.status}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-gray-500 font-medium">
                                                        {new Date(order.created_at).toLocaleString('pt-BR')} • {order.payment_method?.toUpperCase()}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-black text-green-700 text-lg">R$ {(order.total_cents / 100).toFixed(2).replace('.', ',')}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
