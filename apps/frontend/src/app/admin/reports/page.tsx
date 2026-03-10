'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function ReportsPage() {
    const searchParams = useSearchParams();
    const slug = searchParams.get('slug');
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [annualData, setAnnualData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [exportDates, setExportDates] = useState({ start: '', end: '' });

    useEffect(() => {
        const fetchReports = async () => {
            const token = localStorage.getItem('token');
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
            const headers = { 'Authorization': `Bearer ${token}` };

            try {
                const [auditRes, annualRes] = await Promise.all([
                    fetch(`${API_URL}/api/admin/audit?slug=${slug}`, { headers }),
                    fetch(`${API_URL}/api/admin/reports/annual-summary?slug=${slug}`, { headers })
                ]);

                if (auditRes.ok) setAuditLogs(await auditRes.json());
                if (annualRes.ok) setAnnualData(await annualRes.json());
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        if (slug) fetchReports();
    }, [slug]);

    const handleExport = () => {
        const token = localStorage.getItem('token');
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        window.open(`${API_URL}/api/admin/reports/export/orders?slug=${slug}&start=${exportDates.start}&end=${exportDates.end}&token=${token}`, '_blank');
    };

    if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse font-black uppercase tracking-widest">Carregando Inteligência...</div>;

    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    return (
        <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
            <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-800 tracking-tighter uppercase italic">
                        Enterprise <span className="text-purple-600">Reporting</span>
                    </h1>
                    <p className="text-gray-500 font-bold text-sm uppercase tracking-widest">Gestão de Dados & Governança</p>
                </div>

                <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
                    <input
                        type="date"
                        className="text-xs font-bold p-1 border rounded"
                        onChange={(e) => setExportDates({ ...exportDates, start: e.target.value })}
                    />
                    <span className="text-gray-400 font-black">→</span>
                    <input
                        type="date"
                        className="text-xs font-bold p-1 border rounded"
                        onChange={(e) => setExportDates({ ...exportDates, end: e.target.value })}
                    />
                    <button
                        onClick={handleExport}
                        disabled={!exportDates.start || !exportDates.end}
                        className="bg-black text-white text-[10px] font-black px-4 py-2 rounded-lg uppercase tracking-widest hover:bg-purple-600 transition-colors disabled:opacity-50"
                    >
                        Exportar CSV
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Annual Chart Section */}
                <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-xl border border-gray-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-full -mr-16 -mt-16 opacity-50 blur-3xl"></div>
                    <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6">Desempenho Anual ({annualData?.year})</h2>

                    <div className="h-64 flex items-end justify-between gap-2 px-4">
                        {months.map((m, i) => {
                            const monthIdx = (i + 1).toString().padStart(2, '0');
                            const data = annualData?.monthlyData?.find((d: any) => d.month === monthIdx);
                            const height = data ? Math.min(100, (data.revenue_cents / 5000000) * 100) : 5; // Simples escala

                            return (
                                <div key={m} className="flex-1 flex flex-col items-center gap-2 group relative">
                                    <div className="absolute bottom-full mb-2 bg-black text-white text-[9px] font-black p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                        R$ {((data?.revenue_cents || 0) / 100).toLocaleString('pt-BR')}
                                    </div>
                                    <div
                                        style={{ height: `${height}%` }}
                                        className={`w-full max-w-[20px] rounded-t-lg transition-all duration-1000 ${data ? 'bg-gradient-to-t from-purple-600 to-purple-400 shadow-lg shadow-purple-200' : 'bg-gray-100'}`}
                                    ></div>
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{m}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Audit Logs Section */}
                <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100">
                    <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6">Logs de Auditoria</h2>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
                        {auditLogs.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-8 font-bold">Sem atividades registradas.</p>
                        ) : (
                            auditLogs.map(log => (
                                <div key={log.id} className="border-l-4 border-purple-500 pl-3 py-1">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-[11px] font-black text-gray-800 uppercase leading-none">{log.action}</span>
                                        <span className="text-[9px] font-bold text-gray-400">{new Date(log.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <p className="text-[10px] text-gray-500 font-bold leading-tight uppercase">{log.details}</p>
                                    <div className="text-[9px] text-purple-400 font-black mt-1 uppercase">Por: {log.user_name || 'Admin'}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Analytics Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                {[
                    { label: 'Total Exportado', value: '12 Relatórios', icon: '📥' },
                    { label: 'Ações Editadas', value: auditLogs.length, icon: '✏️' },
                    { label: 'Melhor Mês', value: 'Dezembro', icon: '🏆' },
                    { label: 'Integridade', value: '99.9%', icon: '🛡️' }
                ].map(stat => (
                    <div key={stat.label} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center gap-3">
                        <div className="text-2xl">{stat.icon}</div>
                        <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
                            <p className="text-sm font-black text-gray-800 italic">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
