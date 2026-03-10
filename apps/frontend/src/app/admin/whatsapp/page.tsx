'use client';

import { useState, useEffect } from 'react';
import {
    MessageSquare,
    Settings,
    History,
    CheckCircle2,
    XCircle,
    RefreshCw,
    Link,
    Key,
    Globe,
    ExternalLink,
    Clock,
    User
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function WhatsAppSettings() {
    const [status, setStatus] = useState<any>(null);
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [config, setConfig] = useState({
        base_url: '',
        instance: '',
        apikey: ''
    });

    const fetchData = async () => {
        const slug = localStorage.getItem('admin_slug') || 'default';
        const headers = { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` };

        try {
            const [statusRes, logsRes] = await Promise.all([
                fetch(`${API}/api/${slug}/whatsapp/admin/whatsapp/status`, { headers }),
                fetch(`${API}/api/${slug}/whatsapp/admin/whatsapp/logs`, { headers })
            ]);

            if (statusRes.ok) {
                const data = await statusRes.json();
                setStatus(data);
                if (data.config) {
                    setConfig({
                        base_url: data.config.base_url,
                        instance: data.config.instance,
                        apikey: data.config.apikey
                    });
                }
            }
            if (logsRes.ok) setLogs(await logsRes.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdating(true);
        const slug = localStorage.getItem('admin_slug') || 'default';
        const headers = {
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
            'Content-Type': 'application/json'
        };

        try {
            const res = await fetch(`${API}/api/${slug}/whatsapp/admin/whatsapp/config`, {
                method: 'POST',
                headers,
                body: JSON.stringify(config)
            });
            if (res.ok) {
                await fetchData();
                alert('Configuração salva com sucesso!');
            }
        } catch (err) {
            alert('Erro ao salvar configuração.');
        } finally {
            setUpdating(false);
        }
    };

    if (loading) return <div className="p-12 text-center animate-pulse text-emerald-600 font-black tracking-widest uppercase">Validando Conectividade WhatsApp...</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-10 bg-gray-50 min-h-screen">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase leading-none mb-2 font-mono italic">WhatsApp Pro</h1>
                    <p className="text-gray-400 font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${status?.connected ? 'bg-emerald-500 animate-ping' : 'bg-red-500'}`}></div>
                        Evolution API • Status: {status?.connected ? 'Conectado' : 'Desconectado'}
                    </p>
                </div>
                <button
                    onClick={() => { setLoading(true); fetchData(); }}
                    className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition text-gray-400 hover:text-emerald-500"
                >
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* CONFIG FORM */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl relative overflow-hidden">
                        <div className="flex items-center gap-3 mb-8">
                            <Settings className="text-emerald-500" size={24} />
                            <h2 className="text-xl font-black text-gray-800 uppercase tracking-tighter">Configuração</h2>
                        </div>

                        <form onSubmit={handleSave} className="space-y-6 relative z-10">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <Globe size={12} /> Base URL (Evolution)
                                </label>
                                <input
                                    value={config.base_url}
                                    onChange={e => setConfig({ ...config, base_url: e.target.value })}
                                    placeholder="https://api.seuservidor.com"
                                    className="w-full bg-gray-50 border-none p-4 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <Link size={12} /> Nome da Instância
                                </label>
                                <input
                                    value={config.instance}
                                    onChange={e => setConfig({ ...config, instance: e.target.value })}
                                    placeholder="restaurante-acai"
                                    className="w-full bg-gray-50 border-none p-4 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <Key size={12} /> Global API Key
                                </label>
                                <input
                                    type="password"
                                    value={config.apikey}
                                    onChange={e => setConfig({ ...config, apikey: e.target.value })}
                                    placeholder="Sua-Secret-Key"
                                    className="w-full bg-gray-50 border-none p-4 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={updating}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-emerald-200 transition disabled:opacity-50"
                            >
                                {updating ? 'Salvando...' : 'Salvar & Conectar'}
                            </button>
                        </form>

                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50"></div>
                    </div>

                    <div className="bg-emerald-950 p-6 rounded-[2rem] text-white">
                        <div className="flex items-center gap-2 mb-4">
                            <ExternalLink size={16} className="text-emerald-400" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Dica Pro</p>
                        </div>
                        <p className="text-xs font-medium text-emerald-100 leading-relaxed italic">
                            "Mantenha sua instância sempre ativa na Evolution API para garantir que notificações de novos pedidos e cupons de marketing cheguem instantaneamente."
                        </p>
                    </div>
                </div>

                {/* NOTIFICATION LOGS */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <History className="text-indigo-600" size={24} />
                            <h2 className="text-xl font-black text-gray-800 uppercase tracking-tighter">Log de Transmissão</h2>
                        </div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Últimas 50 Mensagens</span>
                    </div>

                    <div className="space-y-3">
                        {logs.map(log => (
                            <div key={log.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition group">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${log.status === 'sent' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                        {log.status === 'sent' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-black text-gray-900 uppercase tracking-tight">{log.event.replace('_', ' ')}</span>
                                            <span className="text-[10px] font-bold text-gray-300">•</span>
                                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">#{log.order_id === 'MARKETING' ? 'MARKETING' : log.order_id.slice(-6)}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 font-medium truncate max-w-[300px]">{log.message}</p>
                                    </div>
                                </div>
                                <div className="text-right flex flex-col items-end">
                                    <div className="flex items-center gap-1 text-[10px] font-black text-gray-400 uppercase mb-1">
                                        <Clock size={10} /> {new Date(log.created_at).toLocaleTimeString()}
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] font-black text-gray-600 uppercase">
                                        <User size={10} /> {log.customer_name || 'Automação'}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {logs.length === 0 && (
                            <div className="p-16 text-center bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
                                <MessageSquare size={48} className="mx-auto text-gray-100 mb-4" />
                                <p className="text-gray-400 font-bold uppercase text-xs">Nenhuma notificação enviada ainda.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
