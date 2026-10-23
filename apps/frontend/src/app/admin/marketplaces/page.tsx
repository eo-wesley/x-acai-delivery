'use client';

import { useState, useEffect } from 'react';
import { ShoppingBag, Link as LinkIcon, AlertCircle, CheckCircle2, RefreshCw, Layers, Printer, ArrowRight, Zap, TrendingUp } from 'lucide-react';
import { getApiBase } from '@/hooks/useTenant';

const API = getApiBase();
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
            if (res.ok) {
                const data = await res.json();
                setIntegrations(Array.isArray(data) ? data : []);
            }
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
        } catch {
            alert('Erro ao conectar.');
        }
    };

    const getStatus = (platform: string) => {
        const found = integrations.find(i => i.platform === platform);
        return found ? found.status : 'disconnected';
    };

    const handlePrintFlyers = () => {
        window.print();
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-8">
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter flex items-center gap-3">
                        <ShoppingBag className="text-purple-600" size={32} />
                        Marketplace Hub & Estratégia de Canais
                    </h1>
                    <p className="text-gray-500 font-bold uppercase text-xs tracking-widest mt-1">
                        Gerencie vendas externas, taxas da Keeta e repasse de comissões
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-black px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1.5 border border-emerald-200">
                        <TrendingUp size={14} /> Economia Média: R$ 8,24 / pedido próprio
                    </span>
                </div>
            </header>

            {/* Grid de Canais de Venda */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1. Keeta (Meituan) */}
                <div className="bg-white rounded-3xl p-6 shadow-xl border-4 border-amber-200 relative overflow-hidden group flex flex-col justify-between">
                    <div>
                        <div className="flex items-start justify-between">
                            <div className="bg-amber-50 px-3.5 py-2 rounded-2xl border border-amber-200">
                                <span className="font-black text-amber-700 tracking-tight text-lg">KEETA</span>
                            </div>
                            <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                                Taxa Baixa (13%)
                            </span>
                        </div>

                        <div className="mt-5">
                            <h2 className="text-lg font-black text-gray-900">Keeta Delivery (Meituan)</h2>
                            <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                                Canal de expansão com comissão agressiva (8% a 13%). Menor sangria de margem do que o iFood.
                            </p>
                            <div className="mt-3 p-3 bg-amber-50/60 rounded-xl border border-amber-100 text-xs">
                                <span className="text-gray-500 font-semibold">Marmitex 700ml sugerido:</span>{' '}
                                <strong className="text-amber-900 font-black">R$ 42,90</strong>
                                <p className="text-[11px] text-gray-500 mt-0.5">Lucro idêntico ao balcão: R$ 22,15 limpos</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => alert('Parâmetros da Keeta já ativos no simulador de precificação!')}
                            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black py-3 rounded-xl transition text-xs active:scale-95 shadow-sm"
                        >
                            CONFIGURAR REPASSE KEETA
                        </button>
                    </div>
                </div>

                {/* 2. iFood */}
                <div className="bg-white rounded-3xl p-6 shadow-xl border-4 border-gray-100 relative overflow-hidden group flex flex-col justify-between">
                    <div>
                        <div className="flex items-start justify-between">
                            <div className="bg-red-50 p-3 rounded-2xl">
                                <img src="https://logodownload.org/wp-content/uploads/2017/05/ifood-logo-1.png" alt="iFood" className="h-6 object-contain" />
                            </div>
                            {getStatus('ifood') === 'connected' ? (
                                <span className="bg-green-100 text-green-700 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                                    <CheckCircle2 size={12} /> Ativo
                                </span>
                            ) : (
                                <span className="bg-red-100 text-red-700 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                                    Taxa Alta (26.2%)
                                </span>
                            )}
                        </div>

                        <div className="mt-5">
                            <h2 className="text-lg font-black text-gray-900">iFood Delivery</h2>
                            <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                                Canal de grande volume, mas exige repasse rigoroso de comissão para não tomar prejuízo na entrega parceira.
                            </p>
                            <div className="mt-3 p-3 bg-red-50/60 rounded-xl border border-red-100 text-xs">
                                <span className="text-gray-500 font-semibold">Marmitex 700ml sugerido:</span>{' '}
                                <strong className="text-red-700 font-black">R$ 50,90</strong>
                                <p className="text-[11px] text-gray-500 mt-0.5">Repasse total da taxa para blindar R$ 22,15</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-gray-100">
                        {getStatus('ifood') === 'connected' ? (
                            <button className="w-full bg-gray-900 text-white font-black py-3 rounded-xl text-xs transition hover:bg-black">
                                SINCRONIZAR PRODUTOS
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => handleConnect('ifood')}
                                className="w-full bg-red-600 text-white font-black py-3 rounded-xl transition hover:bg-red-700 text-xs shadow-sm"
                            >
                                <LinkIcon size={14} className="inline mr-1" /> CONECTAR IFOOD
                            </button>
                        )}
                    </div>
                </div>

                {/* 3. 99Food */}
                <div className="bg-white rounded-3xl p-6 shadow-xl border-4 border-gray-100 relative overflow-hidden flex flex-col justify-between">
                    <div>
                        <div className="flex items-start justify-between">
                            <div className="bg-yellow-50 px-3.5 py-2 rounded-2xl border border-yellow-200">
                                <span className="font-black text-yellow-800 tracking-tight text-lg">99FOOD</span>
                            </div>
                            <span className="bg-yellow-100 text-yellow-900 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                                Taxa Média (18%)
                            </span>
                        </div>

                        <div className="mt-5">
                            <h2 className="text-lg font-black text-gray-900">99Food</h2>
                            <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                                Canal secundário de delivery. Repasse de 18% para manter a mesma margem de contribuição.
                            </p>
                            <div className="mt-3 p-3 bg-yellow-50/60 rounded-xl border border-yellow-100 text-xs">
                                <span className="text-gray-500 font-semibold">Marmitex 700ml sugerido:</span>{' '}
                                <strong className="text-yellow-900 font-black">R$ 45,90</strong>
                                <p className="text-[11px] text-gray-500 mt-0.5">Mantém o lucro líquido protegido</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => alert('Mapeamento 99Food ativo!')}
                            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-black py-3 rounded-xl transition text-xs"
                        >
                            CONFIGURAR 99FOOD
                        </button>
                    </div>
                </div>
            </div>

            {/* 🎯 Panfleto Tático de Migração: Tirar clientes do iFood e Mandar pro App Próprio */}
            <div className="bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-950 text-white rounded-3xl p-8 shadow-2xl relative overflow-hidden border-4 border-purple-500/30">
                <div className="max-w-2xl relative z-10">
                    <div className="inline-flex items-center gap-2 bg-purple-400/20 px-3 py-1 rounded-full border border-purple-400/30 text-purple-200 text-xs font-black uppercase tracking-wider mb-4">
                        <Zap size={14} className="text-amber-400" /> Estratégia de Migração de Canal
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                        Panfleto Tático de Sacola: <br />
                        <span className="text-amber-300">Transforme clientes do iFood em clientes fiéis do seu App!</span>
                    </h2>
                    <p className="text-purple-200 text-sm mt-3 leading-relaxed">
                        Coloque este encarte dentro de toda embalagem enviada pelo iFood. Cada cliente que passa a pedir no seu app próprio economiza até R$ 8,24 por pedido em comissões que voltam direto para o seu caixa.
                    </p>

                    <div className="mt-6 flex flex-wrap gap-4">
                        <button
                            type="button"
                            onClick={handlePrintFlyers}
                            className="bg-amber-400 hover:bg-amber-300 text-purple-950 font-black px-6 py-3.5 rounded-2xl transition active:scale-95 shadow-lg flex items-center gap-2 text-sm"
                        >
                            <Printer size={18} /> IMPRIMIR PANFLETOS DE SACOLA (A4)
                        </button>
                    </div>
                </div>

                {/* Preview Visual do Encarte de Sacola */}
                <div className="mt-8 bg-white text-gray-900 p-6 rounded-2xl shadow-xl max-w-md border-2 border-dashed border-purple-300">
                    <div className="text-center pb-4 border-b border-gray-100">
                        <span className="text-2xl">🍇</span>
                        <h3 className="font-black text-base text-purple-950 mt-1 uppercase">X-Açaí Delivery Oficial</h3>
                        <p className="text-[11px] font-bold text-red-600 uppercase tracking-wider mt-0.5">
                            Você pagou mais caro neste pedido pelo iFood!
                        </p>
                    </div>

                    <div className="py-4 text-center space-y-2">
                        <p className="text-xs text-gray-700 font-medium">
                            No nosso aplicativo próprio você tem <strong className="text-purple-700">Preço Menor</strong>,{' '}
                            <strong className="text-emerald-700">Acompanhamentos em Dobro</strong> e entrega rápida!
                        </p>
                        <div className="bg-purple-50 p-3 rounded-xl border border-purple-200">
                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block">CUPOM DE BOAS-VINDAS:</span>
                            <span className="text-xl font-black text-purple-800 tracking-wider">XACAI10</span>
                            <p className="text-[10px] text-purple-600 font-bold mt-0.5">10% OFF na sua 1ª compra no app!</p>
                        </div>
                        <p className="text-xs font-black text-gray-900 pt-1">
                            Acesse direto: <span className="text-purple-600 underline">x-acai-delivery.vercel.app</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
