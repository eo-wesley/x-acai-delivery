'use client';

import { useState, useEffect } from 'react';
import { ShoppingBag, Link as LinkIcon, AlertCircle, CheckCircle2, RefreshCw, Layers } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : ''; }
function getSlug() { return typeof window !== 'undefined' ? localStorage.getItem('admin_slug') || 'default' : 'default'; }

type Integration = {
    platform: string;
    status: 'connected' | 'disconnected';
    updated_at: string;
};

export default function MarketplacesPage() {
    const [integrations, setIntegrations] = useState<Integration[]>([]);
    const [loading, setLoading] = useState(true);

    const loadIntegrations = async () => {
        try {
            const res = await fetch(`${API}/api/${getSlug()}/marketplace/status`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            const data = await res.json();
            setIntegrations(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadIntegrations();
    }, []);

    const handleConnect = async (platform: string) => {
        try {
            const res = await fetch(`${API}/api/${getSlug()}/marketplace/connect`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${getToken()}`
                },
                body: JSON.stringify({ platform, config: { mock: true } })
            });
            if (res.ok) {
                alert(`${platform} conectado!`);
                loadIntegrations();
            }
        } catch (e) {
            alert('Erro ao conectar.');
        }
    };

    const getStatus = (platform: string) => {
        const found = integrations.find(i => i.platform === platform);
        return found ? found.status : 'disconnected';
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-8">
            <header>
                <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter flex items-center gap-3">
                    <ShoppingBag className="text-orange-500" size={32} />
                    Marketplace Integration Hub
                </h1>
                <p className="text-gray-500 font-bold uppercase text-xs tracking-widest mt-1">Gerencie suas vendas externas em um só lugar</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* iFood Card */}
                <div className="bg-white rounded-3xl p-8 shadow-xl border-4 border-gray-100 relative overflow-hidden group">
                    <div className="flex items-start justify-between relative z-10">
                        <div className="bg-red-50 p-4 rounded-2xl">
                            <img src="https://logodownload.org/wp-content/uploads/2017/05/ifood-logo-1.png" alt="iFood" className="h-8 grayscale group-hover:grayscale-0 transition-all" />
                        </div>
                        {getStatus('ifood') === 'connected' ? (
                            <span className="bg-green-100 text-green-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1">
                                <CheckCircle2 size={12} /> Ativo
                            </span>
                        ) : (
                            <span className="bg-gray-100 text-gray-400 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">Desconectado</span>
                        )}
                    </div>

                    <div className="mt-8 relative z-10">
                        <h2 className="text-xl font-black text-gray-800">iFood Delivery</h2>
                        <p className="text-sm text-gray-500 font-medium mt-2">Receba pedidos do iFood diretamente no seu KDS e sincronize seu cardápio automaticamente.</p>
                    </div>

                    <div className="mt-8 flex gap-3 relative z-10">
                        {getStatus('ifood') === 'connected' ? (
                            <>
                                <button className="flex-1 bg-gray-900 text-white font-black py-3 rounded-2xl text-sm transition hover:bg-black active:scale-95 flex items-center justify-center gap-2">
                                    <Layers size={18} /> MAPEAR PRODUTOS
                                </button>
                                <button className="p-3 bg-gray-100 text-gray-500 rounded-2xl hover:bg-gray-100">
                                    <RefreshCw size={20} />
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => handleConnect('ifood')}
                                className="w-full bg-red-600 text-white font-black py-4 rounded-2xl transition hover:bg-red-700 active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-red-100"
                            >
                                <LinkIcon size={18} /> CONECTAR AGORA
                            </button>
                        )}
                    </div>
                </div>

                {/* Rappi Card */}
                <div className="bg-white rounded-3xl p-8 shadow-xl border-4 border-gray-100 opacity-60 grayscale cursor-not-available">
                    <div className="flex items-start justify-between">
                        <div className="bg-orange-50 p-4 rounded-2xl">
                            <img src="https://rappi.com/logo.png" alt="Rappi" className="h-8" />
                        </div>
                        <span className="bg-gray-100 text-gray-400 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest font-mono">Em Breve</span>
                    </div>
                    <div className="mt-8">
                        <h2 className="text-xl font-black text-gray-800">Rappi Platform</h2>
                        <p className="text-sm text-gray-500 font-medium mt-2">Expanda sua base de clientes com a integração nativa Rappi.</p>
                    </div>
                </div>
            </div>

            <div className="bg-blue-50 border-2 border-blue-100 rounded-3xl p-6 flex items-start gap-4">
                <AlertCircle className="text-blue-500 shrink-0" size={24} />
                <div>
                    <h3 className="text-blue-900 font-black text-sm uppercase tracking-tight">Dica de Especialista</h3>
                    <p className="text-blue-700 text-sm font-medium mt-1">
                        Mantenha o mapeamento de produtos atualizado para evitar erros de cancelamento automático no marketplace.
                        O X-Açaí sincroniza as alterações de preço em tempo real para parceiros conectados.
                    </p>
                </div>
            </div>
        </div>
    );
}
