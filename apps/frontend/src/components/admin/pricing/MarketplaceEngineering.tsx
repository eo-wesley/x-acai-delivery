'use client';

import { useMemo, useState } from 'react';
import { Calculator, Search, SlidersHorizontal, Store, Truck } from 'lucide-react';
import snapshotJson from '@/data/xacai-pricing-snapshot.json';

type Recipe = { id: number; product: string; variant: string; ingredients: number | null; packaging: number | null };
type Portion = { id: string; complement: string; menuType: string; inputPrice: number | null; packQuantity: number | null; portionQuantity?: number | null };
type Snapshot = {
    directCostBasis: {
        acaiCostPerGram: number;
        packagingCostBySize: Record<string, number>;
        marmitex500PackagingCost: number;
        marmitex700PackagingCost: number;
    };
    fichas: Recipe[];
    portions: Portion[];
};
type CatalogItem = { id: string; product: string; sizeMl: number; cost: number; kind: 'fixo' | 'monte-seu'; detail: string };
type Channel = { id: 'direct' | 'ifood-own' | 'ifood-partner' | 'keeta' | '99food'; label: string; fee: number };
type SortMode = 'cost-asc' | 'cost-desc' | 'price-asc' | 'price-desc';

const snapshot = snapshotJson as Snapshot;
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const FIXED_PRODUCTS = new Set([
    'Açaí X-Chocolá', 'Açaí X-Chocolã', 'Açaí X-Creme', 'Açaí X-King Paçoca', 'Açaí X-King Tella', 'Açaí X-Paçokita',
    'Açaí X-Paçoleite', 'Açaí X-Splash', 'Açaí X-Tella', 'Açaí X-Tradicional', 'Açaí X-Tropical'
]);
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
const nominalSize = (value: string) => {
    const match = value.match(/\b(300|400|500|700)\s*ml\b/i);
    return match ? Number(match[1]) : null;
};
const roundToNinety = (value: number) => Math.ceil(value + 0.1) - 0.1;
const suggestedPrice = (cost: number, targetMargin: number, fee: number) => {
    const divisor = 1 - ((targetMargin + fee) / 100);
    return divisor <= 0.05 ? null : roundToNinety(cost / divisor);
};
const portionCost = (portion: Portion) => {
    if (!portion.inputPrice || !portion.packQuantity || !portion.portionQuantity) return null;
    return (portion.inputPrice / portion.packQuantity) * portion.portionQuantity;
};

const fixedCatalog = (): CatalogItem[] => {
    const seen = new Set<string>();
    return snapshot.fichas.filter(recipe => FIXED_PRODUCTS.has(recipe.product)).flatMap(recipe => {
        const sizeMl = nominalSize(recipe.variant);
        if (!sizeMl || recipe.ingredients === null || recipe.packaging === null) return [];
        const id = `${normalize(recipe.product)}-${sizeMl}`;
        if (seen.has(id)) return [];
        seen.add(id);
        return [{
            id,
            product: recipe.product.replace(/^Açaí\s+/i, '').replace('X-Chocolã', 'X-Chocolá'),
            sizeMl,
            cost: (sizeMl * snapshot.directCostBasis.acaiCostPerGram) + recipe.ingredients + recipe.packaging,
            kind: 'fixo' as const,
            detail: 'base cheia + receita fixa + embalagem completa'
        }];
    });
};

