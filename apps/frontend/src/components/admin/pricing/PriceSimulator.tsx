'use client';

import { useState } from 'react';
import { Calculator, Receipt } from 'lucide-react';
import snapshot from '@/data/xacai-pricing-snapshot.json';
import { priceMoney, priceStatusLabels } from '@/lib/menu-prices';
import { buildSimulatorProducts, selectSimulatorProducts, simulatePrice } from '@/lib/price-simulator';

const products = buildSimulatorProducts(snapshot);
const families = [...new Set(products.map(product => product.family))];
const percent = (value: number) => `${value.toFixed(1)}%`;
const fieldClass = 'mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900';

export default function PriceSimulator({ fixedCostPerOrder = 7.02 }: { fixedCostPerOrder?: number }) {
    const [family, setFamily] = useState('');
    const [sku, setSku] = useState('MARMITEX-700');
    const [markup, setMarkup] = useState('80');
    const [tax, setTax] = useState('4.5');
    const [fee, setFee] = useState('5');
    const [fixedOverride, setFixedOverride] = useState<string | null>(null);
    const fixed = fixedOverride ?? String(fixedCostPerOrder);
    const numeric = (value: string) => value.trim() === '' ? NaN : Number(value);
    const params = { fixedCost: numeric(fixed), markupPercent: numeric(markup), taxPercent: numeric(tax), feePercent: numeric(fee) };
    const { visible, selected } = selectSimulatorProducts(products, family, sku);
    const calculation = simulatePrice(selected?.costStatus === 'ready' ? selected.directCost : null, params);
    const readyCount = products.filter(product => product.costStatus === 'ready').length;

    return <section aria-label="Simulador de preços" className="min-w-0 space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-8">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-purple-700"><Calculator size={16} />Precificação por produto</p>
            <h2 className="mt-3 text-2xl font-black text-slate-900 md:text-3xl">Simulador de preço e resultado</h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">Os {products.length} produtos da base estão aqui. {readyCount} têm custo para simular; os demais mantém suas pendências visíveis. A sugestão não altera o cardápio de venda.</p>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">Preço mínimo = (custo direto + fixo rateado) × (1 + markup) ÷ (1 − imposto − taxa). Markup é acréscimo sobre o custo, não margem sobre a venda.</p>
        </header>

        <div className="flex flex-wrap gap-2" aria-label="Filtrar famílias">
            {['', ...families].map(value => <button key={value} type="button" aria-pressed={family === value}
                onClick={() => { setFamily(value); const next = selectSimulatorProducts(products, value, sku).selected; if (next) setSku(next.sku); }}
                className={`rounded-full border px-4 py-2 text-xs font-bold ${family === value ? 'border-purple-900 bg-purple-900 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>{value || 'Todas as famílias'}</button>)}
        </div>

        <div className="grid min-w-0 gap-6 lg:grid-cols-2">
            <div className="min-w-0 space-y-6">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 md:p-6">
                    <label htmlFor="sim-product" className="text-sm font-bold text-slate-800">Produto e tamanho</label>
                    <select id="sim-product" value={selected?.sku ?? ''} onChange={event => setSku(event.target.value)} className={fieldClass}>
                        {visible.map(product => <option key={product.sku} value={product.sku}>{product.name} · {product.size} · {product.sku}</option>)}
                    </select>
                    {selected && <div className="mt-5 space-y-3 text-sm">
                        <p className="text-xs text-slate-500">{selected.sku} · {selected.family} · {selected.size}</p>
                        <div className="flex flex-wrap justify-between gap-2 rounded-xl bg-purple-50 p-3 font-bold text-purple-950"><span>Custo direto da base</span><span>{priceMoney(selected.directCost)}</span></div>
                        <p className="text-xs text-slate-600">{selected.costQuality}</p>
                        <p><strong>Estado da ficha:</strong> {selected.state.label}</p>
                        <p className="text-xs text-slate-600">{selected.state.action}</p>
                        <div className="border-t border-slate-100 pt-3"><strong>Preço de referência: {priceMoney(selected.referencePrice)}</strong><p className="mt-1 text-xs text-slate-500">{priceStatusLabels[selected.priceStatus]} · {selected.priceSource}</p></div>
                        <p className="text-xs text-slate-500">Liberação registrada: {selected.released ? 'sim' : 'não'}. Aprovação e liberação são estados separados; esta tela não verifica publicação em tempo real.</p>
                        {selected.costStatus !== 'ready' && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">{selected.costStatus === 'missing' ? 'Sem custo completo para calcular preço e resultado.' : 'Custo provisório ou estimado: confirme a ficha antes de calcular preço e resultado.'}</p>}
                    </div>}
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 md:p-6">
                    <h3 className="font-black text-slate-900">Parâmetros da simulação</h3>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <label className="text-xs font-bold text-slate-700">Markup sobre o custo (%)<input type="number" min="0" step="1" value={markup} onChange={event => setMarkup(event.target.value)} className={fieldClass} /></label>
                        <label className="text-xs font-bold text-slate-700">Fixo rateado por pedido (R$)<input type="number" min="0" step="any" value={fixed} onChange={event => setFixedOverride(event.target.value)} className={fieldClass} /></label>
                        <label className="text-xs font-bold text-indigo-900">Imposto simulado (%)<input type="number" min="0" max="99.99" step="0.1" value={tax} onChange={event => setTax(event.target.value)} className={fieldClass} /></label>
                        <label className="text-xs font-bold text-slate-700">Taxa do canal simulada (%)<input type="number" min="0" max="99.99" step="0.1" value={fee} onChange={event => setFee(event.target.value)} className={fieldClass} /></label>
                    </div>
                    <button type="button" onClick={() => setFixedOverride(null)} className="mt-3 text-xs font-bold text-purple-800 underline">Usar rateio do painel: {priceMoney(fixedCostPerOrder)}</button>
                    <p className="mt-4 flex items-start gap-2 rounded-xl bg-indigo-50 p-3 text-xs leading-relaxed text-indigo-900"><Receipt size={18} className="shrink-0" />Imposto e taxa são hipóteses editáveis. O valor de 4,5% não confirma a alíquota fiscal da loja; use a alíquota efetiva aplicável ao seu cenário.</p>
                </div>
            </div>

            <div className="min-w-0 rounded-3xl bg-purple-950 p-5 text-white md:p-8">
                <p className="text-xs font-bold uppercase tracking-wider text-purple-200">Sugestão para revisão</p>
                {calculation.ok ? <>
                    <p className="mt-4 break-words text-4xl font-black md:text-5xl" data-testid="suggested-price">{priceMoney(calculation.suggestedPrice)}</p>
                    <p className="mt-3 text-sm text-purple-200">Mínimo calculado: {priceMoney(calculation.minimumPrice)}. Final comercial ,90 sempre igual ou acima do mínimo.</p>
                    <dl className="mt-8 space-y-4 text-sm">
                        {[
                            ['Custo direto', selected!.directCost], ['Imposto simulado', calculation.tax],
                            ['Taxa do canal', calculation.fee], ['Contribuição após custo, imposto e taxa', calculation.contribution],
                            ['Fixo rateado', params.fixedCost], ['Resultado estimado após rateio', calculation.result],
                        ].map(([label, value]) => <div key={String(label)} className="flex flex-wrap justify-between gap-2 border-b border-white/15 pb-3"><dt className="max-w-[70%] text-purple-100">{label}</dt><dd className="font-bold">{priceMoney(value as number | null)}</dd></div>)}
                    </dl>
                    <p className="mt-5 text-sm text-purple-200">Resultado: {percent(calculation.resultPercent)} · CMV: {percent(calculation.cmvPercent)}</p>
                    <p className="mt-5 text-xs leading-relaxed text-purple-200">Todos os valores usam o preço sugerido exibido. O resultado depende destes custos e hipóteses; não representa lucro realizado nem aprovação comercial.</p>
                </> : <p role="alert" className="mt-6 rounded-xl border border-white/20 bg-white/10 p-4 text-sm">{calculation.error}</p>}
            </div>
        </div>

        <div className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 md:p-6">
            <h3 className="text-xl font-black text-slate-900">Mix completo da loja</h3>
            <p className="mt-2 text-sm text-slate-500">{visible.length} de {products.length} produtos · mesmos parâmetros e cálculos da seleção acima.</p>
            <div className="mt-5 overflow-x-auto" tabIndex={0} role="region" aria-label="Resultados por produto">
                <table className="w-full min-w-[1050px] text-left text-sm">
                    <thead><tr className="border-b text-xs text-slate-500">{['Produto / estado', 'Custo direto', 'Preço de referência', 'Sugestão', 'Imposto', 'Taxa', 'Fixo', 'Resultado estimado'].map(title => <th key={title} className="px-3 py-3">{title}</th>)}</tr></thead>
                    <tbody>{visible.map(product => {
                        const row = simulatePrice(product.costStatus === 'ready' ? product.directCost : null, params);
                        return <tr key={product.sku} data-simulator-row={product.sku} className={`border-b border-slate-100 ${selected?.sku === product.sku ? 'bg-purple-50' : ''}`}>
                            <td className="max-w-xs px-3 py-4"><button type="button" onClick={() => setSku(product.sku)} className="text-left font-bold text-purple-950 underline decoration-purple-200">{product.name} · {product.size}</button><p className="mt-1 text-xs text-slate-500">{product.sku} · {product.family}</p><p className="mt-1 text-xs text-slate-500">{product.state.label} · liberação {product.released ? 'sim' : 'não'}</p></td>
                            <td className="px-3 py-4">{priceMoney(product.directCost)}<p className="mt-1 max-w-40 text-xs text-slate-500">{product.costQuality}</p></td>
                            <td className="px-3 py-4">{priceMoney(product.referencePrice)}<p className="mt-1 text-xs text-slate-500">{priceStatusLabels[product.priceStatus]}</p></td>
                            <td className="px-3 py-4 font-bold text-purple-900">{row.ok ? priceMoney(row.suggestedPrice) : 'Pendente'}</td>
                            <td className="px-3 py-4">{row.ok ? priceMoney(row.tax) : '—'}</td>
                            <td className="px-3 py-4">{row.ok ? priceMoney(row.fee) : '—'}</td>
                            <td className="px-3 py-4">{row.ok ? priceMoney(params.fixedCost) : '—'}</td>
                            <td className="px-3 py-4">{row.ok ? <>{priceMoney(row.result)}<p className="mt-1 text-xs text-slate-500">{percent(row.resultPercent)}</p></> : <span className="text-xs text-amber-800">{product.costStatus === 'provisional' ? 'Confirmar custo' : row.error}</span>}</td>
                        </tr>;
                    })}</tbody>
                </table>
            </div>
        </div>
    </section>;
}
