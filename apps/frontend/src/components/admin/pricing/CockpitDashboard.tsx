'use client';

import React, { useState, useMemo } from 'react';
import { 
    TrendingUp, 
    DollarSign, 
    AlertTriangle, 
    CheckCircle2, 
    Scale, 
    Target, 
    ShoppingBag, 
    Layers, 
    Sliders,
    Sparkles,
    Receipt,
    Percent
} from 'lucide-react';
import snapshotJson from '@/data/xacai-pricing-snapshot.json';

interface CockpitDashboardProps {
    monthlyFixedCost?: number;
    estimatedMonthlyOrders?: number;
    averageTicket?: number;
    onNavigateTab?: (tab: string) => void;
}

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const percent = (v: number) => `${v.toFixed(1)}%`;

export default function CockpitDashboard({
    monthlyFixedCost = 10529,
    estimatedMonthlyOrders = 1500,
    averageTicket = 34.50,
    onNavigateTab
}: CockpitDashboardProps) {
    // Faturamento projetado inicial baseado no ticket médio e pedidos
    const defaultRevenue = estimatedMonthlyOrders * averageTicket;
    const [projectedRevenue, setProjectedRevenue] = useState<number>(defaultRevenue);
    const [projectedOrders, setProjectedOrders] = useState<number>(estimatedMonthlyOrders);

    // IMPOSTO SIMPLES NACIONAL (DAS) & TAXAS DO DELIVERY
    const [simplesTaxRate, setSimplesTaxRate] = useState<number>(0.045); // 4.5% Simples Nacional
    const paymentFeeRate = 0.05; // 5% taxas de gateway / Takeat / cartão
    const averageCmvRate = 0.315; // 31.5% média ponderada do CMV no mix da açaiteria

    // Cálculos da DRE com dedução de impostos (Simples Nacional)
    const dre = useMemo(() => {
        const grossRevenue = projectedRevenue;
        
        // Deduções diretas sobre o faturamento bruto
        const simplesTaxAmount = grossRevenue * simplesTaxRate;
        const paymentFees = grossRevenue * paymentFeeRate;
        const totalDeductions = simplesTaxAmount + paymentFees;
        const netRevenue = grossRevenue - totalDeductions;

        // Custo das Mercadorias Vendidas (CMV)
        const totalCmv = grossRevenue * averageCmvRate;

        // Margem de Contribuição Operacional
        const contributionMargin = netRevenue - totalCmv;
        const contributionMarginPercent = grossRevenue > 0 ? (contributionMargin / grossRevenue) * 100 : 0;

        // Lucro Líquido Real após Custos Fixos
        const netProfit = contributionMargin - monthlyFixedCost;
        const netMarginPercent = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

        // Ponto de Equilíbrio (Break-Even) considerando Impostos + Taxas + CMV
        const unitTicket = projectedOrders > 0 ? grossRevenue / projectedOrders : averageTicket;
        const unitContribution = unitTicket * (1 - simplesTaxRate - paymentFeeRate - averageCmvRate);
        const breakEvenOrders = unitContribution > 0 ? Math.ceil(monthlyFixedCost / unitContribution) : 0;
        const breakEvenRevenue = breakEvenOrders * unitTicket;
        const fixedCostPerOrder = projectedOrders > 0 ? monthlyFixedCost / projectedOrders : 0;

        return {
            grossRevenue,
            simplesTaxAmount,
            paymentFees,
            netRevenue,
            totalCmv,
            contributionMargin,
            contributionMarginPercent,
            netProfit,
            netMarginPercent,
            unitTicket,
            unitContribution,
            breakEvenOrders,
            breakEvenRevenue,
            fixedCostPerOrder
        };
    }, [projectedRevenue, projectedOrders, monthlyFixedCost, averageTicket, simplesTaxRate]);

    // Status do CMV Geral
    const cmvPercent = averageCmvRate * 100;
    const isCmvHealthy = cmvPercent >= 25 && cmvPercent <= 35;
    const isCmvWarning = cmvPercent > 35 && cmvPercent <= 42;

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header com resumo da metodologia do Já Precifiquei */}
            <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 p-6 md:p-8 rounded-[32px] text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/20 border border-purple-400/30 rounded-full text-xs font-black uppercase tracking-widest text-purple-200 mb-3">
                            <Sparkles size={14} className="text-amber-400" /> Cockpit Executivo · Método Caixa Preta
                        </div>
                        <h2 className="text-2xl md:text-4xl font-black tracking-tight">
                            Saúde Financeira, Impostos & Lucro Operacional
                        </h2>
                        <p className="mt-2 text-purple-200 text-sm md:text-base max-w-2xl font-medium">
                            DRE gerencial completa da Dark Kitchen: dedução do <strong>Simples Nacional ({percent(simplesTaxRate * 100)})</strong>, CMV médio ponderado de <strong>{percent(cmvPercent)}</strong> e ponto de equilíbrio com todas as despesas cobertas.
                        </p>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/10 flex flex-col gap-2 min-w-[240px]">
                        <span className="text-xs uppercase font-bold text-purple-300">Ponto de Equilíbrio Real</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-amber-300">{dre.breakEvenOrders}</span>
                            <span className="text-sm font-bold text-purple-200">pedidos/mês</span>
                        </div>
                        <span className="text-xs text-purple-200">
                            Faturamento mínimo: <strong>{money.format(dre.breakEvenRevenue)}</strong>
                        </span>
                        <span className="text-[10px] text-amber-200/80">
                            (~{Math.ceil(dre.breakEvenOrders / 30)} pedidos/dia cobrindo impostos e custos)
                        </span>
                    </div>
                </div>
            </div>

            {/* TERMÔMETRO DE CMV GERAL (MÉTODO CAIXA PRETA / JÁ PRECIFIQUEI) */}
            <section className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-200 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                            <Scale className="text-purple-700" size={24} />
                            Termômetro de CMV Médio Ponderado da Loja
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                            Custo de Mercadoria Vendida (Insumos + Embalagens) em relação ao faturamento bruto de todo o cardápio.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className={`px-4 py-2 rounded-xl text-sm font-black flex items-center gap-2 ${
                            isCmvHealthy 
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                                : isCmvWarning 
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}>
                            {isCmvHealthy ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                            CMV da Açaiteria: {percent(cmvPercent)} ({isCmvHealthy ? 'Ideal 25%-35%' : isCmvWarning ? 'Atenção' : 'Crítico'})
                        </div>
                    </div>
                </div>

                {/* Régua visual do CMV */}
                <div className="space-y-3">
                    <div className="relative h-8 bg-slate-100 rounded-2xl overflow-hidden flex border border-slate-200 p-1">
                        <div className="h-full bg-emerald-300/80 rounded-l-xl flex items-center justify-center text-[10px] font-black text-emerald-950 uppercase" style={{ width: '25%' }}>
                            &lt; 25% Excelente
                        </div>
                        <div className="h-full bg-emerald-500 flex items-center justify-center text-xs font-black text-white uppercase shadow-sm" style={{ width: '10%' }}>
                            25% - 35% Alvo
                        </div>
                        <div className="h-full bg-amber-400 flex items-center justify-center text-[11px] font-black text-amber-950 uppercase" style={{ width: '10%' }}>
                            35% - 45% Alerta
                        </div>
                        <div className="h-full bg-rose-500 rounded-r-xl flex items-center justify-center text-[11px] font-black text-white uppercase" style={{ width: '55%' }}>
                            &gt; 45% Prejuízo
                        </div>

                        <div 
                            className="absolute top-0 bottom-0 w-2.5 bg-slate-900 shadow-2xl rounded-full transform -translate-x-1/2 transition-all duration-500"
                            style={{ left: `${Math.min(100, Math.max(0, cmvPercent))}%` }}
                            title={`CMV Atual: ${percent(cmvPercent)}`}
                        />
                    </div>

                    <div className="flex justify-between text-xs font-bold text-slate-500 px-1">
                        <span>0%</span>
                        <span>25% (Piso Ideal)</span>
                        <span>35% (Teto Recomendado)</span>
                        <span>45% (Limite de Segurança)</span>
                        <span>100%</span>
                    </div>
                </div>

                {/* Dica da Metodologia */}
                <div className="mt-6 p-4 rounded-2xl bg-purple-50 border border-purple-200 text-purple-950 text-sm flex items-start gap-3">
                    <Sparkles className="text-purple-600 shrink-0 mt-0.5" size={18} />
                    <div>
                        <strong>Visão Geral da Dark Kitchen:</strong> No mix do X-Açaí, os copos tradicionais (300ml a 700ml) têm CMV de <strong>27% a 31%</strong> e alto volume. O Marmitex 700ml tem maior quantidade de complementos livres (podendo chegar a 48% de CMV no pior cenário), mas atrai um ticket médio elevado de <strong>R$ 38,90 a R$ 49,90</strong>. A média ponderada combinada fica perfeitamente estabilizada em <strong>31,5%</strong>, gerando lucro limpo mesmo com o Simples Nacional de 4,5% debitado.
                    </div>
                </div>
            </section>

            {/* 4 CARDS DE PILARES FINANCEIROS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* 1. Custos Fixos Totais */}
                <div className="bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm hover:shadow-md transition">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-400">Custos Fixos Mensais</span>
                        <div className="p-2.5 bg-purple-50 text-purple-700 rounded-xl">
                            <DollarSign size={20} />
                        </div>
                    </div>
                    <div className="text-3xl font-black text-slate-900">
                        {money.format(monthlyFixedCost)}
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                        Aluguel, energia, funcionários, pró-labore e sistemas.
                    </p>
                    {onNavigateTab && (
                        <button 
                            onClick={() => onNavigateTab('fixed_costs')} 
                            className="mt-3 text-xs font-black text-purple-700 hover:text-purple-900 inline-flex items-center gap-1"
                        >
                            Gerenciar Custos Fixos &rarr;
                        </button>
                    )}
                </div>

                {/* 2. Imposto Simples Nacional Estimado */}
                <div className="bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm hover:shadow-md transition">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-400">Imposto Simples ({percent(simplesTaxRate * 100)})</span>
                        <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl">
                            <Receipt size={20} />
                        </div>
                    </div>
                    <div className="text-3xl font-black text-indigo-900">
                        {money.format(dre.simplesTaxAmount)}
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                        DAS faturado sobre a receita bruta total de {money.format(dre.grossRevenue)}.
                    </p>
                </div>

                {/* 3. Margem de Contribuição Média */}
                <div className="bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm hover:shadow-md transition">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-400">Margem Contribuição</span>
                        <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
                            <TrendingUp size={20} />
                        </div>
                    </div>
                    <div className="text-3xl font-black text-emerald-700">
                        {percent(dre.contributionMarginPercent)}
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                        Sobra líquida após deduzir impostos (4.5%), taxas (5%) e CMV ({percent(cmvPercent)}).
                    </p>
                </div>

                {/* 4. Ponto de Equilíbrio */}
                <div className="bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm hover:shadow-md transition">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-400">Meta Ponto Equilíbrio</span>
                        <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl">
                            <ShoppingBag size={20} />
                        </div>
                    </div>
                    <div className="text-3xl font-black text-amber-700">
                        {dre.breakEvenOrders} <span className="text-base font-bold text-slate-500">pedidos</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                        Média de <strong>{Math.ceil(dre.breakEvenOrders / 30)} pedidos/dia</strong> para cobrir todas as despesas e impostos.
                    </p>
                </div>
            </div>

            {/* SIMULADOR INTERATIVO DE META DE FATURAMENTO E DRE PROJETADA */}
            <section className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-200 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                            <Sliders className="text-purple-700" size={24} />
                            Simulador de Faturamento & DRE Operacional com Impostos
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                            Ajuste o faturamento e a alíquota tributária para ver exatamente quanto dinheiro limpo sobra no caixa.
                        </p>
                    </div>

                    {/* Seletor rápido de alíquota Simples Nacional */}
                    <div className="flex items-center gap-2 bg-indigo-50 p-2 rounded-2xl border border-indigo-200">
                        <span className="text-xs font-black text-indigo-950 uppercase px-2">Simples Nacional:</span>
                        {[
                            { label: '4.0%', val: 0.040 },
                            { label: '4.5%', val: 0.045 },
                            { label: '5.5%', val: 0.055 },
                            { label: '6.5%', val: 0.065 }
                        ].map(s => (
                            <button
                                key={s.label}
                                onClick={() => setSimplesTaxRate(s.val)}
                                className={`px-2.5 py-1 rounded-xl text-xs font-black transition ${
                                    simplesTaxRate === s.val 
                                        ? 'bg-indigo-700 text-white shadow-sm' 
                                        : 'text-indigo-800 hover:bg-white'
                                }`}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Controles do Simulador */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-purple-50/50 p-6 rounded-2xl border border-purple-100 mb-8">
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-xs font-black uppercase text-purple-950">Faturamento Mensal Estimado</label>
                            <span className="text-lg font-black text-purple-800">{money.format(projectedRevenue)}</span>
                        </div>
                        <input 
                            type="range" 
                            min={15000} 
                            max={120000} 
                            step={1000} 
                            value={projectedRevenue}
                            onChange={(e) => {
                                const val = Number(e.target.value);
                                setProjectedRevenue(val);
                                setProjectedOrders(Math.round(val / averageTicket));
                            }}
                            className="w-full accent-purple-700 h-2 bg-purple-200 rounded-lg cursor-pointer"
                        />
                        <div className="flex justify-between text-[11px] text-purple-400 font-bold mt-1">
                            <span>R$ 15.000</span>
                            <span>R$ 60.000</span>
                            <span>R$ 120.000</span>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-xs font-black uppercase text-purple-950">Volume Estimado de Pedidos</label>
                            <span className="text-lg font-black text-purple-800">{projectedOrders} pedidos/mês</span>
                        </div>
                        <input 
                            type="range" 
                            min={400} 
                            max={3500} 
                            step={50} 
                            value={projectedOrders}
                            onChange={(e) => {
                                const val = Number(e.target.value);
                                setProjectedOrders(val);
                                setProjectedRevenue(val * averageTicket);
                            }}
                            className="w-full accent-purple-700 h-2 bg-purple-200 rounded-lg cursor-pointer"
                        />
                        <div className="flex justify-between text-[11px] text-purple-400 font-bold mt-1">
                            <span>400 pedidos</span>
                            <span>1.800 pedidos</span>
                            <span>3.500 pedidos</span>
                        </div>
                    </div>
                </div>

                {/* Estrutura da DRE em Cascata com Impostos */}
                <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                        Demonstrativo do Resultado do Exercício (DRE) Projetado
                    </h4>

                    {/* Faturamento Bruto */}
                    <div className="flex justify-between items-center p-4 rounded-xl bg-slate-50 border border-slate-100">
                        <div>
                            <span className="font-black text-slate-800">(+) Faturamento Bruto de Vendas (Receita Bruta)</span>
                            <span className="block text-xs text-slate-500">{projectedOrders} pedidos a {money.format(dre.unitTicket)} de ticket médio</span>
                        </div>
                        <span className="text-lg font-black text-slate-900">{money.format(dre.grossRevenue)}</span>
                    </div>

                    {/* LINHA NOVA: IMPOSTO SIMPLES NACIONAL (DAS) */}
                    <div className="flex justify-between items-center p-4 rounded-xl bg-indigo-50/70 border border-indigo-100">
                        <div>
                            <span className="font-bold text-indigo-950">(-) Impostos Faturados (Simples Nacional / DAS {percent(simplesTaxRate * 100)})</span>
                            <span className="block text-xs text-indigo-800">Guia DAS unificada sobre faturamento do comércio (Anexo I)</span>
                        </div>
                        <span className="text-base font-bold text-indigo-700">-{money.format(dre.simplesTaxAmount)}</span>
                    </div>

                    {/* Taxas de Gateway e Cartão */}
                    <div className="flex justify-between items-center p-4 rounded-xl bg-slate-50 border border-slate-100">
                        <div>
                            <span className="font-bold text-slate-700">(-) Taxas de Pagamento & Gateway (5%)</span>
                            <span className="block text-xs text-slate-500">Reserva de taxas financeiras Pix / Cartão / Takeat</span>
                        </div>
                        <span className="text-base font-bold text-rose-600">-{money.format(dre.paymentFees)}</span>
                    </div>

                    {/* Receita Líquida */}
                    <div className="flex justify-between items-center p-3.5 rounded-xl bg-slate-100/70 border border-slate-200">
                        <div>
                            <span className="font-bold text-slate-800">(=) Receita Operacional Líquida</span>
                            <span className="block text-[11px] text-slate-500">Faturamento disponível após tributos e intermediação</span>
                        </div>
                        <span className="text-base font-black text-slate-800">{money.format(dre.netRevenue)}</span>
                    </div>

                    {/* CMV */}
                    <div className="flex justify-between items-center p-4 rounded-xl bg-slate-50 border border-slate-100">
                        <div>
                            <span className="font-bold text-slate-700">(-) Custo de Insumos & Embalagens (CMV ~{percent(cmvPercent)})</span>
                            <span className="block text-xs text-slate-500">Açaí, frutas, cremes, recheios, copos, potes e sacolas</span>
                        </div>
                        <span className="text-base font-bold text-rose-600">-{money.format(dre.totalCmv)}</span>
                    </div>

                    {/* Margem de Contribuição */}
                    <div className="flex justify-between items-center p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                        <div>
                            <span className="font-black text-emerald-950">(=) Margem de Contribuição Operacional</span>
                            <span className="block text-xs text-emerald-700">{percent(dre.contributionMarginPercent)} da receita disponível para cobrir os custos fixos</span>
                        </div>
                        <span className="text-xl font-black text-emerald-700">{money.format(dre.contributionMargin)}</span>
                    </div>

                    {/* Custos Fixos */}
                    <div className="flex justify-between items-center p-4 rounded-xl bg-slate-50 border border-slate-100">
                        <div>
                            <span className="font-bold text-slate-700">(-) Despesas & Custos Fixos da Dark Kitchen</span>
                            <span className="block text-xs text-slate-500">Aluguel, energia elétrica comercial, funcionários e pró-labore</span>
                        </div>
                        <span className="text-base font-bold text-rose-600">-{money.format(monthlyFixedCost)}</span>
                    </div>

                    {/* LUCRO LÍQUIDO FINAL */}
                    <div className={`flex justify-between items-center p-6 rounded-2xl border-2 ${
                        dre.netProfit >= 0 
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-emerald-400' 
                            : 'bg-gradient-to-r from-rose-500 to-red-600 text-white border-rose-400'
                    } shadow-lg`}>
                        <div>
                            <span className="text-xs font-black uppercase tracking-widest opacity-80">Resultado Líquido Final</span>
                            <h5 className="text-2xl font-black">
                                (=) Lucro Líquido Real Projetado
                            </h5>
                            <span className="block text-xs mt-1 opacity-90">
                                Margem Líquida Limpa no Bolso: <strong>{percent(dre.netMarginPercent)}</strong> sobre o faturamento
                            </span>
                        </div>
                        <div className="text-right">
                            <span className="text-3xl md:text-4xl font-black">
                                {money.format(dre.netProfit)}
                            </span>
                            <span className="block text-xs mt-1 font-bold">
                                {dre.netProfit >= 0 ? 'Lucro Limpo no Bolso' : 'Déficit Operacional'}
                            </span>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
