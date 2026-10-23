'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, RotateCcw, DollarSign, Building2, Zap, Wifi, Users, FileSpreadsheet, ShieldAlert } from 'lucide-react';

export interface FixedCostItem {
    id: string;
    category: 'imovel' | 'utilidades' | 'pessoal' | 'admin' | 'outros';
    name: string;
    value: number; // em Reais (R$)
}

const DEFAULT_FIXED_COSTS: FixedCostItem[] = [
    { id: '1', category: 'imovel', name: 'Aluguel do Ponto Comercial', value: 2500 },
    { id: '2', category: 'imovel', name: 'IPTU e Condomínio', value: 350 },
    { id: '3', category: 'utilidades', name: 'Energia Elétrica (Freezers e Loja)', value: 1200 },
    { id: '4', category: 'utilidades', name: 'Água e Esgoto', value: 180 },
    { id: '5', category: 'utilidades', name: 'Internet Fibra e Telefonia', value: 150 },
    { id: '6', category: 'pessoal', name: 'Pró-labore / Retirada do Proprietário', value: 3000 },
    { id: '7', category: 'pessoal', name: 'Auxiliar / Atendente de Loja', value: 1800 },
    { id: '8', category: 'admin', name: 'Honorários Contábeis', value: 450 },
    { id: '9', category: 'admin', name: 'Sistemas e Softwares (PDV/Cardápio)', value: 199 },
    { id: '10', category: 'outros', name: 'Manutenção Preventiva de Freezers', value: 200 },
];

