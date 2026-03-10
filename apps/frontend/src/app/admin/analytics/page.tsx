'use client';

import React, { useState, useEffect } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

export default function AnalyticsPage() {
    const [metrics, setMetrics] = useState<any>(null);
    const [forecast, setForecast] = useState<any>(null);
    const [feeAudit, setFeeAudit] = useState<any>(null);
    const [operational, setOperational] = useState<any>(null);
    const [alerts, setAlerts] = useState<any[]>([]);
    const [yieldData, setYieldData] = useState<any>(null);
    const [pricingRules, setPricingRules] = useState<any>(null);
    const [retentionData, setRetentionData] = useState<any>(null);
    const [activeDeliveries, setActiveDeliveries] = useState<any[]>([]);
    const [ltvData, setLtvData] = useState<any[]>([]);
    const [procurementSuggestions, setProcurementSuggestions] = useState<any[]>([]);
    const [wasteData, setWasteData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isPremium, setIsPremium] = useState(false);
    const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('admin_token');
                const slug = localStorage.getItem('admin_slug') || 'default';
                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
                const headers = {
                    'Authorization': `Bearer ${token}`,
                    'x-tenant-slug': slug
                };

                // 1. Basic Metrics
                const metricsRes = await fetch(`${API_URL}/api/admin/analytics`, { headers });
                if (metricsRes.ok) setMetrics(await metricsRes.json());

                // 2. BI: Forecast
                const forecastRes = await fetch(`${API_URL}/api/admin/analytics/forecast`, { headers });
                if (forecastRes.ok) setForecast(await forecastRes.json());

                // 3. BI: Fee Audit
                const auditRes = await fetch(`${API_URL}/api/admin/analytics/fee-audit`, { headers });
                if (auditRes.ok) setFeeAudit(await auditRes.json());

                // 4. BI: Operational
                const operRes = await fetch(`${API_URL}/api/admin/analytics/operational`, { headers });
                if (operRes.ok) setOperational(await operRes.json());

                // 5. BI: Smart Alerts
                const alertsRes = await fetch(`${API_URL}/api/admin/analytics/alerts`, { headers });
                if (alertsRes.ok) setAlerts(await alertsRes.json());

                // 6. BI: Yield & Pricing
                const yieldRes = await fetch(`${API_URL}/api/admin/pricing/yield`, { headers });
                if (yieldRes.ok) setYieldData(await yieldRes.json());

                const rulesRes = await fetch(`${API_URL}/api/admin/pricing/rules`, { headers });
                if (rulesRes.ok) setPricingRules(await rulesRes.json());

                // 7. BI: Retention & LTV
                const retentionRes = await fetch(`${API_URL}/api/admin/analytics/retention`, { headers });
                if (retentionRes.ok) setRetentionData(await retentionRes.json());

                const ltvRes = await fetch(`${API_URL}/api/admin/analytics/ltv`, { headers });
                if (ltvRes.ok) setLtvData(await ltvRes.json());

                // 8. BI: Procurement AI
                const procRes = await fetch(`${API_URL}/api/admin/procurement/suggestions`, { headers });
                if (procRes.ok) setProcurementSuggestions(await procRes.json());

                const wasteRes = await fetch(`${API_URL}/api/admin/procurement/waste`, { headers });
                if (wasteRes.ok) setWasteData(await wasteRes.json());

                setIsPremium(true);
            } catch (e) {
                console.error('Failed to fetch BI analytics, using expanded mock data', e);
                // MOCK DATA FOR DEMO
                setMetrics({
                    summary: { totalOrders: 450, totalRevenue: 1350000, avgTicketCents: 3000, retentionRate: 65 },
                    topItems: [
                        { item_name: 'Açaí Tradicional 500ml', qty: 85, revenue: 255000 },
                        { item_name: 'Açaí Tropical 700ml', qty: 62, revenue: 310000 }
                    ],
                    dailyRevenue: Array.from({ length: 7 }, (_, i) => ({ day: `2024-03-0${i + 1}`, revenue: Math.random() * 100000, orders_count: 50 })),
                    hourlyHeatmap: Array.from({ length: 12 }, (_, i) => ({ hour: String(i * 2).padStart(2, '0'), count: Math.floor(Math.random() * 20) })),
                    payment_methods: [{ payment_method: 'pix', revenue: 1000000, count: 400 }]
                });
                setForecast({
                    next7Days: Array.from({ length: 7 }, (_, i) => ({
                        date: `Mar ${10 + i}`,
                        predictedOrders: Math.round(50 + Math.random() * 20),
                        confidenceHigh: 80,
                        confidenceLow: 40
                    }))
                });
                setFeeAudit({
                    summary: {
                        totalOrdersAudit: 120,
                        totalExpectedFees: 250000,
                        totalRecordedFees: 248000,
                        discrepancyTotal: 2000,
                        discrepancyCount: 3
                    },
                    discrepancies: [
                        { orderId: 'ORD-123', source: 'ifood', amount: 5000, expectedFee: 1350, recordedFee: 1500, diff: -150 }
                    ]
                });
                setOperational({
                    avgPrepMinutes: 24,
                    staffActivity: [
                        { name: 'Carlos (Cozinha)', actions_count: 145 },
                        { name: 'Ana (Balcão)', actions_count: 98 }
                    ]
                });

                // --- Logistics Radar ---
                try {
                    const activeRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/logistics/admin/active`, {
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
                    });
                    const activeData = await activeRes.json();
                    if (Array.isArray(activeData)) setActiveDeliveries(activeData);
                } catch (e) {
                    console.error("Logistics fetch failed, using fallback");
                    setActiveDeliveries([]);
                }
                setYieldData({
                    currentBalanceCents: 125000,
                    history: [
                        { day: 'Seg', amount: 5000 }, { day: 'Ter', amount: 4000 }, { day: 'Qua', amount: 6000 },
                        { day: 'Qui', amount: 8000 }, { day: 'Sex', amount: 15000 }, { day: 'Sáb', amount: 20000 }, { day: 'Dom', amount: 18000 }
                    ]
                });
                setPricingRules({
                    surge: { enabled: true, threshold_orders_per_hour: 15, fee_multiplier: 1.5 },
                    happy_hour: { enabled: true, start_time: "14:00", end_time: "17:00", discount_percentage: 15, categories: [] }
                });
                setRetentionData({
                    health: { healthy: 45, atRisk: 12, inactive: 30 },
                    risks: [
                        { id: '1', name: 'Marcos Silva', days_since_last: 18, avg_interval_days: 10 },
                        { id: '2', name: 'Julia Costa', days_since_last: 22, avg_interval_days: 12 }
                    ]
                });
                setLtvData([
                    { name: 'Roberto Lima', ltv_cents: 150000, orders_count: 42 },
                    { name: 'Fernanda Souza', ltv_cents: 120000, orders_count: 35 }
                ]);
                setProcurementSuggestions([
                    { name: 'Açaí 10L', suggestedQty: 12, reason: 'Reposição Preventiva', estimatedCost: 45000 },
                    { name: 'Granola 1kg', suggestedQty: 5, reason: 'Urgente: Estoque Baixo', estimatedCost: 8500 }
                ]);
                setWasteData({
                    estimatedWastePercentage: 3.8,
                    potentialSavingsCents: 18500,
                    topWasteItems: [{ name: 'Açaí', lossCents: 12000 }]
                });
                setIsPremium(true);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700"></div>
        </div>
    );

    if (!metrics) return <div>Erro ao carregar métricas.</div>;

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
    };

    const handleAIAction = async (action: string, payload: any) => {
        try {
            const token = localStorage.getItem('admin_token');
            const slug = localStorage.getItem('admin_slug') || 'default';
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

            const res = await fetch(`${API_URL}/api/admin/actions/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'x-tenant-slug': slug
                },
                body: JSON.stringify({ action, payload })
            });

            const data = await res.json();
            if (res.ok) {
                setNotification({ type: 'success', message: data.message });
                setTimeout(() => setNotification(null), 5000);
            } else {
                setNotification({ type: 'error', message: data.error || 'Erro ao executar ação.' });
                setTimeout(() => setNotification(null), 5000);
            }
        } catch (e) {
            setNotification({ type: 'error', message: 'Falha na conexão com o servidor de IA.' });
            setTimeout(() => setNotification(null), 5000);
        }
    };

    // Demand Forecast Chart
    const forecastData = {
        labels: forecast?.next7Days?.map((d: any) => d.date) || [],
        datasets: [{
            label: 'Previsão de Pedidos (IA)',
            data: forecast?.next7Days?.map((d: any) => d.predictedOrders) || [],
            borderColor: 'rgb(147, 51, 234)',
            backgroundColor: 'rgba(147, 51, 234, 0.2)',
            borderDash: [5, 5],
            fill: true,
            tension: 0.4
        }]
    };

    // Revenue Trend Chart
    const revenueTrendData = {
        labels: metrics.dailyRevenue?.map((d: any) => d.day) || [],
        datasets: [{
            fill: true,
            label: 'Faturamento Diário',
            data: metrics.dailyRevenue?.map((d: any) => d.revenue / 100) || [],
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
        }]
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20 relative">
            {/* AI Notification Toast */}
            {notification && (
                <div className={`fixed top-4 right-4 z-50 p-4 rounded-2xl shadow-2xl border animate-in slide-in-from-right duration-300 ${notification.type === 'success' ? 'bg-green-600 border-green-400 text-white' : 'bg-red-600 border-red-400 text-white'
                    }`}>
                    <div className="flex items-center gap-3">
                        <span className="text-xl">{notification.type === 'success' ? '✅' : '❌'}</span>
                        <p className="font-bold text-sm">{notification.message}</p>
                    </div>
                </div>
            )}

            {/* Premium Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Business Intelligence</h1>
                    <p className="text-gray-500 font-medium">Auditoria financeira e previsões baseadas em IA.</p>
                </div>
                <div className="flex gap-2">
                    <span className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg">
                        Premium Plan Active
                    </span>
                </div>
            </div>

            {/* Main KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Receita (30d)', value: formatCurrency(metrics.summary.totalRevenue), color: 'text-blue-600', trend: '+12%', icon: '💰' },
                    { label: 'Pedidos (30d)', value: metrics.summary.totalOrders, color: 'text-purple-600', trend: '+5%', icon: '📦' },
                    { label: 'Ticket Médio', value: formatCurrency(metrics.summary.avgTicketCents), color: 'text-green-600', trend: '-2%', icon: '🎫' },
                    { label: 'Tempo Médio Preparo', value: `${operational?.avgPrepMinutes || 0} min`, color: 'text-orange-600', trend: '-4 min', icon: '⏱️' }
                ].map((kpi, i) => (
                    <div key={i} className="bg-white/70 backdrop-blur-md border border-white/20 p-6 rounded-3xl shadow-xl hover:scale-[1.02] transition-transform cursor-default">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-2xl">{kpi.icon}</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${kpi.trend.startsWith('+') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {kpi.trend}
                            </span>
                        </div>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{kpi.label}</p>
                        <h3 className={`text-2xl font-black ${kpi.color}`}>{kpi.value}</h3>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Demand Forecast - IA */}
                <div className="lg:col-span-2 bg-gradient-to-br from-white to-purple-50 p-8 rounded-3xl shadow-2xl border border-purple-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4">
                        <span className="bg-purple-600 text-white text-[10px] font-bold px-2 py-1 rounded">IA CORE</span>
                    </div>
                    <h2 className="text-xl font-black text-gray-800 mb-2">Previsão Proativa de Demanda</h2>
                    <p className="text-sm text-gray-500 mb-8 font-medium">Previsão baseada em regressão linear dos últimos 6 meses.</p>
                    <div className="h-[300px]">
                        <Line
                            data={forecastData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false } },
                                scales: {
                                    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                                    x: { grid: { display: false } }
                                }
                            }}
                        />
                    </div>
                </div>

                {/* Staff Performance */}
                <div className="bg-white/80 p-8 rounded-3xl shadow-xl border border-gray-100 h-full">
                    <h2 className="text-xl font-black text-gray-800 mb-6">Eficiência da Equipe</h2>
                    <div className="space-y-6">
                        {(operational?.staffActivity || []).map((staff: any, i: number) => (
                            <div key={i} className="space-y-2">
                                <div className="flex justify-between text-sm font-bold">
                                    <span className="text-gray-700">{staff.name}</span>
                                    <span className="text-purple-600">{staff.actions_count} ações</span>
                                </div>
                                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-purple-400 to-indigo-500"
                                        style={{ width: `${Math.min(100, (staff.actions_count / 150) * 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-8 p-4 bg-indigo-50 rounded-2xl">
                        <p className="text-xs text-indigo-700 font-bold leading-tight">
                            ℹ️ Equipe está operando {(operational?.avgPrepMinutes || 0) < 25 ? 'dentro' : 'acima'} do SLA esperado de 25 min.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Yield Management - IA Extra Revenue */}
                <div className="lg:col-span-2 bg-gradient-to-br from-gray-900 to-indigo-900 p-8 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-20">
                        <span className="text-6xl font-black italic tracking-tighter">YIELD</span>
                    </div>
                    <div className="relative z-10">
                        <h2 className="text-2xl font-black mb-1">Painel de Yield Management</h2>
                        <p className="text-indigo-200 text-sm font-medium mb-8">Receita incremental gerada por Precificação Dinâmica.</p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                                <p className="text-[10px] font-black uppercase text-indigo-300 mb-1">Lucro Extra Total</p>
                                <h3 className="text-2xl font-black">{formatCurrency(yieldData?.currentBalanceCents || 0)}</h3>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                                <p className="text-[10px] font-black uppercase text-indigo-300 mb-1">Status Surge</p>
                                <h3 className="text-xl font-black flex items-center gap-2">
                                    {pricingRules?.surge?.enabled ? <span className="text-green-400">ATIVO ⚡</span> : <span className="text-gray-400">OFF</span>}
                                </h3>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                                <p className="text-[10px] font-black uppercase text-indigo-300 mb-1">Happy Hour IA</p>
                                <h3 className="text-xl font-black">{pricingRules?.happy_hour?.enabled ? 'PROGRAMADO 🕒' : 'OFF'}</h3>
                            </div>
                        </div>

                        <div className="h-[200px]">
                            <Bar
                                data={{
                                    labels: yieldData?.history?.map((h: any) => h.day) || [],
                                    datasets: [{
                                        label: 'Receita Extra (R$)',
                                        data: yieldData?.history?.map((h: any) => h.amount / 100) || [],
                                        backgroundColor: 'rgba(129, 140, 248, 0.8)',
                                        borderRadius: 8
                                    }]
                                }}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: { legend: { display: false } },
                                    scales: {
                                        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)' } },
                                        x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.5)' } }
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Pricing Rules Overview */}
                <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 flex flex-col h-full">
                    <h2 className="text-xl font-black text-gray-800 mb-6">Regras de IA Ativas</h2>
                    <div className="space-y-6 flex-1">
                        <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 italic text-sm text-purple-700 font-medium">
                            "A precificação dinâmica está otimizando suas taxas com base em picos de {pricingRules?.surge?.threshold_orders_per_hour} pedidos/hora."
                        </div>
                        <div className="flex justify-between items-center p-4 border-b">
                            <div>
                                <p className="text-sm font-black text-gray-800">Multiplicador Surge</p>
                                <p className="text-xs text-gray-400">Taxa de entrega extra</p>
                            </div>
                            <span className="text-lg font-black text-indigo-600">{pricingRules?.surge?.fee_multiplier}x</span>
                        </div>
                        <div className="flex justify-between items-center p-4 border-b">
                            <div>
                                <p className="text-sm font-black text-gray-800">Desconto HH</p>
                                <p className="text-xs text-gray-400">Preço reduzido automático</p>
                            </div>
                            <span className="text-lg font-black text-green-600">{pricingRules?.happy_hour?.discount_percentage}%</span>
                        </div>
                    </div>
                    <button className="w-full mt-6 bg-gray-100 hover:bg-gray-200 py-4 rounded-2xl text-sm font-black text-gray-600 transition-colors uppercase tracking-widest">
                        Ajustar Regras
                    </button>
                </div>
            </div>

            {/* AI Retention Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Customer Health Graph */}
                <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
                    <h2 className="text-xl font-black text-gray-800 mb-2">Saúde da Base (IA)</h2>
                    <p className="text-sm text-gray-400 font-medium mb-6">Status de engajamento dos clientes.</p>
                    <div className="h-[250px] flex items-center justify-center">
                        <Doughnut
                            data={{
                                labels: ['Saudáveis', 'Em Risco', 'Inativos'],
                                datasets: [{
                                    data: [retentionData?.health?.healthy || 0, retentionData?.health?.atRisk || 0, retentionData?.health?.inactive || 0],
                                    backgroundColor: ['#22c55e', '#eab308', '#ef4444'],
                                    borderWidth: 0,
                                }]
                            }}
                            options={{
                                responsive: true,
                                cutout: '70%',
                                plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, font: { weight: 'bold' } } } }
                            }}
                        />
                    </div>
                </div>

                {/* Churn Risk List */}
                <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-xl border border-orange-100">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-black text-gray-800">Clientes "Sumidos" (Risco de Churn)</h2>
                        <span className="bg-orange-100 text-orange-600 text-[10px] font-black px-3 py-1 rounded-full border border-orange-200 uppercase">Ação Imediata</span>
                    </div>
                    <div className="space-y-4">
                        {(retentionData?.risks || []).slice(0, 4).map((risk: any, i: number) => (
                            <div key={i} className="flex flex-col md:flex-row items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-orange-300 transition-colors gap-4">
                                <div>
                                    <p className="font-bold text-gray-800">{risk.name}</p>
                                    <p className="text-[10px] text-gray-400 uppercase font-black">Último pedido há {Math.round(risk.days_since_last)} dias (Média: {Math.round(risk.avg_interval_days)})</p>
                                </div>
                                <button
                                    onClick={() => handleAIAction('churn_winback', { customerId: risk.id, customerName: risk.name, customerPhone: risk.phone })}
                                    className="bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-black uppercase px-6 py-3 rounded-xl shadow-lg shadow-orange-100 transition-all"
                                >
                                    Enviar Oferta Winback
                                </button>
                            </div>
                        ))}
                        {(retentionData?.risks || []).length === 0 && (
                            <div className="text-center py-10 w-full">
                                <span className="text-4xl">💎</span>
                                <p className="text-sm font-bold text-gray-400 mt-2">Sua base de clientes está saudável hoje!</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Logistics Radar (New Module) */}
                <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 lg:col-span-1">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-xl font-black text-gray-800">Radar de Entregas</h2>
                            <p className="text-sm text-gray-400 font-medium tracking-tight">Tempo real (Beta)</p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            <span className="text-[10px] font-black text-gray-500 uppercase">{activeDeliveries.length} online</span>
                        </div>
                    </div>

                    <div className="h-[250px] bg-slate-900 rounded-3xl relative overflow-hidden flex items-center justify-center">
                        {/* Mock Substrate / Map */}
                        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#4f46e5_1px,transparent_1px)] [background-size:20px_20px]"></div>

                        {activeDeliveries.map((delivery, i) => (
                            <div
                                key={i}
                                className="absolute w-8 h-8 bg-purple-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center animate-bounce"
                                style={{
                                    left: `${20 + (i * 20)}%`,
                                    top: `${30 + (i * 15)}%`
                                }}
                            >
                                <span className="text-sm">🏍️</span>
                            </div>
                        ))}

                        {activeDeliveries.length === 0 && (
                            <p className="text-xs font-bold text-gray-500 max-w-[150px] text-center">Sem entregas ativas no momento.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* LTV Ranking */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
                <h2 className="text-xl font-black text-gray-800 mb-8">Top 10 Clientes VIP (LTV)</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                    {ltvData.map((cust, i) => (
                        <div key={i} className="bg-gradient-to-br from-indigo-50 to-white p-6 rounded-3xl border border-indigo-100 relative overflow-hidden">
                            <span className="absolute -top-2 -right-2 text-4xl opacity-10">⭐</span>
                            <p className="font-black text-gray-800 truncate mb-1">{cust.name}</p>
                            <p className="text-[10px] font-bold text-indigo-600 uppercase mb-3">{cust.orders_count} PEDIDOS</p>
                            <p className="text-lg font-black text-gray-900">{formatCurrency(cust.ltv_cents)}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* AI Supply Chain Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* procurement Suggestions */}
                <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-blue-50">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-black text-gray-800">IA de Compras (Sugestões)</h2>
                        <span className="bg-blue-100 text-blue-600 text-[10px] font-black px-3 py-1 rounded-full border border-blue-200 uppercase">Otimização de CMV</span>
                    </div>
                    <div className="space-y-4">
                        {procurementSuggestions.map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                                <div>
                                    <p className="font-bold text-gray-800">{item.name}</p>
                                    <p className="text-[10px] text-blue-500 uppercase font-black">{item.reason}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-black text-gray-900">Pedir {item.suggestedQty} un</p>
                                    <p className="text-[10px] text-gray-400 font-bold">Est. {formatCurrency(item.estimatedCost)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Waste Tracking */}
                <div className="bg-gradient-to-br from-red-50 to-white p-8 rounded-[2.5rem] shadow-xl border border-red-100">
                    <h2 className="text-xl font-black text-gray-800 mb-2">Monitor de Desperdício</h2>
                    <p className="text-sm text-gray-400 font-medium mb-6">Comparação Compras vs. Vendas (30 dias)</p>
                    <div className="flex items-center gap-8 mb-8">
                        <div className="text-center">
                            <p className="text-3xl font-black text-red-600">{wasteData?.estimatedWastePercentage}%</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Índice Perda</p>
                        </div>
                        <div className="h-10 w-[1px] bg-red-100"></div>
                        <div>
                            <p className="text-xl font-black text-gray-800">{formatCurrency(wasteData?.potentialSavingsCents || 0)}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Economia Potencial</p>
                        </div>
                    </div>
                    <div className="bg-white/50 rounded-2xl p-4 border border-red-50">
                        <p className="text-[10px] font-black text-red-400 uppercase mb-3">Maiores Furos de Estoque</p>
                        {(wasteData?.topWasteItems || []).map((w: any, i: number) => (
                            <div key={i} className="flex justify-between items-center py-1">
                                <span className="text-sm font-bold text-gray-700">{w.name}</span>
                                <span className="text-sm font-black text-red-500">-{formatCurrency(w.lossCents)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* AI Stock Alerts */}
            <div className="bg-white/80 p-8 rounded-3xl shadow-xl border border-red-100 flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-black text-gray-800">Alertas de Estoque Inteligentes (IA)</h2>
                    <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded">CRÍTICO</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
                    {alerts.length > 0 ? alerts.map((alert: any, i: number) => (
                        <div key={i} className="p-4 bg-red-50 rounded-2xl border border-red-100 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                <span className="text-4xl">🚨</span>
                            </div>
                            <h4 className="font-bold text-red-700 text-sm mb-1">{alert.name}</h4>
                            <p className="text-xs text-red-600/80 font-medium">{alert.message || 'Risco de ruptura iminente.'}</p>
                            <button
                                onClick={() => handleAIAction('restock_order', { itemId: alert.itemId, itemName: alert.name, currentQty: alert.currentQty })}
                                className="mt-3 text-[10px] font-black uppercase tracking-widest text-white bg-red-600 px-4 py-2 rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                            >
                                Repor Agora
                            </button>
                        </div>
                    )) : (
                        <div className="col-span-full flex flex-col items-center justify-center h-full text-center py-6">
                            <span className="text-4xl mb-4">✨</span>
                            <p className="text-sm font-bold text-gray-400">Nenhum risco de ruptura detectado pela IA.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Financial Audit Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Fee Discrepancies */}
                <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-xl font-black text-gray-800">Auditoria de Taxas (Marketplaces)</h2>
                            <p className="text-sm text-gray-500 font-medium">Diferença entre taxa contratada vs taxa cobrada.</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-bold text-gray-400 uppercase">Discrepância Total</p>
                            <p className={`text-xl font-black ${feeAudit?.summary?.discrepancyTotal > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {formatCurrency(Math.abs(feeAudit?.summary?.discrepancyTotal || 0))}
                            </p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                    <th className="pb-4">Pedido/Canal</th>
                                    <th className="pb-4">Valor</th>
                                    <th className="pb-4">Taxa Esp.</th>
                                    <th className="pb-4">Taxa Cob.</th>
                                    <th className="pb-4">Diferença</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {(feeAudit?.discrepancies || []).length > 0 ? (
                                    feeAudit.discrepancies.map((d: any, i: number) => (
                                        <tr key={i} className="text-sm hover:bg-gray-50 transition-colors">
                                            <td className="py-4">
                                                <p className="font-bold text-gray-800">{d.orderId}</p>
                                                <p className="text-[10px] font-black text-purple-600 uppercase">{d.source}</p>
                                            </td>
                                            <td className="py-4 font-medium">{formatCurrency(d.amount)}</td>
                                            <td className="py-4 font-medium text-gray-400">{formatCurrency(d.expectedFee)}</td>
                                            <td className="py-4 font-bold text-gray-800">{formatCurrency(d.recordedFee)}</td>
                                            <td className={`py-4 font-black ${d.diff > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                {d.diff > 0 ? '-' : '+'}{formatCurrency(Math.abs(d.diff))}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-gray-400 font-bold">Nenhuma discrepância encontrada nos últimos 30 dias.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Audit Summary Cards */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-8 rounded-3xl text-white shadow-xl">
                        <h3 className="text-lg font-bold mb-4 opacity-80">Resumo da Auditoria</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between border-b border-white/10 pb-2">
                                <span className="text-sm">Pedidos Auditados</span>
                                <span className="font-black">{feeAudit?.summary?.totalOrdersAudit || 0}</span>
                            </div>
                            <div className="flex justify-between border-b border-white/10 pb-2">
                                <span className="text-sm">Sucesso na Taxa</span>
                                <span className="font-black">
                                    {Math.round((1 - ((feeAudit?.summary?.discrepancyCount || 0) / (feeAudit?.summary?.totalOrdersAudit || 1))) * 100)}%
                                </span>
                            </div>
                        </div>
                        <button className="w-full mt-8 bg-white/10 hover:bg-white/20 py-3 rounded-2xl text-sm font-black transition-colors">
                            Contestar Taxas no iFood
                        </button>
                    </div>

                    <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
                        <h3 className="text-lg font-black text-gray-800 mb-4">Metas de CMV</h3>
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full border-4 border-green-500 flex items-center justify-center font-black text-green-600">
                                32%
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase">Ideal: Abaixo de 35%</p>
                                <p className="text-sm font-bold text-gray-700">Seu lucro está saudável.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Smart Action Call */}
            <div className="bg-black p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="relative z-10 max-w-xl">
                    <h3 className="text-3xl font-black mb-4">🚀 Próximo Passo Sugerido</h3>
                    <p className="text-gray-400 font-medium text-lg">
                        A IA detectou um pico de demanda para amanhã entre 18h e 20h.
                        Deseja agendar uma campanha de WhatsApp para 15 minutos antes?
                    </p>
                </div>
                <div className="flex gap-4 relative z-10">
                    <button
                        onClick={() => handleAIAction('schedule_marketing', { customerId: 'ALL', type: 'winback', scheduledFor: new Date(Date.now() + 86400000).toISOString() })}
                        className="bg-white text-black font-black px-8 py-4 rounded-2xl hover:scale-105 transition-all"
                    >
                        Agendar Agora
                    </button>
                </div>
                {/* Decorative mesh gradient */}
                <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-purple-900/40 to-transparent"></div>
            </div>
        </div>
    );
}