const variableCatalog = (): CatalogItem[] => {
    const activePortions = snapshot.portions
        .filter(portion => normalize(portion.complement) !== 'kiwi' && /gr[aá]tis/i.test(portion.menuType))
        .map(portion => ({ name: portion.complement, cost: portionCost(portion) }))
        .filter((portion): portion is { name: string; cost: number } => portion.cost !== null)
        .sort((a, b) => b.cost - a.cost);
    const definitions = [
        { id: 'monte-300', product: 'Monte Seu', sizeMl: 300, choices: 3, packaging: snapshot.directCostBasis.packagingCostBySize['300'] },
        { id: 'monte-400', product: 'Monte Seu', sizeMl: 400, choices: 3, packaging: snapshot.directCostBasis.packagingCostBySize['400'] },
        { id: 'monte-500', product: 'Monte Seu', sizeMl: 500, choices: 3, packaging: snapshot.directCostBasis.packagingCostBySize['500'] },
        { id: 'monte-700', product: 'Monte Seu', sizeMl: 700, choices: 4, packaging: snapshot.directCostBasis.packagingCostBySize['700'] },
        { id: 'marmitex-500', product: 'Marmitex', sizeMl: 500, choices: 3, packaging: snapshot.directCostBasis.marmitex500PackagingCost },
        { id: 'marmitex-700', product: 'Marmitex', sizeMl: 700, choices: 4, packaging: snapshot.directCostBasis.marmitex700PackagingCost }
    ];
    return definitions.map(definition => {
        const complementsCost = activePortions.slice(0, definition.choices).reduce((total, portion) => total + portion.cost, 0);
        return {
            id: definition.id,
            product: definition.product,
            sizeMl: definition.sizeMl,
            cost: (definition.sizeMl * snapshot.directCostBasis.acaiCostPerGram) + definition.packaging + complementsCost,
            kind: 'monte-seu' as const,
            detail: `base cheia + ${definition.choices} complementos mais caros + embalagem completa`
        };
    });
};
const CATALOG = [...fixedCatalog(), ...variableCatalog()];