const STORAGE_KEY = 'xacai_fixed_costs_v1';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export default function FixedCostsManager({ onTotalChange }: { onTotalChange?: (total: number) => void }) {
    const [items, setItems] = useState<FixedCostItem[]>(DEFAULT_FIXED_COSTS);
    const [newItemName, setNewItemName] = useState('');
    const [newItemValue, setNewItemValue] = useState('');
    const [newItemCategory, setNewItemCategory] = useState<FixedCostItem['category']>('outros');
    const [savedMessage, setSavedMessage] = useState(false);

    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setItems(parsed);
                }
            }
        } catch (e) {
            console.error('Falha ao carregar custos fixos locais:', e);
        }
    }, []);

    const totalMonthly = items.reduce((sum, item) => sum + (Number(item.value) || 0), 0);

    useEffect(() => {
        if (onTotalChange) onTotalChange(totalMonthly);
    }, [totalMonthly, onTotalChange]);

    const handleSave = () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        setSavedMessage(true);
        setTimeout(() => setSavedMessage(false), 3000);
    };

    const handleReset = () => {
        if (confirm('Deseja restaurar a estrutura padrão de custos fixos do X-Açaí?')) {
            setItems(DEFAULT_FIXED_COSTS);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_FIXED_COSTS));
        }
    };

    const handleAddItem = (e: React.FormEvent) => {
        e.preventDefault();
        const val = parseFloat(newItemValue.replace(',', '.'));
        if (!newItemName.trim() || isNaN(val) || val <= 0) return;

        const updated: FixedCostItem[] = [
            ...items,
            {
                id: Date.now().toString(),
                category: newItemCategory,
                name: newItemName.trim(),
                value: val,
            }
        ];
        setItems(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        setNewItemName('');
        setNewItemValue('');
    };

    const handleRemoveItem = (id: string) => {
        const updated = items.filter(item => item.id !== id);
        setItems(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    };

    const handleUpdateValue = (id: string, newValueStr: string) => {
        const val = parseFloat(newValueStr.replace(',', '.')) || 0;
        const updated = items.map(item => item.id === id ? { ...item, value: val } : item);
        setItems(updated);
    };

    const categoryIcons = {
        imovel: <Building2 className="w-4 h-4 text-purple-600" />,
        utilidades: <Zap className="w-4 h-4 text-amber-600" />,
        pessoal: <Users className="w-4 h-4 text-blue-600" />,
        admin: <FileSpreadsheet className="w-4 h-4 text-emerald-600" />,
        outros: <DollarSign className="w-4 h-4 text-slate-600" />,
    };

    const categoryLabels = {
        imovel: 'Imóvel & Estrutura',
        utilidades: 'Contas & Energia',
        pessoal: 'Equipe & Pró-labore',
        admin: 'Contabilidade & Sistemas',
        outros: 'Outros & Manutenção',
    };

    return (
        <div className="space-y-6">
            {/* Header com resumo */}
            <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-900 to-purple-800 p-6 text-white shadow-md">
                    <p className="text-xs font-black uppercase tracking-wider text-purple-200">Total de Custos Fixos Mensais</p>
                    <p className="mt-2 text-3xl font-black">{money.format(totalMonthly)}</p>
                    <p className="mt-1 text-xs text-purple-200">Custo operacional base para a loja abrir as portas todo mês.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-500">Custo Fixo por Dia (30 dias)</p>
                    <p className="mt-2 text-3xl font-black text-slate-800">{money.format(totalMonthly / 30)}</p>
                    <p className="mt-1 text-xs text-slate-500">Meta diária de custo fixo a ser coberta pelas vendas.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-500">Custo Fixo por Pedido (Estimativa 600 ped/mês)</p>
                    <p className="mt-2 text-3xl font-black text-emerald-700">{money.format(totalMonthly / 600)}</p>
                    <p className="mt-1 text-xs text-slate-500">Parcela de custo fixo a ratear em cada açaí montado.</p>
                </div>
            </div>

            {/* Ações e Controles */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-black text-slate-800">Estrutura de Custos Fixos</h2>
                    <p className="text-sm text-slate-500">Edite os valores conforme os gastos reais da sua açaiteria.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleSave}
                        className="inline-flex items-center gap-2 rounded-xl bg-purple-700 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-purple-800 transition"
                    >
                        <Save className="w-4 h-4" />
                        Salvar Alterações
                    </button>
                    <button
                        onClick={handleReset}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Restaurar Padrão
                    </button>
                </div>
            </div>

            {savedMessage && (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900">
                    ✓ Custos fixos salvos no navegador com sucesso! Os cálculos do ponto de equilíbrio foram recalculados.
                </div>
            )}

            {/* Tabela de Custos Fixos */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="bg-purple-950 text-xs uppercase text-white">
                        <tr>
                            <th className="p-3.5">Categoria</th>
                            <th className="p-3.5">Descrição do Gasto Fixo</th>
                            <th className="p-3.5 text-right">Valor Mensal (R$)</th>
                            <th className="p-3.5 text-right">% do Total</th>
                            <th className="p-3.5 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {items.map(item => {
                            const percent = totalMonthly > 0 ? ((item.value / totalMonthly) * 100).toFixed(1) : '0';
                            return (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-3.5">
                                        <div className="flex items-center gap-2 font-bold text-slate-700 text-xs">
                                            {categoryIcons[item.category]}
                                            {categoryLabels[item.category]}
                                        </div>
                                    </td>
                                    <td className="p-3.5 font-bold text-slate-800">
                                        {item.name}
                                    </td>
                                    <td className="p-3.5 text-right">
                                        <div className="inline-flex items-center gap-1">
                                            <span className="text-slate-400 font-medium">R$</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={item.value}
                                                onChange={(e) => handleUpdateValue(item.id, e.target.value)}
                                                className="w-28 rounded-lg border border-slate-200 px-2.5 py-1.5 text-right font-black text-slate-900 focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600"
                                            />
                                        </div>
                                    </td>
                                    <td className="p-3.5 text-right text-xs font-bold text-slate-500">
                                        {percent}%
                                    </td>
                                    <td className="p-3.5 text-center">
                                        <button
                                            onClick={() => handleRemoveItem(item.id)}
                                            title="Excluir item"
                                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot className="bg-slate-50 font-black text-slate-800 border-t-2 border-slate-200">
                        <tr>
                            <td colSpan={2} className="p-4 text-right uppercase text-xs tracking-wider">Total de Custos Fixos Mensais:</td>
                            <td className="p-4 text-right text-base text-purple-900">{money.format(totalMonthly)}</td>
                            <td className="p-4 text-right text-xs">100.0%</td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Formulário para Adicionar Novo Custo Fixo */}
            <form onSubmit={handleAddItem} className="rounded-2xl border border-dashed border-purple-200 bg-purple-50/50 p-5">
                <h3 className="text-sm font-black text-purple-950 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-purple-700" />
                    Adicionar Novo Custo Fixo Mensal
                </h3>
                <div className="grid gap-3 sm:grid-cols-4">
                    <input
                        type="text"
                        placeholder="Nome do gasto (ex: Seguro da Loja)"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        className="sm:col-span-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-100"
                    />
                    <select
                        value={newItemCategory}
                        onChange={(e) => setNewItemCategory(e.target.value as FixedCostItem['category'])}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 focus:border-purple-600 focus:outline-none"
                    >
                        <option value="imovel">Imóvel & Estrutura</option>
                        <option value="utilidades">Contas & Energia</option>
                        <option value="pessoal">Equipe & Pró-labore</option>
                        <option value="admin">Contabilidade & Sistemas</option>
                        <option value="outros">Outros & Manutenção</option>
                    </select>
                    <div className="flex gap-2">
                        <input
                            type="number"
                            step="0.01"
                            placeholder="Valor R$"
                            value={newItemValue}
                            onChange={(e) => setNewItemValue(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-800 focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-100"
                        />
                        <button
                            type="submit"
                            className="rounded-xl bg-purple-700 px-4 py-2.5 font-bold text-white hover:bg-purple-800 transition shrink-0"
                        >
                            Adicionar
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
