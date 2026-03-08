'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DriversPage() {
    const [drivers, setDrivers] = useState<any[]>([]);
    const [driverOrders, setDriverOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<Record<string, any>>({});

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

            if (drvRes.ok) {
                const driversList = await drvRes.json();
                setDrivers(driversList);

                // Fetch stats for each driver
                const statsMap: Record<string, any> = {};
                for (const drv of driversList) {
                    const sRes = await fetch(`${API}/api/admin/drivers/${drv.id}/stats?slug=${slug}`, { headers });
                    if (sRes.ok) statsMap[drv.id] = await sRes.json();
                }
                setStats(statsMap);
            }
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

    const handleSettle = async (id: string, name: string) => {
        if (!confirm(`Confirmar o acerto (pagamento) para o entregador ${name}?`)) return;

        const token = localStorage.getItem('admin_token');
        const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        const slug = localStorage.getItem('admin_slug') || 'default';

        try {
            const res = await fetch(`${API}/api/admin/drivers/${id}/settle?slug=${slug}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                alert('Acerto realizado com sucesso!');
                fetchData(slug);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const fmtCurrency = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-black text-gray-800 flex items-center gap-2">
                    🛵 Gestão de Logística
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
                        <h2 className="text-lg font-black text-gray-800 p-5 border-b bg-gray-50 flex justify-between items-center">
                            <span>Equipe de Entregas</span>
                            <span className="text-xs text-gray-400 font-normal">{drivers.length} ativos</span>
                        </h2>
                        {drivers.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 font-medium">Nenhum entregador cadastrado.</div>
                        ) : (
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="bg-white border-b text-gray-400 text-xs tracking-wider uppercase">
                                        <th className="p-4 font-bold">Motorista</th>
                                        <th className="p-4 font-bold">Desempenho</th>
                                        <th className="p-4 font-bold">A Receber</th>
                                        <th className="p-4 font-bold text-right">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 text-gray-700">
                                    {drivers.map(drv => {
                                        const drvStats = stats[drv.id] || { completed_deliveries: 0, pending_settlement_cents: 0 };
                                        return (
                                            <tr key={drv.id} className={`hover:bg-gray-50 transition ${drv.status !== 'active' ? 'opacity-50' : ''}`}>
                                                <td className="p-4 font-bold">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`w-2 h-2 rounded-full ${drv.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                                        <div>
                                                            <div>{drv.name}</div>
                                                            <div className="text-[10px] text-gray-400 font-normal uppercase">{drv.vehicle}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className="font-bold text-gray-600">{drvStats.completed_deliveries}</span>
                                                    <span className="text-xs text-gray-400 ml-1">entregas</span>
                                                </td>
                                                <td className="p-4">
                                                    <div className={`font-black ${drvStats.pending_settlement_cents > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                                                        {fmtCurrency(drvStats.pending_settlement_cents)}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-right flex justify-end gap-2">
                                                    {drvStats.pending_settlement_cents > 0 && (
                                                        <button
                                                            onClick={() => handleSettle(drv.id, drv.name)}
                                                            className="text-[10px] bg-green-600 text-white font-black px-2 py-1 rounded hover:bg-green-700"
                                                        >
                                                            PAGAR
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleToggleStatus(drv.id, drv.status)}
                                                        className={`text-[10px] font-black px-2 py-1 rounded border ${drv.status === 'active' ? 'border-red-200 text-red-500' : 'border-green-200 text-green-500'}`}
                                                    >
                                                        {drv.status === 'active' ? 'OFF' : 'ON'}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
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
                                            <th className="p-4 font-bold">Dados Rota</th>
                                            <th className="p-4 font-bold text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {driverOrders.map(do_ => (
                                            <tr key={do_.id} className="hover:bg-purple-50 transition">
                                                <td className="p-4 text-xs font-mono text-gray-500 hidden md:table-cell">
                                                    #{do_.order_id.substring(do_.order_id.length - 6).toUpperCase()}
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-bold text-gray-800">{do_.driver_name}</div>
                                                    <div className="text-[10px] text-gray-400 uppercase">{new Date(do_.assigned_at).toLocaleTimeString()}</div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-semibold text-gray-600 truncate max-w-[150px]">{do_.customer_name}</div>
                                                    <div className="text-green-600 font-black text-xs">
                                                        {fmtCurrency(do_.delivery_fee_cents)} • {do_.distance_km || '2.5'}km
                                                    </div>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${do_.status === 'assigned' ? 'bg-orange-100 text-orange-700' :
                                                        do_.status === 'returned' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                                        }`}>
                                                        {do_.status === 'assigned' ? 'A caminho' : do_.status === 'delivered' ? 'Entregue' : 'Retornado'}
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