export default function MarketplaceEngineering() {
    const [targetMargin, setTargetMargin] = useState(35);
    const [directFee, setDirectFee] = useState(0);
    const [ifoodOwnFee, setIfoodOwnFee] = useState(15.2);
    const [ifoodPartnerFee, setIfoodPartnerFee] = useState(26.2);
    const [keetaFee, setKeetaFee] = useState(13);
    const [ninetyNineFee, setNinetyNineFee] = useState(18);
    const [sortMode, setSortMode] = useState<SortMode>('cost-asc');
    const [search, setSearch] = useState('');
    const channels: Channel[] = [
        { id: 'direct', label: 'Direto / próprio', fee: directFee },
        { id: 'ifood-own', label: 'iFood entrega própria', fee: ifoodOwnFee },
        { id: 'ifood-partner', label: 'iFood entrega parceira', fee: ifoodPartnerFee },
        { id: 'keeta', label: 'Keeta', fee: keetaFee },
        { id: '99food', label: '99Food', fee: ninetyNineFee }
    ];
    const rows = useMemo(() => {
        const query = normalize(search.trim());
        const filtered = CATALOG.filter(item => !query || normalize(`${item.product} ${item.sizeMl}`).includes(query));
        return [...filtered].sort((a, b) => {
            const priceA = suggestedPrice(a.cost, targetMargin, directFee) ?? Number.POSITIVE_INFINITY;
            const priceB = suggestedPrice(b.cost, targetMargin, directFee) ?? Number.POSITIVE_INFINITY;
            if (sortMode === 'cost-desc') return b.cost - a.cost;
            if (sortMode === 'price-asc') return priceA - priceB;
            if (sortMode === 'price-desc') return priceB - priceA;
            return a.cost - b.cost;
        });
    }, [search, sortMode, targetMargin, directFee]);
    const feeInputs = [
        { label: 'Direto / próprio', value: directFee, setter: setDirectFee },
        { label: 'iFood entrega própria', value: ifoodOwnFee, setter: setIfoodOwnFee },
        { label: 'iFood entrega parceira', value: ifoodPartnerFee, setter: setIfoodPartnerFee },
        { label: 'Keeta', value: keetaFee, setter: setKeetaFee },
        { label: '99Food', value: ninetyNineFee, setter: setNinetyNineFee }
    ];

    return <div className="space-y-6">
        <header className="overflow-hidden rounded-[32px] bg-gradient-to-br from-purple-950 via-fuchsia-950 to-slate-950 p-6 text-white shadow-xl md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-5">
                <div><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-fuchsia-100"><Calculator size={14} /> custo cheio e preço sugerido</div><h2 className="text-2xl font-black md:text-4xl">Tabela interativa por aplicativo</h2><p className="mt-2 max-w-3xl text-sm text-fuchsia-100 md:text-base">Cada custo usa a base cheia do tamanho nominal, a receita ou os complementos e a embalagem completa. As taxas são editáveis; confirme os percentuais do seu contrato antes de publicar preços.</p></div>
                <div className="rounded-2xl border border-emerald-300/30 bg-emerald-400/10 p-4 text-sm"><strong className="block text-emerald-200">Regra corrigida</strong><span>300 ml = 300 g de açaí + receita/complementos + embalagem.</span></div>
            </div>
        </header>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="mb-5 flex items-center gap-2"><SlidersHorizontal className="text-purple-700" size={22} /><div><h3 className="font-black text-slate-900">Margem e taxas editáveis</h3><p className="text-xs text-slate-500">A venda direta começa em 0%. Os percentuais dos aplicativos são referências editáveis, não contratos confirmados.</p></div></div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                <label className="rounded-2xl border border-purple-200 bg-purple-50 p-4"><span className="text-xs font-black uppercase text-purple-900">Sobra desejada</span><div className="mt-2 flex items-center gap-2"><input aria-label="Margem desejada" type="number" min="0" max="60" step="0.5" value={targetMargin} onChange={event => setTargetMargin(Number(event.target.value))} className="w-full rounded-xl border border-purple-200 bg-white px-3 py-2 font-black" /><span className="font-black text-purple-900">%</span></div></label>
                {feeInputs.map(input => <label key={input.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><span className="text-xs font-black uppercase text-slate-700">{input.label}</span><div className="mt-2 flex items-center gap-2"><input aria-label={`Taxa ${input.label}`} type="number" min="0" max="50" step="0.1" value={input.value} onChange={event => input.setter(Number(event.target.value))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-black" /><span className="font-black text-slate-700">%</span></div></label>)}
            </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div><h3 className="flex items-center gap-2 text-xl font-black text-slate-900"><Truck className="text-purple-700" size={22} /> 46 produtos e bases em ordem</h3><p className="mt-1 text-sm text-slate-500">O Monte Seu e o Marmitex usam o mix mais caro permitido, para o preço sugerido proteger qualquer escolha.</p></div>
                <div className="flex flex-col gap-2 sm:flex-row"><label className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input aria-label="Buscar produto" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar produto" className="rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm" /></label><select aria-label="Ordenar tabela" value={sortMode} onChange={event => setSortMode(event.target.value as SortMode)} className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold"><option value="cost-asc">Custo: menor → maior</option><option value="cost-desc">Custo: maior → menor</option><option value="price-asc">Preço sugerido: menor → maior</option><option value="price-desc">Preço sugerido: maior → menor</option></select></div>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="min-w-[1180px] w-full text-left text-sm"><thead className="bg-purple-950 text-xs uppercase text-white"><tr><th className="p-4">Produto</th><th className="p-4">Tamanho</th><th className="p-4">Custo total</th>{channels.map(channel => <th key={channel.id} className="p-4">{channel.label}<span className="block text-[10px] font-normal text-purple-200">taxa {channel.fee.toFixed(1)}%</span></th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map(item => <tr key={item.id} className="align-top hover:bg-purple-50/50"><td className="p-4"><strong className="text-slate-900">{item.product}</strong><span className={`ml-2 rounded-full px-2 py-1 text-[10px] font-black uppercase ${item.kind === 'fixo' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>{item.kind === 'fixo' ? 'receita fixa' : 'mix seguro'}</span><p className="mt-1 max-w-72 text-xs text-slate-500">{item.detail}</p></td><td className="p-4 font-black text-slate-700">{item.sizeMl} ml</td><td className="p-4 text-lg font-black text-slate-950">{money.format(item.cost)}</td>{channels.map(channel => { const price = suggestedPrice(item.cost, targetMargin, channel.fee); return <td key={channel.id} className={`p-4 text-lg font-black ${channel.id === 'direct' ? 'bg-emerald-50 text-emerald-800' : 'text-purple-900'}`}>{price === null ? 'Taxa + margem inválidas' : money.format(price)}</td>; })}</tr>)}</tbody></table></div>
            <div className="mt-4 grid gap-3 text-xs text-slate-600 md:grid-cols-2"><p className="rounded-xl bg-emerald-50 p-3"><Store className="mr-1 inline text-emerald-700" size={15} /><strong>Preço direto:</strong> custo total dividido pela parcela restante após a sobra desejada. Taxa direta padrão: 0%.</p><p className="rounded-xl bg-amber-50 p-3"><strong>Preço por aplicativo:</strong> custo ÷ (1 − sobra desejada − taxa do canal), arredondado sempre para cima em final 90.</p></div>
        </section>
    </div>;
}
