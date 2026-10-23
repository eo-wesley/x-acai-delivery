'use client';

import React from 'react';
import { 
    Sparkles, 
    Star, 
    TrendingUp, 
    AlertTriangle, 
    HelpCircle, 
    Trash2, 
    Flame, 
    CheckCircle2,
    DollarSign
} from 'lucide-react';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

interface ProductQuadrant {
    sku: string;
    name: string;
    category: 'star' | 'workhorse' | 'puzzle' | 'dog';
    marginPercent: number;
    volumeTier: 'Alto' | 'Médio' | 'Baixo';
    price: number;
    cost: number;
    action: string;
}

const MATRIX_ITEMS: ProductQuadrant[] = [
    {
        sku: 'COPO-500',
        name: 'Copo Tradicional 500ml',
        category: 'star',
        marginPercent: 67.1,
        volumeTier: 'Alto',
        price: 24.90,
        cost: 8.20,
        action: 'Carro-chefe lucrativo! Mantenha destaque no topo do app e fotos atrativas.'
    },
    {
        sku: 'COPO-400',
        name: 'Copo Tradicional 400ml',
        category: 'star',
        marginPercent: 67.5,
        volumeTier: 'Alto',
        price: 20.90,
        cost: 6.80,
        action: 'Excelente margem e alto volume. Produto âncora de entrada.'
    },
    {
        sku: 'MX700',
        name: 'Marmitex 700ml (Monte Seu)',
        category: 'workhorse',
        marginPercent: 44.2, // Pior cenário
        volumeTier: 'Alto',
        price: 38.90,
        cost: 21.71,
        action: 'Campeão de vendas em volume. Aprovado a R$ 38,90 para blindar margem contra o pior mix de complementos.'
    },
    {
        sku: 'COPO-300',
        name: 'Copo Tradicional 300ml',
        category: 'workhorse',
        marginPercent: 69.2,
        volumeTier: 'Alto',
        price: 16.90,
        cost: 5.20,
        action: 'Porta de entrada do cliente. Estimular upsell para o copo de 400ml ou 500ml.'
    },
    {
        sku: 'ROLETA-800',
        name: 'Roleta de Açaí 800ml',
        category: 'puzzle',
        marginPercent: 63.9,
        volumeTier: 'Médio',
        price: 44.90,
        cost: 16.20,
        action: 'Alta lucratividade por pedido. Criar combos para grupos e vídeos de apresentação no Instagram.'
    },
    {
        sku: 'BARCA-1000',
        name: 'Barca Especial 1 Litro',
        category: 'puzzle',
        marginPercent: 62.2,
        volumeTier: 'Médio',
        price: 48.90,
        cost: 18.50,
        action: 'Ticket médio altíssimo. Ideal para finais de semana e pedidos em família.'
    },
    {
        sku: 'FONDUE-500',
        name: 'Fondue de Açaí 500ml',
        category: 'puzzle',
        marginPercent: 64.5,
        volumeTier: 'Baixo',
        price: 34.90,
        cost: 12.40,
        action: 'Produto sazonal gourmet. Focar em divulgação no inverno ou dias mais frios.'
    }
];

