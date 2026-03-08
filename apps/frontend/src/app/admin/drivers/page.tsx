'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DriversPage() {
    const [drivers, setDrivers] = useState<any[]>([]);
    const [driverOrders, setDriverOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ name: '', phone: '', vehicle: 'Moto' });

    const fetchData = async (slug = 'default') => {
        setLoading(true);
        try {
            const token = localStorage.getItem('admin_token');
            const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
            const headers = { 'Authorization': `Bearer ${token}` };

            const [drvRes, ordRes] = await Promise.all([
                fetch(`${API}/api/admin/drivers?slug=${slug}`, { headers }),
                fetch(`${API}/api/admin/driver-orders?slug=${slug}`, { headers })
            ]);

            if (drvRes.ok) setDrivers(await drvRes.json());
            if (ordRes.ok) setDriverOrders(await ordRes.json());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const slug = localStorage.getItem('admin_slug') || 'default';
        fetchData(slug);

        const onTenantChange = () => fetchData(localStorage.getItem('admin_slug') || 'default');
        window.addEventListener('tenant_changed', onTenantChange);
        return () => window.removeEventListener('tenant_changed', onTenantChange);
    }, []);

    const handleCreateDriver = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('admin_token');
        const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        const slug = localStorage.getItem('admin_slug') || 'default';

        try {
            await fetch(`${API}/api/admin/drivers?slug=${slug}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(formData)
            });
            setShowForm(false);
            setFormData({ name: '', phone: '', vehicle: 'Moto' });
            fetchData(slug);
        } catch (e) {
            console.error(e);
        }
    };

    const handleToggleStatus = async (id: string, currentStatus: string) => {
        const token = localStorage.getItem('admin_token');
        const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        const slug = localStorage.getItem('admin_slug') || 'default';
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

        try {
            await fetch(`${API}/api/admin/drivers/${id}?slug=${slug}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status: newStatus })
            });
            fetchData(slug);
        } catch (e) {
            console.error(e);
        }
    };

    const fmtCurrency = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-black text-gray-800 flex items-center gap-2">
                    🛵 Entregadores (Gestão de Frota)
                </h1>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-purple-600 text-white px-5 py-2 rounded-lg font-bold shadow-md hover:bg-purple-700 transition"
                >
                    + Novo Entregador
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleCreateDriver} className="bg-white p-6 rounded-xl shadow-sm border border-purple-100 flex gap-4 flex-wrap items-end animate-fade-in">
                    <div className="flex-1 min-w-[200px]">
                        <label className="text-xs font-bold text-gray-500 uppercase">Nome Completo</label>
                        <input required type="text" className="w-full border p-2 mt-1 rounded outline-none focus:border-purple-500" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div className="w-48">
                        <label className="text-xs font-bold text-gray-500 uppercase">WhatsApp</label>
                        <input required type="text" placeholder="(11) 99999-9999" className="w-full border p-2 mt-1 rounded outline-none focus:border-purple-500" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                    </div>
                    <div className="w-48">
                        <label className="text-xs font-bold text-gray-500 uppercase">Veículo</label>
                        <select className="w-full border p-2 mt-1 rounded outline-none focus:border-purple-500 bg-white" value={formData.vehicle} onChange={e => setFormData({ ...formData, vehicle: e.target.value })}>
                            <option value="Moto">Moto</option>
                            <option value="Bicicleta">Bicicleta</option>
                            <option value="Carro">Carro</option>
                        </select>
                    </div>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 font-bold text-gray-500 hover:bg-gray-100 rounded">Cancelar</button>
                        <button type="submit" className="bg-green-600 text-white font-bold px-6 py-2 rounded hover:bg-green-700 shadow-sm">Gravar</button>
                    </div>
                </form>
            )}

            {loading ? (
                <div className="text-gray-500 font-bold p-8 text-center animate-pulse">Carregando frota...</div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {/* Lista de Motoristas */}
                    <div className="bg-white border rounded-xl shadow-sm overflow-hidden h-fit">
                        <h2 className="text-lg font-black text-gray-800 p-5 border-b bg-gray-50">Equipe de Entregas</h2>
                        {drivers.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 font-medium">Nenhum entregador cadastrado.</div>
                        ) : (
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="bg-white border-b text-gray-400 text-xs tracking-wider uppercase">
                                        <th className="p-4 font-bold">Motorista</th>
                                        <th className="p-4 font-bold">Contato / Veículo</th>
                                        <th className="p-4 font-bold text-right">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 text-gray-700">
                                    {drivers.map(drv => (
                                        <tr key={drv.id} className={`hover:bg-gray-50 transition ${drv.status !== 'active' ? 'opacity-50' : ''}`}>
                                            <td className="p-4 font-bold">
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full ${drv.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                                    {drv.name}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-gray-500 text-xs mb-0.5">{drv.phone}</div>
                                                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold text-xs">{drv.vehicle}</span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <button
                                                    onClick={() => handleToggleStatus(drv.id, drv.status)}
                                                    className={`text-xs font-bold px-3 py-1.5 rounded-lg ${drv.status === 'active' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                                                >
                                                    {drv.status === 'active' ? 'Desativar' : 'Ativar'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Despachos e Histórico de Entregas */}
                    <div className="bg-white border rounded-xl shadow-sm overflow-hidden h-fit max-h-[800px] flex flex-col">
                        <div className="p-5 border-b bg-gray-50 flex justify-between items-center">
                            <h2 className="text-lg font-black text-gray-800">Histórico de Corridas</h2>
                            <span className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-bold">Últimas 100</span>
                        </div>
                        <div className="overflow-y-auto flex-1 p-0">
                            {driverOrders.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 font-medium">Sem pedidos despachados.</div>
                            ) : (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-white border-b text-gray-400 text-xs tracking-wider uppercase">
                                        <tr>
                                            <th className="p-4 font-bold hidden md:table-cell">Pedido</th>
                                            <th className="p-4 font-bold">Entregador</th>
                                            <th className="p-4 font-bold">Cliente / Taxa</th>
                                            <th className="p-4 font-bold text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {driverOrders.map(do_ => (
                                            <tr key={do_.id} className="hover:bg-purple-50 transition">
                                                <td className="p-4 text-xs font-mono text-gray-500 hidden md:table-cell">
                                                    ...{do_.order_id.substring(do_.order_id.length - 6)}
                                                </td>
                                                <td className="p-4 font-bold text-gray-800">{do_.driver_name}</td>
                                                <td className="p-4">
                                                    <div className="font-semibold text-gray-600 truncate max-w-[150px]">{do_.customer_name}</div>
                                                    <div className="text-green-600 font-black text-xs">{fmtCurrency(do_.delivery_fee_cents)}</div>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${do_.status === 'assigned' ? 'bg-orange-100 text-orange-700' :
                                                            do_.status === 'returned' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                                        }`}>
                                                        {do_.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
