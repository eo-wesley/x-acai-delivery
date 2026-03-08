'use client';

import React, { useState, useEffect } from 'react';

const Rfull = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;

export default function FinancePage() {
    const [token, setToken] = useState('');
    const [slug, setSlug] = useState('default');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'overview' | 'expenses' | 'logs'>('overview');

    const [overview, setOverview] = useState<any>(null);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [logs, setLogs] = useState<any[]>([]);

    const [dateRange, setDateRange] = useState({
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], // First day of current month
        to: new Date().toISOString().split('T')[0] // Today
    });

    // Add Expense Form
    const [showExpenseForm, setShowExpenseForm] = useState(false);
    const [expenseForm, setExpenseForm] = useState({
        date: new Date().toISOString().split('T')[0],
        category: 'Operacional',
        description: '',
        amount: '',
        method: 'Outros'
    });
    const [expenseLoading, setExpenseLoading] = useState(false);

    useEffect(() => {
        const t = localStorage.getItem('admin_token');
        const s = localStorage.getItem('admin_slug') || 'default';
        if (t) {
            setToken(t);
            setSlug(s);
        }
    }, []);

    useEffect(() => {
        if (!token) return;
        fetchData();
        // eslint-disable-next-line
    }, [token, slug, dateRange, activeTab]);

    const getApiUrl = () => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            const API = getApiUrl();
            const headers = { 'Authorization': `Bearer ${token}` };

            if (activeTab === 'overview') {
                const res = await fetch(`${API}/api/admin/finance/overview?slug=${slug}&from=${dateRange.from}&to=${dateRange.to}`, { headers });
                if (res.ok) setOverview(await res.json());
                else throw new Error('Falha ao carregar visão geral');
            } else if (activeTab === 'expenses') {
                const res = await fetch(`${API}/api/admin/finance/expenses?slug=${slug}&from=${dateRange.from}&to=${dateRange.to}`, { headers });
                if (res.ok) setExpenses(await res.json());
                else throw new Error('Falha ao carregar despesas');
            } else if (activeTab === 'logs') {
                const res = await fetch(`${API}/api/admin/payment-logs?slug=${slug}`, { headers });
                if (res.ok) setLogs(await res.json());
                else throw new Error('Falha ao carregar movimentações');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!expenseForm.amount) return;

        setExpenseLoading(true);
        try {
            const API = getApiUrl();
            const res = await fetch(`${API}/api/admin/finance/expense?slug=${slug}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...expenseForm,
                    amount: Math.round(parseFloat(expenseForm.amount.replace(',', '.')) * 100)
                })
            });

            if (res.ok) {
                setShowExpenseForm(false);
                setExpenseForm({ ...expenseForm, description: '', amount: '' });
                if (activeTab === 'expenses' || activeTab === 'overview') {
                    fetchData();
                }
            } else {
                alert('Erro ao registrar despesa');
            }
        } catch (err) {
            alert('Erro de conexão ao salvar despesa');
        } finally {
            setExpenseLoading(false);
        }
    };

    if (!token) return null;

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-800 tracking-tight">Financeiro (ERP)</h1>
                    <p className="text-gray-500 mt-1">Gestão de vendas, despesas e DRE</p>
                </div>

                <div className="flex bg-white rounded-xl shadow-sm border border-gray-200 p-1">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-2 font-bold text-sm rounded-lg transition ${activeTab === 'overview' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        Visão Geral
                    </button>
                    <button
                        onClick={() => setActiveTab('expenses')}
                        className={`px-4 py-2 font-bold text-sm rounded-lg transition ${activeTab === 'expenses' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        Despesas
                    </button>
                    <button
                        onClick={() => setActiveTab('logs')}
                        className={`px-4 py-2 font-bold text-sm rounded-lg transition ${activeTab === 'logs' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        Transações
                    </button>
                </div>
            </div>

            {/* Date Filter */}
            {activeTab !== 'logs' && (
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-bold text-gray-600">De:</label>
                        <input
                            type="date"
                            value={dateRange.from}
                            onChange={e => setDateRange({ ...dateRange, from: e.target.value })}
                            className="border border-gray-200 rounded-lg p-2 text-sm outline-none focus:border-purple-500 text-gray-700"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-bold text-gray-600">Até:</label>
                        <input
                            type="date"
                            value={dateRange.to}
                            onChange={e => setDateRange({ ...dateRange, to: e.target.value })}
                            className="border border-gray-200 rounded-lg p-2 text-sm outline-none focus:border-purple-500 text-gray-700"
                        />
                    </div>
                    {activeTab === 'expenses' && (
                        <button
                            onClick={() => setShowExpenseForm(!showExpenseForm)}
                            className="ml-auto bg-gray-900 text-white font-bold py-2 px-4 rounded-xl text-sm hover:bg-gray-800 transition shadow-sm flex items-center gap-2"
                        >
                            <span className="text-lg leading-none">+</span> Lançar Despesa
                        </button>
                    )}
                </div>
            )}

            {error && <div className="p-4 bg-red-50 text-red-600 font-bold rounded-xl border border-red-200">{error}</div>}

            {loading ? (
                <div className="animate-pulse space-y-4">
                    <div className="h-32 bg-gray-200 rounded-2xl w-full"></div>
                    <div className="h-64 bg-gray-100 rounded-2xl w-full"></div>
                </div>
            ) : (
                <>
                    {/* OVERVIEW TAB */}
                    {activeTab === 'overview' && overview && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Receita Bruta</p>
                                    <p className="text-2xl font-black text-green-600">{Rfull(overview.receitaBrutaCents || 0)}</p>
                                </div>
                                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Despesas Lançadas</p>
                                    <p className="text-2xl font-black text-red-500">- {Rfull(overview.despesasCents || 0)}</p>
                                </div>
                                <div className={`p-5 rounded-2xl shadow-sm border ${overview.lucroAproximadoCents >= 0 ? 'bg-purple-900 border-purple-800' : 'bg-red-900 border-red-800'}`}>
                                    <p className="text-xs font-bold text-purple-200 uppercase tracking-wider mb-1">Lucro (DRE aprox.)</p>
                                    <p className="text-2xl font-black text-white">{Rfull(overview.lucroAproximadoCents || 0)}</p>
                                </div>
                                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Ticket Médio ({overview.totalPedidos || 0} ped.)</p>
                                    <p className="text-2xl font-black text-blue-600">{Rfull(overview.ticketMedioCents || 0)}</p>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h3 className="font-bold text-gray-800 mb-4">Análise Financeira</h3>
                                <div className="h-8 w-full bg-gray-100 rounded-full overflow-hidden flex">
                                    {overview.receitaBrutaCents > 0 && (
                                        <>
                                            <div
                                                className="bg-green-500 h-full transition-all"
                                                style={{ width: `${Math.max(0, ((overview.receitaBrutaCents - (overview.despesasCents || 0)) / overview.receitaBrutaCents) * 100)}%` }}
                                            />
                                            <div
                                                className="bg-red-500 h-full transition-all"
                                                style={{ width: `${Math.min(100, ((overview.despesasCents || 0) / overview.receitaBrutaCents) * 100)}%` }}
                                            />
                                        </>
                                    )}
                                </div>
                                <div className="flex justify-between text-xs text-gray-500 mt-2 font-bold px-1">
                                    <span>Margem Lucro</span>
                                    <span>Percentual Custos</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* EXPENSES TAB */}
                    {activeTab === 'expenses' && (
                        <div className="space-y-6">
                            {showExpenseForm && (
                                <form onSubmit={handleAddExpense} className="bg-gray-50 p-6 rounded-2xl border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Data</label>
                                        <input type="date" required value={expenseForm.date} onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })} className="w-full p-3 border rounded-xl text-sm outline-none focus:border-purple-500 bg-white" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Valor (R$)</label>
                                        <input type="number" step="0.01" min="0" required placeholder="0,00" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} className="w-full p-3 border rounded-xl text-sm outline-none focus:border-purple-500 bg-white" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Categoria</label>
                                        <select value={expenseForm.category} onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })} className="w-full p-3 border rounded-xl text-sm outline-none focus:border-purple-500 bg-white">
                                            <option>Operacional</option>
                                            <option>Insumos/Estoque</option>
                                            <option>Marketing</option>
                                            <option>Impostos</option>
                                            <option>Pessoal</option>
                                            <option>Outros</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Método</label>
                                        <select value={expenseForm.method} onChange={e => setExpenseForm({ ...expenseForm, method: e.target.value })} className="w-full p-3 border rounded-xl text-sm outline-none focus:border-purple-500 bg-white">
                                            <option>PIX / Boleto</option>
                                            <option>Dinheiro Fisico</option>
                                            <option>Cartão Crédito</option>
                                            <option>Outros</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Descrição</label>
                                        <input type="text" placeholder="Ex: Compra de embalagens, Pagamento motoboy..." value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} className="w-full p-3 border rounded-xl text-sm outline-none focus:border-purple-500 bg-white" />
                                    </div>
                                    <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                                        <button type="button" onClick={() => setShowExpenseForm(false)} className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-200 rounded-lg">Cancelar</button>
                                        <button type="submit" disabled={expenseLoading} className="px-6 py-2 bg-purple-600 text-white font-bold rounded-lg shadow-md hover:bg-purple-700 disabled:opacity-50">Gravar Despesa</button>
                                    </div>
                                </form>
                            )}

                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                {expenses.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500 font-medium">Nenhuma despesa lançada no período.</div>
                                ) : (
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b">
                                                <th className="p-4 font-bold">Data</th>
                                                <th className="p-4 font-bold">Categoria</th>
                                                <th className="p-4 font-bold">Descrição</th>
                                                <th className="p-4 font-bold">Método</th>
                                                <th className="p-4 font-bold text-right">Valor</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 text-sm text-gray-700">
                                            {expenses.map((exp: any) => (
                                                <tr key={exp.id} className="hover:bg-gray-50 transition">
                                                    <td className="p-4 whitespace-nowrap">{new Date(exp.date).toLocaleDateString('pt-BR')}</td>
                                                    <td className="p-4"><span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold">{exp.category}</span></td>
                                                    <td className="p-4">{exp.description || '-'}</td>
                                                    <td className="p-4 text-gray-500 text-xs">{exp.method || '-'}</td>
                                                    <td className="p-4 font-black text-red-500 text-right">{Rfull(exp.amount)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-gray-50 font-black border-t">
                                            <tr>
                                                <td colSpan={4} className="p-4 text-right text-gray-600">Total de Custos no Período:</td>
                                                <td className="p-4 text-right text-red-600">{Rfull(expenses.reduce((a, b) => a + b.amount, 0))}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                )}
                            </div>
                        </div>
                    )}

                    {/* LOGS TAB */}
                    {activeTab === 'logs' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                                <h3 className="font-bold text-gray-700">Últimas 50 Movimentações</h3>
                                <span className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-bold">Tempo Real</span>
                            </div>
                            {logs.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 font-medium">Nenhuma transação financeira registrada.</div>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-white text-gray-400 text-xs uppercase tracking-wider border-b">
                                            <th className="p-3 pl-4 font-bold">Data/Hora</th>
                                            <th className="p-3 font-bold">Pedido #ID</th>
                                            <th className="p-3 font-bold">Método</th>
                                            <th className="p-3 font-bold">Status</th>
                                            <th className="p-3 pr-4 font-bold text-right">Valor Capturado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 text-sm text-gray-700 font-medium">
                                        {logs.map((log: any) => (
                                            <tr key={log.id} className="hover:bg-purple-50 transition cursor-default">
                                                <td className="p-3 pl-4 whitespace-nowrap text-xs text-gray-500">
                                                    {new Date(log.created_at).toLocaleString('pt-BR')}
                                                </td>
                                                <td className="p-3 text-xs font-mono text-gray-500">
                                                    ...{log.order_id.substring(log.order_id.length - 8)}
                                                </td>
                                                <td className="p-3">
                                                    {log.payment_method === 'pix' ? <span className="text-teal-600 font-bold bg-teal-50 px-2 py-0.5 rounded">PIX</span> :
                                                        log.payment_method === 'card' ? <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">Cartão</span> :
                                                            log.payment_method === 'cash' ? <span className="text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded">Dinheiro</span> : log.payment_method}
                                                </td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${log.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                        log.status === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                                                        }`}>
                                                        {log.status.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className={`p-3 pr-4 text-right font-black ${log.status === 'approved' ? 'text-green-600' : 'text-gray-400'}`}>
                                                    {log.status === 'approved' ? '+' : ''}{Rfull(log.amount_cents)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
