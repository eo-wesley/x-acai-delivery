'use client';

import React, { useState } from 'react';
import { Scale, AlertTriangle, CheckCircle, Printer, ArrowRight, DollarSign, ShieldAlert } from 'lucide-react';

interface PortionSpec {
    sku: string;
    name: string;
    acaiGrams: number;
    complementsGrams: number;
    complementChoices: number;
    totalTargetGrams: number;
    toleranceGrams: number;
}

const PORTION_SPECS: PortionSpec[] = [
    { sku: 'MARMITEX-700', name: 'Açaí Marmitex 700ml', acaiGrams: 550, complementsGrams: 160, complementChoices: 4, totalTargetGrams: 710, toleranceGrams: 20 },
    { sku: 'COPO-700', name: 'Açaí Copo 700ml', acaiGrams: 540, complementsGrams: 160, complementChoices: 4, totalTargetGrams: 700, toleranceGrams: 20 },
    { sku: 'COPO-500', name: 'Açaí Copo 500ml', acaiGrams: 380, complementsGrams: 105, complementChoices: 3, totalTargetGrams: 485, toleranceGrams: 15 },
    { sku: 'COPO-300', name: 'Açaí Copo 300ml', acaiGrams: 220, complementsGrams: 60, complementChoices: 2, totalTargetGrams: 280, toleranceGrams: 10 },
    { sku: 'BARCA-M', name: 'Barca M de Açaí', acaiGrams: 650, complementsGrams: 160, complementChoices: 4, totalTargetGrams: 810, toleranceGrams: 25 },
    { sku: 'ROLETA-1500', name: 'Roleta da Alegria 1,5kg', acaiGrams: 1000, complementsGrams: 480, complementChoices: 8, totalTargetGrams: 1480, toleranceGrams: 40 },
];

