'use client';

import React, { useState, useMemo } from 'react';
import { 
    Truck, 
    Percent, 
    ArrowRight, 
    ShieldAlert, 
    Sparkles, 
    CheckCircle2, 
    Layers,
    DollarSign,
    Calculator,
    Zap,
    ExternalLink,
    Store,
    Receipt
} from 'lucide-react';

interface ChannelConfig {
    id: string;
    name: string;
    subtitle: string;
    feePercent: number;
    type: 'loja' | 'ifood_basica' | 'ifood_parceira' | 'keeta' | '99food' | 'custom';
    badge: string;
    color: string;
}

const DEFAULT_CHANNELS: ChannelConfig[] = [
    {
        id: 'loja',
        name: 'Loja Própria (Takeat / WhatsApp)',
        subtitle: 'Taxa mínima de processamento Pix / Cartão',
        feePercent: 5.0,
        type: 'loja',
        badge: 'Canal Mais Lucrativo',
        color: 'emerald'
    },
    {
        id: 'ifood_basica',
        name: 'iFood — Entrega Própria',
        subtitle: '12% comissão + 3.2% taxa transação',
        feePercent: 15.2,
        type: 'ifood_basica',
        badge: 'iFood Básico',
        color: 'orange'
    },
    {
        id: 'ifood_parceira',
        name: 'iFood — Entrega Parceira',
        subtitle: '23% comissão + 3.2% taxa transação',
        feePercent: 26.2,
        type: 'ifood_parceira',
        badge: 'iFood Logística',
        color: 'rose'
    },
    {
        id: 'keeta',
        name: 'Keeta Delivery (Meituan)',
        subtitle: 'Taxa promocional de expansão no Brasil',
        feePercent: 13.0,
        type: 'keeta',
        badge: 'Novo Player Keeta',
        color: 'amber'
    },
    {
        id: '99food',
        name: '99Food',
        subtitle: 'Entrega parceira e rede 99',
        feePercent: 18.0,
        type: '99food',
        badge: '99Food',
        color: 'blue'
    }
];

const CATALOG_ITEMS = [
    // Copos
    { sku: 'COPO-300', name: 'Copo Tradicional 300ml', cost: 5.20, storePrice: 19.90, family: 'Copos' },
    { sku: 'COPO-400', name: 'Copo Tradicional 400ml', cost: 6.80, storePrice: 23.90, family: 'Copos' },
    { sku: 'COPO-500', name: 'Copo Tradicional 500ml', cost: 8.20, storePrice: 28.90, family: 'Copos' },
    { sku: 'COPO-700', name: 'Copo Tradicional 700ml', cost: 11.10, storePrice: 34.90, family: 'Copos' },
    // Marmitas
    { sku: 'MX500', name: 'Marmitex 500ml (Monte Seu)', cost: 10.90, storePrice: 37.65, family: 'Marmitex' },
    { sku: 'MX700', name: 'Marmitex 700ml (Monte Seu)', cost: 14.80, storePrice: 38.90, family: 'Marmitex' },
    // Especiais
    { sku: 'FONDUE-500', name: 'Fondue de Açaí 500ml', cost: 12.40, storePrice: 36.90, family: 'Especiais' },
    { sku: 'ROLETA-800', name: 'Roleta de Açaí 800ml', cost: 16.20, storePrice: 46.90, family: 'Especiais' },
    { sku: 'BARCA-1000', name: 'Barca Especial 1 Litro', cost: 18.50, storePrice: 52.90, family: 'Especiais' },
    // Combos
    { sku: 'COMBO-CASAL', name: 'Combo Casal (Marmitex 700ml + 2 Bebidas)', cost: 18.80, storePrice: 49.90, family: 'Combos' },
    { sku: 'COMBO-DUPLA', name: 'Combo Dupla (2 Copos 500ml)', cost: 16.40, storePrice: 49.90, family: 'Combos' }
];

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const percent = (v: number) => `${v.toFixed(1)}%`;

