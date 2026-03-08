'use client';

import React, { useEffect, useState } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

export default function AnalyticsPage() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isAdminState, setIsAdminState] = useState(false);

    useEffect(() => {
        fetchData();
        // Escuta mudança de tenant
        const handleTenantChange = () => fetchData();
        window.addEventListener('tenant_changed', handleTenantChange);
        return () => window.removeEventListener('tenant_changed', handleTenantChange);
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('admin_token');
            const slug = localStorage.getItem('admin_slug') || 'default';
            const isAdmin = localStorage.getItem('isSuperAdmin') === 'true';
            setIsAdminState(isAdmin);

            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

            // Endpoint varia de acordo com o nível de acesso (Super vs Tenant)
            const endpoint = isAdmin
                ? `${API_URL}/api/super/analytics`
                : `${API_URL}/api/admin/analytics?slug=${slug}&days=30`;

            const res = await fetch(endpoint, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                setStats(await res.json());
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-10 text-center font-bold text-gray-400 animate-pulse">Carregando painel analítico...</div>;
    }

    if (!stats) {
        return <div className="p-10 text-center font-bold text-gray-400">Falha ao carregar dados.</div>;
    }

    // ==========================================
    // RENDER: SUPER ADMIN VIEW (GLOBAL PLATFORM)
    // ==========================================
    if (isAdminState) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-800 flex items-center gap-2">
                        🌎 Global Platform Analytics
                    </h1>
                    <p className="text-gray-500 font-medium mt-1">Visão macro de toda a operação (Todos os Lojistas)</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 p-6 rounded-2xl shadow-lg text-white">
                        <div className="text-indigo-100 font-bold uppercase tracking-widest text-xs mb-2 flex items-center gap-2">
                            <span>🏢</span> Lojistas Ativos (Tenants)
                        </div>
                        <div className="text-4xl font-black">{stats.totalTenants || 0}</div>
                    </div>

                    <div className="bg-gradient-to-br from-green-500 to-green-700 p-6 rounded-2xl shadow-lg text-white">
                        <div className="text-green-100 font-bold uppercase tracking-widest text-xs mb-2 flex items-center gap-2">
                            <span>💸</span> Gross Merchandise Value (GMV)
                        </div>
                        <div className="text-4xl font-black leading-none">
                            <span className="text-xl mr-1">R$</span>
                            {(stats.globalGrossRevenue / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-sky-500 to-sky-700 p-6 rounded-2xl shadow-lg text-white">
                        <div className="text-sky-100 font-bold uppercase tracking-widest text-xs mb-2 flex items-center gap-2">
                            <span>📦</span> Pedidos Processados
                        </div>
                        <div className="text-4xl font-black">{stats.totalOrders || 0}</div>
                    </div>

                    <div className="bg-gradient-to-br from-fuchsia-500 to-fuchsia-700 p-6 rounded-2xl shadow-lg text-white">
                        <div className="text-fuchsia-100 font-bold uppercase tracking-widest text-xs mb-2 flex items-center gap-2">
                            <span>👥</span> Base de Consumidores
                        </div>
                        <div className="text-4xl font-black">{stats.totalCustomers || 0}</div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border mt-8 flex justify-center items-center text-gray-500 py-12">
                    <p className="font-medium text-center max-w-lg">
                        ⚠️ No momento, a visão Super Admin exibe agregados globais.<br /> Para ver o gráfico e as vendas detalhadas de uma loja, selecione-a no Switcher de Restaurantes do topo.
                    </p>
                </div>
            </div>
        );
    }

    // ==========================================
    // RENDER: TENANT VIEW (SINGLE RESTAURANT)
    // ==========================================

    // Preparar dados do gráfico
    const chartData = {
        labels: stats?.dailyRevenue?.map((d: any) => new Date(d.day + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })) || [],
        datasets: [
            {
                label: 'Faturamento Bruto Diário (R$)',
                data: stats?.dailyRevenue?.map((d: any) => d.revenue / 100) || [],
                borderColor: '#8B5CF6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#8B5CF6',
                pointBorderWidth: 2,
                pointRadius: 4,
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#1F2937',
                padding: 12,
                titleFont: { size: 14, family: 'Inter' },
                bodyFont: { size: 14, family: 'Inter', weight: 'bold' },
                callbacks: {
                    label: (context: any) => `R$ ${context.parsed.y.toFixed(2).replace('.', ',')}`
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: '#F3F4F6' },
                border: { display: false },
                ticks: {
                    color: '#6B7280',
                    font: { family: 'Inter', size: 11 },
                    callback: (value: any) => 'R$ ' + value
                }
            },
            x: {
                grid: { display: false },
                border: { display: false },
                ticks: { color: '#6B7280', font: { family: 'Inter', size: 11 } }
            }
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-black text-gray-800 flex items-center gap-2">
                    📈 Analytics Dashboard
                </h1>
                <p className="text-gray-500 font-medium mt-1">Métricas de venda e faturamento dos últimos 30 dias</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <div className="text-gray-500 font-bold uppercase tracking-wider text-xs mb-1">Faturamento (30d)</div>
                        <div className="text-4xl text-green-700 font-black">
                            <span className="text-lg mr-1 text-green-600">R$</span>
                            {((stats.summary?.totalRevenue || 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                    <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center text-3xl">💰</div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <div className="text-gray-500 font-bold uppercase tracking-wider text-xs mb-1">Total Pedidos (30d)</div>
                        <div className="text-4xl text-purple-700 font-black">
                            {stats.summary?.totalOrders || 0}
                        </div>
                    </div>
                    <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center text-3xl">📦</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Gráfico */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative min-h-[400px]">
                    <h3 className="text-gray-800 font-bold mb-6 italic flex items-center gap-2">
                        Receita Diária Bruta
                        {stats.info && <span className="text-[10px] bg-amber-100 text-amber-700 font-black px-2 py-0.5 rounded uppercase not-italic">Pro</span>}
                    </h3>

                    {stats.info ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/80 rounded-2xl backdrop-blur-[2px] z-10 p-8 text-center">
                            <div className="text-4xl mb-4">🔒</div>
                            <h4 className="text-lg font-black text-gray-800">Gráficos Avançados Indisponíveis</h4>
                            <p className="text-sm text-gray-500 max-w-sm mt-2 mb-6">Assine o plano <b>PRO</b> para visualizar o faturamento histórico, horários de pico e retenção de clientes.</p>
                            <button className="bg-purple-600 text-white font-black px-6 py-2 rounded-lg shadow-md hover:bg-purple-700 transition">Ver Planos de Upgrade</button>
                        </div>
                    ) : (
                        <div className="absolute inset-0 top-16 bottom-6 px-6">
                            <Line data={chartData} options={chartOptions as any} />
                        </div>
                    )}
                </div>

                {/* Top Produtos */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="text-gray-800 font-bold mb-6 flex items-center gap-2">
                        ⭐ Itens Mais Vendidos
                        {stats.info && <span className="text-[10px] bg-amber-100 text-amber-700 font-black px-2 py-0.5 rounded uppercase">Pro</span>}
                    </h3>

                    {stats.info ? (
                        <div className="space-y-4 opacity-30 select-none grayscale">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="flex justify-between items-center blur-[2px]">
                                    <div className="w-8 h-8 rounded-full bg-gray-200"></div>
                                    <div className="h-4 bg-gray-200 w-24 rounded"></div>
                                    <div className="h-4 bg-gray-200 w-12 rounded"></div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        stats?.topItems?.length === 0 ? (
                            <p className="text-center text-gray-400 py-10 font-medium text-sm">Nenhum dado de vendas ainda.</p>
                        ) : (
                            <div className="space-y-4">
                                {stats.topItems.map((item: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center group">
                                        <div className="flex gap-3 items-center">
                                            <div className="w-8 h-8 rounded-full bg-yellow-100 text-yellow-700 font-black flex items-center justify-center text-sm shadow-inner shrink-0">
                                                #{i + 1}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-800 leading-tight group-hover:text-purple-600 transition max-w-[150px] truncate" title={item.item_name}>
                                                    {item.item_name}
                                                </p>
                                                <p className="text-xs text-gray-500 font-medium border border-gray-200 inline-block px-2 rounded mt-1 bg-gray-50">
                                                    {item.qty} vendidos
                                                </p>
                                            </div>
                                        </div>
                                        <div className="font-black text-gray-900 border-l pl-4 py-2">
                                            <span className="text-xs font-bold text-gray-400 mr-1">R$</span>
                                            {(item.revenue / 100).toFixed(2).replace('.', ',')}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>
            </div>

        </div>
    );
}