export default function KitchenPortionControl() {
    const [selectedSku, setSelectedSku] = useState<string>('MARMITEX-700');
    const [actualWeight, setActualWeight] = useState<number>(710);
    const [monthlyOrders, setMonthlyOrders] = useState<number>(500);

    const spec = PORTION_SPECS.find(p => p.sku === selectedSku) || PORTION_SPECS[0];
    const diffGrams = actualWeight - spec.totalTargetGrams;
    const isWithinTolerance = Math.abs(diffGrams) <= spec.toleranceGrams;
    const isOver = diffGrams > spec.toleranceGrams;
    const isUnder = diffGrams < -spec.toleranceGrams;

    // Custo médio por grama de açaí + complementos estimado em R$ 0,026/g (R$ 26/kg)
    const costPerGram = 0.026;
    const lossPerUnit = Math.max(0, diffGrams * costPerGram);
    const monthlyLoss = lossPerUnit * monthlyOrders;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                        <Scale className="text-purple-600" size={24} />
                        Controle de Pesagem e Sangria de Cozinha
                    </h2>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-0.5">
                        Padrão oficial de gramaturas para blindar o CMV da açaiteria na montagem
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-50 text-purple-700 font-black text-xs hover:bg-purple-100 transition border border-purple-200"
                >
                    <Printer size={15} /> IMPRIMIR GUIA DA BALANÇA
                </button>
            </div>

            {/* Simulador de Auditoria de Balança */}
            <div className="bg-white rounded-3xl p-6 border-2 border-purple-100 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-purple-100 text-purple-700">
                            Auditoria em Tempo Real
                        </span>
                        <h3 className="text-lg font-black text-gray-900 mt-2">
                            Teste de Balança do Turno
                        </h3>
                        <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                            Pese uma unidade montada pelo atendente na balança e insira o valor abaixo para verificar se o CMV está sendo respeitado ou se há vazamento de dinheiro na cozinha.
                        </p>

                        <div className="mt-4 space-y-3">
                            <div>
                                <label className="text-xs font-bold text-gray-700 block mb-1">
                                    Selecione o Produto Auditado:
                                </label>
                                <select
                                    value={selectedSku}
                                    onChange={e => {
                                        setSelectedSku(e.target.value);
                                        const newSpec = PORTION_SPECS.find(p => p.sku === e.target.value);
                                        if (newSpec) setActualWeight(newSpec.totalTargetGrams);
                                    }}
                                    className="w-full border border-gray-200 rounded-xl p-2.5 text-xs font-bold bg-gray-50 text-gray-800 outline-none focus:border-purple-500"
                                >
                                    {PORTION_SPECS.map(p => (
                                        <option key={p.sku} value={p.sku}>{p.name} (Alvo: {p.totalTargetGrams}g)</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <div className="flex justify-between text-xs font-bold text-gray-700 mb-1">
                                    <span>Peso Registrado na Balança:</span>
                                    <span className="text-purple-700 font-black text-sm">{actualWeight} g</span>
                                </div>
                                <input
                                    type="range"
                                    min={spec.totalTargetGrams - 100}
                                    max={spec.totalTargetGrams + 200}
                                    value={actualWeight}
                                    onChange={e => setActualWeight(Number(e.target.value))}
                                    className="w-full accent-purple-600"
                                />
                                <div className="flex justify-between text-[10px] text-gray-400 font-bold">
                                    <span>{spec.totalTargetGrams - 100}g</span>
                                    <span>Alvo: {spec.totalTargetGrams}g (±{spec.toleranceGrams}g)</span>
                                    <span>{spec.totalTargetGrams + 200}g</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Resultado do Teste de Sangria */}
                    <div className={`p-5 rounded-2xl border-2 transition ${
                        isWithinTolerance 
                            ? 'bg-emerald-50 border-emerald-300' 
                            : isOver 
                                ? 'bg-red-50 border-red-300' 
                                : 'bg-amber-50 border-amber-300'
                    }`}>
                        <div className="flex items-center gap-2">
                            {isWithinTolerance ? (
                                <CheckCircle className="text-emerald-600" size={20} />
                            ) : (
                                <AlertTriangle className={isOver ? 'text-red-600' : 'text-amber-600'} size={20} />
                            )}
                            <h4 className={`text-sm font-black uppercase ${
                                isWithinTolerance ? 'text-emerald-900' : isOver ? 'text-red-900' : 'text-amber-900'
                            }`}>
                                {isWithinTolerance 
                                    ? '✅ Pesagem Perfeita (Padrão Aprovado)' 
                                    : isOver 
                                        ? '⚠️ Sangria Detectada (Mão Pesada)' 
                                        : '⚠️ Porção Abaixo do Padrão (Risco de Reclamação)'}
                            </h4>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-white/80 p-2.5 rounded-xl border border-gray-100">
                                <span className="text-gray-500 block text-[10px] font-bold">Diferença de Peso</span>
                                <span className={`text-base font-black ${diffGrams > 0 ? 'text-red-600' : diffGrams < 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                    {diffGrams > 0 ? `+${diffGrams}g` : `${diffGrams}g`}
                                </span>
                            </div>
                            <div className="bg-white/80 p-2.5 rounded-xl border border-gray-100">
                                <span className="text-gray-500 block text-[10px] font-bold">Desvio Financeiro / Pedido</span>
                                <span className="text-base font-black text-gray-900">
                                    {isOver ? `+ R$ ${lossPerUnit.toFixed(2).replace('.', ',')}` : 'R$ 0,00'}
                                </span>
                            </div>
                        </div>

                        {isOver && (
                            <div className="mt-3 p-3 bg-red-100/70 rounded-xl border border-red-200">
                                <p className="text-[11px] font-bold text-red-900 leading-snug">
                                    🔴 Impacto no Mês ({monthlyOrders} pedidos): Se esse desvio persistir, a loja terá uma sangria de{' '}
                                    <strong className="text-red-950 font-black">R$ {monthlyLoss.toFixed(2).replace('.', ',')} jogados fora no lixo todo mês!</strong>
                                </p>
                            </div>
                        )}
                        {isWithinTolerance && (
                            <p className="mt-3 text-[11px] font-bold text-emerald-800">
                                O atendente está respeitando a ficha técnica. O CMV desta unidade fica garantido em ~31,5%!
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabela de Padrão de Gramaturas para a Cozinha */}
            <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm overflow-x-auto">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider mb-4">
                    📋 Tabela Canônica de Porcionamento (Colar na Parede da Cozinha)
                </h3>
                <table className="w-full text-xs text-left">
                    <thead>
                        <tr className="border-b border-gray-200 text-gray-400 font-black uppercase text-[10px]">
                            <th className="py-2.5 px-3">Produto</th>
                            <th className="py-2.5 px-3 text-center">Açaí Puro (Base)</th>
                            <th className="py-2.5 px-3 text-center">Complementos</th>
                            <th className="py-2.5 px-3 text-center">Porção p/ Item</th>
                            <th className="py-2.5 px-3 text-center font-black text-purple-700">Peso Total Alvo</th>
                            <th className="py-2.5 px-3 text-center">Tolerância</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                        {PORTION_SPECS.map(p => (
                            <tr key={p.sku} className="hover:bg-purple-50/40 transition">
                                <td className="py-3 px-3 font-black text-gray-800">{p.name}</td>
                                <td className="py-3 px-3 text-center text-purple-700 font-bold">{p.acaiGrams} g</td>
                                <td className="py-3 px-3 text-center">{p.complementChoices} itens ({p.complementsGrams}g)</td>
                                <td className="py-3 px-3 text-center text-gray-500 font-mono">
                                    {(p.complementsGrams / p.complementChoices).toFixed(0)}g / colher
                                </td>
                                <td className="py-3 px-3 text-center font-black text-sm text-gray-900 bg-purple-50/50 rounded-lg">
                                    {p.totalTargetGrams} g
                                </td>
                                <td className="py-3 px-3 text-center text-gray-400">± {p.toleranceGrams} g</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