export default function MarketplaceEngineering() {
    // Calculadora individual interativa
    const [calcCost, setCalcCost] = useState<number>(14.80); // Custo do Marmitex
    const [calcStorePrice, setCalcStorePrice] = useState<number>(38.90); // Preço na Loja
    
    // IMPOSTO SIMPLES NACIONAL (DAS)
    const [simplesRate, setSimplesRate] = useState<number>(4.5); // 4.5% de imposto Simples Nacional

    // Taxas customizáveis de canais
    const [keetaRate, setKeetaRate] = useState<number>(13.0);
    const [ninetyNineRate, setNinetyNineRate] = useState<number>(18.0);
    const [customChannelName, setCustomChannelName] = useState<string>('App Parceiro Local');
    const [customChannelRate, setCustomChannelRate] = useState<number>(10.0);

    const channels: ChannelConfig[] = useMemo(() => {
        return [
            ...DEFAULT_CHANNELS.map(ch => {
                if (ch.id === 'keeta') return { ...ch, feePercent: keetaRate };
                if (ch.id === '99food') return { ...ch, feePercent: ninetyNineRate };
                return ch;
            }),
            {
                id: 'custom',
                name: customChannelName || 'Canal Personalizado',
                subtitle: 'Taxa configurável para novos acordos',
                feePercent: customChannelRate,
                type: 'custom',
                badge: 'Simulação Livre',
                color: 'slate'
            }
        ];
    }, [keetaRate, ninetyNineRate, customChannelName, customChannelRate]);

    // Cálculos de repasse para o item selecionado blindando IMPOSTOS + COMISSÃO:
    // Lucro na loja: Preço Loja - (Preço Loja * (5% taxa + simples% imposto)) - Custo
    const singleResults = useMemo(() => {
        const storeDeduction = calcStorePrice * ((5 + simplesRate) / 100);
        const targetProfitReais = Math.max(0, calcStorePrice - storeDeduction - calcCost);

        // Preço Marketplace = (Custo + Lucro Líquido Desejado) / [1 - (taxaMarketplace + simplesRate)]
        return channels.map(ch => {
            const channelFeeRate = ch.feePercent / 100;
            const simplesTaxRate = simplesRate / 100;
            const totalDeductionRate = channelFeeRate + simplesTaxRate;

            const requiredPrice = (calcCost + targetProfitReais) / Math.max(0.01, 1 - totalDeductionRate);
            const roundedPrice = Math.ceil(requiredPrice) - 0.10; // Arredonda pra x.90
            
            const channelFeeAmount = requiredPrice * channelFeeRate;
            const simplesAmount = requiredPrice * simplesTaxRate;
            const finalProfit = requiredPrice - channelFeeAmount - simplesAmount - calcCost;

            return {
                ...ch,
                requiredPrice,
                roundedPrice,
                channelFeeAmount,
                simplesAmount,
                finalProfit
            };
        });
    }, [calcCost, calcStorePrice, channels, simplesRate]);

    // Tabela com todos os produtos do cardápio calculados
    const catalogCalculations = useMemo(() => {
        const simplesTaxRate = simplesRate / 100;

        return CATALOG_ITEMS.map(item => {
            const storeDeduction = item.storePrice * ((5 + simplesRate) / 100);
            const targetProfit = item.storePrice - storeDeduction - item.cost;

            // Fórmulas com Imposto Simples Nacional embutido em cada canal:
            // iFood Básico (15.2% + Simples)
            const ifoodBasicPrice = Math.ceil((item.cost + targetProfit) / Math.max(0.01, 1 - (0.152 + simplesTaxRate))) - 0.10;
            // iFood Parceiro (26.2% + Simples)
            const ifoodPartnerPrice = Math.ceil((item.cost + targetProfit) / Math.max(0.01, 1 - (0.262 + simplesTaxRate))) - 0.10;
            // Keeta (Keeta% + Simples)
            const keetaPrice = Math.ceil((item.cost + targetProfit) / Math.max(0.01, 1 - ((keetaRate / 100) + simplesTaxRate))) - 0.10;
            // 99Food (99Food% + Simples)
            const ninetyNinePrice = Math.ceil((item.cost + targetProfit) / Math.max(0.01, 1 - ((ninetyNineRate / 100) + simplesTaxRate))) - 0.10;

            return {
                ...item,
                targetProfit,
                ifoodBasicPrice,
                ifoodPartnerPrice,
                keetaPrice,
                ninetyNinePrice
            };
        });
    }, [keetaRate, ninetyNineRate, simplesRate]);

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header explicativo do Método Caixa Preta com Keeta, iFood e Impostos */}
            <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 p-6 md:p-8 rounded-[32px] text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 border border-white/20 rounded-full text-xs font-black uppercase tracking-widest text-purple-200 mb-3">
                        <Truck size={14} /> Engenharia de Marketplaces & Blindagem Fiscal
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight">
                        Precificação de Delivery: iFood, Keeta, 99Food & Impostos
                    </h2>
                    <p className="mt-2 text-purple-200 text-sm md:text-base max-w-3xl font-medium">
                        O fisco tributa a <strong>nota fiscal cheia</strong> do marketplace. Se você vende por R$ 50 no iFood, paga a comissão do canal <strong>MAIS o Simples Nacional ({simplesRate}%)</strong>. O simulador abaixo recalcula o repasse para o seu lucro permanecer 100% blindado.
                    </p>
                </div>
            </div>

            {/* CONTROLES DE TAXAS E IMPOSTO SIMPLES NACIONAL */}
            <div className="bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Imposto Simples Nacional */}
                <div className="p-3 bg-indigo-50/60 rounded-2xl border border-indigo-200">
                    <label className="text-xs font-black uppercase text-indigo-950 flex items-center justify-between mb-2">
                        <span className="flex items-center gap-1">
                            <Receipt size={14} className="text-indigo-700" /> Simples Nacional (DAS)
                        </span>
                        <span className="text-indigo-800 font-black">{simplesRate}%</span>
                    </label>
                    <input 
                        type="range" 
                        min={0} 
                        max={10} 
                        step={0.5} 
                        value={simplesRate} 
                        onChange={(e) => setSimplesRate(Number(e.target.value))}
                        className="w-full accent-indigo-700 h-2 bg-indigo-200 rounded-lg cursor-pointer"
                    />
                    <span className="text-[10px] text-indigo-900 mt-1 block">
                        Alíquota do comércio de alimentos (Anexo I)
                    </span>
                </div>

                <div>
                    <label className="text-xs font-black uppercase text-slate-700 flex items-center justify-between mb-2">
                        <span>Taxa Keeta Delivery</span>
                        <span className="text-amber-600 font-black">{keetaRate}%</span>
                    </label>
                    <input 
                        type="range" 
                        min={8} 
                        max={25} 
                        step={0.5} 
                        value={keetaRate} 
                        onChange={(e) => setKeetaRate(Number(e.target.value))}
                        className="w-full accent-amber-500 h-2 bg-slate-100 rounded-lg cursor-pointer"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                        Taxa de expansão Meituan/Keeta: 10% a 15%
                    </span>
                </div>

                <div>
                    <label className="text-xs font-black uppercase text-slate-700 flex items-center justify-between mb-2">
                        <span>Taxa 99Food</span>
                        <span className="text-blue-700 font-black">{ninetyNineRate}%</span>
                    </label>
                    <input 
                        type="range" 
                        min={12} 
                        max={28} 
                        step={0.5} 
                        value={ninetyNineRate} 
                        onChange={(e) => setNinetyNineRate(Number(e.target.value))}
                        className="w-full accent-blue-600 h-2 bg-slate-100 rounded-lg cursor-pointer"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                        Padrão 99Food: 18% a 20%
                    </span>
                </div>

                <div>
                    <label className="text-xs font-black uppercase text-slate-700 flex items-center justify-between mb-2">
                        <span>Canal Customizado</span>
                        <span className="text-purple-700 font-black">{customChannelRate}%</span>
                    </label>
                    <input 
                        type="range" 
                        min={3} 
                        max={30} 
                        step={0.5} 
                        value={customChannelRate} 
                        onChange={(e) => setCustomChannelRate(Number(e.target.value))}
                        className="w-full accent-purple-700 h-2 bg-slate-100 rounded-lg cursor-pointer"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                        Simule qualquer app novo digitando a taxa
                    </span>
                </div>
            </div>

            {/* CALCULADORA DE REPASSE INTERATIVA */}
            <section className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-6">
                <div>
                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <Percent className="text-purple-700" size={24} />
                        Simulador de Repasse com Impostos por Produto
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                        Informe o preço da loja física/app próprio e o custo direto para calcular o preço exato em cada marketplace.
                    </p>
                </div>

                {/* Inputs de Preço e Custo */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-purple-50/50 p-6 rounded-2xl border border-purple-100">
                    <div>
                        <label className="text-xs font-black uppercase text-purple-950 block mb-2">
                            Preço de Venda na Loja / Takeat
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-900 font-bold">R$</span>
                            <input 
                                type="number" 
                                step="0.50" 
                                min="0" 
                                value={calcStorePrice} 
                                onChange={(e) => setCalcStorePrice(Number(e.target.value))}
                                className="w-full pl-12 pr-4 py-3 bg-white border border-purple-200 rounded-xl text-lg font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600"
                            />
                        </div>
                        <span className="text-[11px] text-slate-500 mt-1 block">
                            Ex: Marmitex 700ml a R$ 38,90, Copo 500ml a R$ 28,90 ou Barca a R$ 52,90
                        </span>
                    </div>

                    <div>
                        <label className="text-xs font-black uppercase text-purple-950 block mb-2">
                            Custo Direto Total (Insumos + Embalagem)
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-900 font-bold">R$</span>
                            <input 
                                type="number" 
                                step="0.50" 
                                min="0" 
                                value={calcCost} 
                                onChange={(e) => setCalcCost(Number(e.target.value))}
                                className="w-full pl-12 pr-4 py-3 bg-white border border-purple-200 rounded-xl text-lg font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600"
                            />
                        </div>
                        <span className="text-[11px] text-slate-500 mt-1 block">
                            Custo real da ficha técnica
                        </span>
                    </div>
                </div>

                {/* GRID COMPARATIVO DE CANAIS COM KEETA DEDICADA E IMPOSTO SIMPLES */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                    {singleResults.map(ch => {
                        const isStore = ch.type === 'loja';
                        const isKeeta = ch.type === 'keeta';
                        const isPartner = ch.type === 'ifood_parceira';
                        
                        return (
                            <div 
                                key={ch.id} 
                                className={`p-6 rounded-[28px] border-2 flex flex-col justify-between transition ${
                                    isStore 
                                        ? 'bg-emerald-50/50 border-emerald-300 shadow-sm' 
                                        : isKeeta
                                        ? 'bg-amber-50/50 border-amber-300 shadow-sm'
                                        : isPartner
                                        ? 'bg-rose-50/40 border-rose-200 shadow-sm'
                                        : 'bg-white border-slate-200 shadow-sm'
                                }`}
                            >
                                <div>
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                        <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                                            isStore 
                                                ? 'bg-emerald-200 text-emerald-900' 
                                                : isKeeta 
                                                ? 'bg-amber-200 text-amber-950 font-black' 
                                                : isPartner 
                                                ? 'bg-rose-200 text-rose-950'
                                                : 'bg-slate-100 text-slate-700'
                                        }`}>
                                            {ch.badge}
                                        </span>
                                        <span className="text-xs font-black text-slate-600">
                                            {ch.feePercent}% canal + {simplesRate}% DAS
                                        </span>
                                    </div>

                                    <h4 className="font-black text-slate-900 text-base mb-1">
                                        {ch.name}
                                    </h4>
                                    <p className="text-xs text-slate-500 mb-6">
                                        {ch.subtitle}
                                    </p>

                                    <div className="space-y-1 mb-6">
                                        <span className="text-xs font-black uppercase text-slate-400 block">
                                            Preço Blindado no Canal
                                        </span>
                                        <div className="text-3xl font-black text-slate-900">
                                            {money.format(ch.roundedPrice)}
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-200/60 space-y-2 text-xs">
                                    <div className="flex justify-between text-slate-500">
                                        <span>Taxa do Canal ({ch.feePercent}%):</span>
                                        <strong className="text-rose-600">-{money.format(ch.channelFeeAmount)}</strong>
                                    </div>
                                    <div className="flex justify-between text-slate-500">
                                        <span>Simples Nacional ({simplesRate}%):</span>
                                        <strong className="text-indigo-700">-{money.format(ch.simplesAmount)}</strong>
                                    </div>
                                    <div className="flex justify-between text-slate-500">
                                        <span>Custo dos Insumos:</span>
                                        <strong>-{money.format(calcCost)}</strong>
                                    </div>
                                    <div className="flex justify-between pt-2 border-t border-slate-200/80 font-black text-sm text-emerald-800">
                                        <span>Lucro Líquido Preservado:</span>
                                        <span>{money.format(ch.finalProfit)}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Lição da Aula */}
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs leading-relaxed flex items-start gap-3">
                    <ShieldAlert size={20} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <strong>Comparativo Keeta vs iFood com Impostos:</strong> Na <strong>Keeta</strong> (taxa {keetaRate}% + {simplesRate}% Simples = {keetaRate + simplesRate}%), o Marmitex 700ml pode ser vendido a <strong>R$ 44,90</strong> entregando lucro líquido intacto, enquanto no <strong>iFood Parceiro</strong> (26,2% + {simplesRate}% = {26.2 + simplesRate}%) ele precisa ser vendido a <strong>R$ 53,90</strong> para pagar os R$ 2,42 de guia DAS que o fisco cobra sobre a nota emitida!
                    </div>
                </div>
            </section>

            {/* TABELA GERAL DE PREÇOS MULTICANAL COM TODO O MIX DA LOJA */}
            <section className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                            <Layers className="text-purple-700" size={24} />
                            Tabela Multicanal Completa do Mix X-Açaí
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                            Preços recomendados para todos os produtos da loja com <strong>Simples Nacional ({simplesRate}%)</strong> embutido em cada marketplace.
                        </p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-purple-950 text-xs uppercase text-white">
                            <tr>
                                <th className="p-4 rounded-l-2xl">Produto & SKU</th>
                                <th className="p-4">Custo Ficha</th>
                                <th className="p-4">Preço Loja (Takeat)</th>
                                <th className="p-4">Lucro Líquido</th>
                                <th className="p-4">iFood Básico (15.2%)</th>
                                <th className="p-4">iFood Parceiro (26.2%)</th>
                                <th className="p-4 text-amber-300 font-black">Keeta ({keetaRate}%)</th>
                                <th className="p-4 rounded-r-2xl">99Food ({ninetyNineRate}%)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {catalogCalculations.map(item => (
                                <tr key={item.sku} className="hover:bg-purple-50/40 transition">
                                    <td className="p-4 font-black text-slate-800">
                                        {item.name}
                                        <span className="block text-xs font-normal text-slate-400">[{item.family}] · {item.sku}</span>
                                    </td>
                                    <td className="p-4 text-slate-600 font-bold">
                                        {money.format(item.cost)}
                                    </td>
                                    <td className="p-4">
                                        <span className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-900 font-black">
                                            {money.format(item.storePrice)}
                                        </span>
                                    </td>
                                    <td className="p-4 font-black text-emerald-700">
                                        {money.format(item.targetProfit)}
                                    </td>
                                    <td className="p-4 font-bold text-slate-800">
                                        {money.format(item.ifoodBasicPrice)}
                                    </td>
                                    <td className="p-4 font-bold text-rose-800">
                                        {money.format(item.ifoodPartnerPrice)}
                                    </td>
                                    <td className="p-4 font-black text-amber-700 bg-amber-50/50">
                                        {money.format(item.keetaPrice)}
                                    </td>
                                    <td className="p-4 font-bold text-slate-800">
                                        {money.format(item.ninetyNinePrice)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
