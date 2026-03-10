'use client';

import React, { useState, useEffect } from 'react';
import {
    FileText,
    CheckCircle,
    AlertCircle,
    Download,
    Send,
    Settings,
    Search,
    RefreshCw,
    ExternalLink
} from 'lucide-react';

export default function FiscalHubPage() {
    const [pendingOrders, setPendingOrders] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [config, setConfig] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [issuingId, setIssuingId] = useState<string | null>(null);
    const [tab, setTab] = useState<'pending' | 'history' | 'config'>('pending');

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('admin_token');
            const [pendingRes, historyRes, configRes] = await Promise.all([
                fetch(`${API_URL}/api/admin/fiscal/pending`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/api/admin/fiscal/history`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/api/admin/fiscal/config`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (pendingRes.ok) setPendingOrders(await pendingRes.json());
            if (historyRes.ok) setHistory(await historyRes.json());
            if (configRes.ok) setConfig(await configRes.json());
        } catch (e) {
            console.error('Failed to fetch fiscal data', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleIssue = async (orderId: string) => {
        setIssuingId(orderId);
        try {
            const token = localStorage.getItem('admin_token');
            const res = await fetch(`${API_URL}/api/admin/fiscal/issue/${orderId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                alert('Nota Fiscal emitida com sucesso!');
                fetchData();
            } else {
                const err = await res.json();
                alert(`Erro ao emitir nota: ${err.error}`);
            }
        } catch (e) {
            alert('Erro de conexão ao emitir nota.');
        } finally {
            setIssuingId(null);
        }
    };

    const handleUpdateConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const data = Object.fromEntries(formData);

        try {
            const token = localStorage.getItem('admin_token');
            const res = await fetch(`${API_URL}/api/admin/fiscal/config`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                alert('Configurações salvas!');
                fetchData();
            }
        } catch (e) {
            alert('Erro ao salvar configurações.');
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                        <FileText className="text-purple-600" size={32} />
                        Fiscal Hub
                    </h1>
                    <p className="text-gray-500 font-medium text-sm">Controle de NFe, NFCe e obrigações tributárias</p>
                </div>
                <button
                    onClick={fetchData}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-purple-600"
                >
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl w-fit">
                {[
                    { id: 'pending', label: 'Aguardando Emissão', icon: Send },
                    { id: 'history', label: 'Notas Emitidas', icon: CheckCircle },
                    { id: 'config', label: 'Configuração', icon: Settings }
                ].map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id as any)}
                        className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${tab === t.id
                                ? 'bg-white text-purple-700 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <t.icon size={14} />
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl border border-white/50 overflow-hidden">
                {tab === 'pending' && (
                    <div className="p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-gray-800">Fila de Emissão</h2>
                            <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                                {pendingOrders.length} Pendentes
                            </div>
                        </div>

                        {pendingOrders.length === 0 ? (
                            <div className="text-center py-20 text-gray-400">
                                <CheckCircle size={48} className="mx-auto mb-4 opacity-20" />
                                <p className="font-bold">Todos os pedidos foram faturados!</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-gray-100 italic text-gray-400 text-xs font-medium">
                                            <th className="pb-4">Pedido</th>
                                            <th className="pb-4">Cliente</th>
                                            <th className="pb-4">CPF/CNPJ</th>
                                            <th className="pb-4">Valor</th>
                                            <th className="pb-4">Status Fiscal</th>
                                            <th className="pb-4 text-right">Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {pendingOrders.map((order) => (
                                            <tr key={order.id} className="group hover:bg-gray-50/50 transition-colors">
                                                <td className="py-4 font-black text-gray-900 text-sm">#{order.id.slice(0, 6)}</td>
                                                <td className="py-4 text-sm font-medium text-gray-700">{order.customer_name}</td>
                                                <td className="py-4 text-xs font-mono text-gray-400">{order.tax_id || 'Não informado'}</td>
                                                <td className="py-4 font-black text-gray-900">R$ {(order.total_cents / 100).toFixed(2)}</td>
                                                <td className="py-4">
                                                    <span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase ${order.fiscal_status === 'error' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                                                        }`}>
                                                        {order.fiscal_status}
                                                    </span>
                                                </td>
                                                <td className="py-4 text-right">
                                                    <button
                                                        onClick={() => handleIssue(order.id)}
                                                        disabled={issuingId === order.id}
                                                        className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-xl shadow-lg shadow-purple-200 transition-all disabled:opacity-50"
                                                    >
                                                        {issuingId === order.id ? <RefreshCw className="animate-spin" size={16} /> : <Send size={16} />}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {tab === 'history' && (
                    <div className="p-8">
                        <h2 className="text-xl font-black text-gray-800 mb-6">Histórico de Notas</h2>
                        <div className="grid grid-cols-1 gap-4">
                            {history.length === 0 ? (
                                <p className="text-center py-10 text-gray-400 font-bold">Nenhuma nota emitida ainda.</p>
                            ) : (
                                history.map((nfe) => (
                                    <div key={nfe.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-emerald-50/50 border border-transparent hover:border-emerald-100 transition-all group">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-emerald-100 text-emerald-600 p-3 rounded-xl">
                                                <FileText size={20} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-gray-900">Nota {nfe.nfe_number}</p>
                                                <p className="text-[10px] text-gray-400 font-medium uppercase">Pedido #{nfe.id.slice(0, 6)} • {nfe.customer_name}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <a
                                                href={nfe.nfe_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center gap-2 bg-white text-gray-700 px-4 py-2 rounded-xl border border-gray-200 text-xs font-black shadow-sm hover:shadow-md transition-all group-hover:border-emerald-200"
                                            >
                                                <Download size={14} className="text-emerald-600" />
                                                Visualizar DANFE
                                            </a>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {tab === 'config' && (
                    <div className="p-8 max-w-2xl">
                        <h2 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-2">
                            <Settings className="text-purple-600" size={20} />
                            Configurações Tributárias
                        </h2>

                        <form onSubmit={handleUpdateConfig} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">CNPJ do Emitente</label>
                                    <input
                                        name="cnpj"
                                        defaultValue={config?.cnpj}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 ring-purple-500/20 transition-all font-medium"
                                        placeholder="00.000.000/0000-00"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Inscrição Estadual</label>
                                    <input
                                        name="ie"
                                        defaultValue={config?.state_registration}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 ring-purple-500/20 transition-all font-medium"
                                        placeholder="Isento ou Número"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">API Token (Provedor)</label>
                                <input
                                    name="token"
                                    type="password"
                                    defaultValue={config?.focus_nfe_token}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 ring-purple-500/20 transition-all font-medium"
                                    placeholder="Focus NFe Token"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ambiente</label>
                                <select
                                    name="env"
                                    defaultValue={config?.fiscal_environment || 'sandbox'}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 ring-purple-500/20 transition-all font-black uppercase tracking-widest"
                                >
                                    <option value="sandbox">HOMOLOGAÇÃO (Sem valor fiscal)</option>
                                    <option value="production">PRODUÇÃO (Valor Real)</option>
                                </select>
                            </div>

                            <div className="pt-4">
                                <button className="w-full bg-gray-900 border-b-4 border-black text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:translate-y-1 hover:border-b-0 transition-all">
                                    Salvar Configurações
                                </button>
                                <p className="mt-4 text-[10px] text-gray-400 text-center font-medium">
                                    * X-Açaí utiliza integração homologada para emissão de NFCe modelo 65.
                                </p>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