export default function MenuEngineering() {
    const stars = MATRIX_ITEMS.filter(i => i.category === 'star');
    const workhorses = MATRIX_ITEMS.filter(i => i.category === 'workhorse');
    const puzzles = MATRIX_ITEMS.filter(i => i.category === 'puzzle');
    const dogs = MATRIX_ITEMS.filter(i => i.category === 'dog');

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header explicativo */}
            <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-50 border border-purple-200 rounded-full text-xs font-black uppercase tracking-wider text-purple-700 mb-2">
                        <Sparkles size={14} /> Engenharia de Cardápio (Menu Engineering)
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black text-slate-800">
                        Matriz de Rentabilidade & Giro dos Produtos
                    </h2>
                    <p className="text-sm text-slate-500 mt-1 max-w-2xl font-medium">
                        Classifique os itens do X-Açaí pelo volume de saída e pela margem de lucro para tomar decisões estratégicas no cardápio.
                    </p>
                </div>
            </div>

            {/* OS 4 QUADRANTES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. ESTRELAS */}
                <div className="bg-emerald-50/50 border-2 border-emerald-300 rounded-[32px] p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="p-2.5 bg-emerald-100 text-emerald-800 rounded-2xl">
                                <Star size={22} className="fill-emerald-600 text-emerald-600" />
                            </span>
                            <div>
                                <h3 className="font-black text-emerald-950 text-lg">🌟 Estrelas</h3>
                                <p className="text-xs text-emerald-700">Alto Giro + Alta Margem de Lucro</p>
                            </div>
                        </div>
                        <span className="text-xs font-black px-3 py-1 bg-emerald-200 text-emerald-900 rounded-full">
                            {stars.length} produtos
                        </span>
                    </div>

                    <div className="space-y-3 pt-2">
                        {stars.map(item => (
                            <div key={item.sku} className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm">
                                <div className="flex justify-between items-start mb-1">
                                    <strong className="text-slate-800 font-black">{item.name}</strong>
                                    <span className="font-black text-emerald-700">{money.format(item.price)}</span>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-slate-500 mb-2">
                                    <span>Custo: {money.format(item.cost)}</span>
                                    <span>Margem: <strong className="text-emerald-700">{item.marginPercent}%</strong></span>
                                </div>
                                <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                    <strong>Estratégia:</strong> {item.action}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. BURROS DE CARGA */}
                <div className="bg-amber-50/50 border-2 border-amber-300 rounded-[32px] p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="p-2.5 bg-amber-100 text-amber-800 rounded-2xl">
                                <Flame size={22} className="text-amber-600" />
                            </span>
                            <div>
                                <h3 className="font-black text-amber-950 text-lg">🐴 Burros de Carga</h3>
                                <p className="text-xs text-amber-700">Alto Giro + Margem Média / Desafiadora</p>
                            </div>
                        </div>
                        <span className="text-xs font-black px-3 py-1 bg-amber-200 text-amber-900 rounded-full">
                            {workhorses.length} produtos
                        </span>
                    </div>

                    <div className="space-y-3 pt-2">
                        {workhorses.map(item => (
                            <div key={item.sku} className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm">
                                <div className="flex justify-between items-start mb-1">
                                    <strong className="text-slate-800 font-black">{item.name}</strong>
                                    <span className="font-black text-amber-800">{money.format(item.price)}</span>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-slate-500 mb-2">
                                    <span>Custo: {money.format(item.cost)}</span>
                                    <span>Margem: <strong className="text-amber-800">{item.marginPercent}%</strong></span>
                                </div>
                                <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                    <strong>Estratégia:</strong> {item.action}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. QUEBRA-CABEÇAS */}
                <div className="bg-purple-50/50 border-2 border-purple-200 rounded-[32px] p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="p-2.5 bg-purple-100 text-purple-800 rounded-2xl">
                                <HelpCircle size={22} className="text-purple-600" />
                            </span>
                            <div>
                                <h3 className="font-black text-purple-950 text-lg">🧩 Quebra-Cabeças</h3>
                                <p className="text-xs text-purple-700">Baixo Giro + Alta Margem de Lucro</p>
                            </div>
                        </div>
                        <span className="text-xs font-black px-3 py-1 bg-purple-200 text-purple-900 rounded-full">
                            {puzzles.length} produtos
                        </span>
                    </div>

                    <div className="space-y-3 pt-2">
                        {puzzles.map(item => (
                            <div key={item.sku} className="bg-white p-4 rounded-2xl border border-purple-200 shadow-sm">
                                <div className="flex justify-between items-start mb-1">
                                    <strong className="text-slate-800 font-black">{item.name}</strong>
                                    <span className="font-black text-purple-800">{money.format(item.price)}</span>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-slate-500 mb-2">
                                    <span>Custo: {money.format(item.cost)}</span>
                                    <span>Margem: <strong className="text-purple-800">{item.marginPercent}%</strong></span>
                                </div>
                                <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                    <strong>Estratégia:</strong> {item.action}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 4. CÃES / ABACAXIS */}
                <div className="bg-slate-50 border-2 border-slate-200 rounded-[32px] p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="p-2.5 bg-slate-200 text-slate-700 rounded-2xl">
                                <Trash2 size={22} className="text-slate-600" />
                            </span>
                            <div>
                                <h3 className="font-black text-slate-800 text-lg">🐕 Abacaxis / Cães</h3>
                                <p className="text-xs text-slate-500">Baixo Giro + Baixa Margem</p>
                            </div>
                        </div>
                        <span className="text-xs font-black px-3 py-1 bg-slate-200 text-slate-700 rounded-full">
                            0 produtos
                        </span>
                    </div>

                    <div className="p-8 text-center text-slate-400 text-xs">
                        Nenhum produto crítico cadastrado nessa zona. Todo o catálogo atual do X-Açaí possui margem saudável ou é carro-chefe de faturamento.
                    </div>
                </div>
            </div>
        </div>
    );
}
