'use client';

import { useEffect, useMemo, useState } from 'react';
import snapshotJson from '@/data/xacai-pricing-snapshot.json';
import MenuPriceBoard from './MenuPriceBoard';

type Tab = 'menu' | 'overview' | 'products' | 'recipes' | 'ingredients' | 'portions' | 'components' | 'pending';
type StateInfo = { code: string; label: string; action: string; lot: number };
type Product = { sku: string; family: string; product: string; size: string; cost: number | null; costQuality: string; appPrice: number | null; state: StateInfo; released: boolean };
type Recipe = { id: number; product: string; variant: string; units: number; acai: number | null; ingredients: number | null; packaging: number | null; total: number | null; sourceStatus: string; state: StateInfo; provisionalComponents: number; note: string; released: boolean };
type Ingredient = { ingredient: string; currentPrice: number | null; packQuantity: number | null; unit: string; baseCost: number | null; comparisonUnit: string; status: string; source: string; referenceDate?: string; note?: string };
type Portion = { id: string; complement: string; menuType: string; addonPrice: number | null; inputPrice: number | null; packQuantity: number | null; unit: string; source: string };
type ComponentLine = { id: number; product: string; variant: string; ingredient: string; quantity: number | null; unit: string; unitCost: number | null; totalCost: number | null; category: string; status: string; source: string };
type PendingItem = { id: string; lot: number; field: string; unit: string; current: string; proof: string; impact: string; priority: number };
type PriceDecision = { product: string; price?: number; proposedPrice?: number; status: string; worstCaseContributionMarginPercent?: number };
type FixedItem = { product: string; sizeMl: number; recommendedPrice: number; totalDirectCost: number; mathematicalMinimumPrice: number; contributionMarginPercent: number; status: string };
type Snapshot = {
    asOf: string;
    products: Product[];
    fichas: Recipe[];
    ingredients: Ingredient[];
    portions: Portion[];
    components: ComponentLine[];
    collection: PendingItem[];
    initialCollectionAnswers: Record<string, string>;
    initialPortionAnswers: Record<string, number | string>;
    pricingScope: {
        paymentFeePolicy: { pricingReservePercent: number; targetContributionMarginPercent: number; pricingFormula: string; status: string };
        approvedPrices: Record<string, PriceDecision>;
        proposedPrices: Record<string, PriceDecision | string>;
        status: string;
    };
    fixedCupPricing: { completedFamilies: number; totalFamilies: number; currentFamily: string; priceStatus: string; batches: Record<string, { items: FixedItem[] }> };
    sizePortionRules: Record<string, { label: string; portionGramsPerComplement: number; complementChoices?: number; marmitexComplementChoices?: number; layers?: number; gramsPerComplementPerLayer?: number; status: string }>;
};
type LiveProduct = { status: 'ready' | 'provisional' | 'incomplete'; directCostCents: number | null };
type LiveState = { status: 'loading' | 'online' | 'offline'; products: LiveProduct[]; message: string };
type SavedAnswers = { collection: Record<string, string>; portions: Record<string, number | string> };

const snapshot = snapshotJson as Snapshot;
const STORAGE_KEY = 'xacai-pricing-workspace-v1';
const PAGE_SIZE = 100;
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 });

const stateTone = (code: string) => {
    if (/done|confirm|comprov|ready/i.test(code)) return 'bg-emerald-100 text-emerald-800';
    if (/provis|revis|variavel|variable/i.test(code)) return 'bg-amber-100 text-amber-900';
    if (/combo|receita|incomplete/i.test(code)) return 'bg-rose-100 text-rose-800';
    return 'bg-slate-100 text-slate-700';
};
const badge = (label: string, code = label) => <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black uppercase ${stateTone(code)}`}>{label}</span>;
const textMatches = (query: string, ...values: unknown[]) => values.join(' ').toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'));
const minPrice = (cost: number | null) => cost === null ? null : cost / 0.6;

function SummaryCard({ label, value, detail, tone = 'text-purple-800' }: { label: string; value: string | number; detail: string; tone?: string }) {
    return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p><p className={`mt-1 text-3xl font-black ${tone}`}>{value}</p><p className="mt-2 text-xs text-slate-500">{detail}</p></article>;
}

function Toolbar({ search, onSearch, status, onStatus, count, statuses }: { search: string; onSearch: (value: string) => void; status: string; onStatus: (value: string) => void; count: number; statuses: { value: string; label: string }[] }) {
    return <div className="mb-4 flex flex-wrap items-center gap-3">
        <input value={search} onChange={event => onSearch(event.target.value)} placeholder="Buscar nesta seção" className="min-w-64 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100" />
        <select value={status} onChange={event => onStatus(event.target.value)} className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700">
            <option value="">Todos os estados</option>{statuses.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        <span className="text-sm font-bold text-slate-500">{count} registro(s)</span>
    </div>;
}

export default function PricingWorkspace() {
    const [tab, setTab] = useState<Tab>('menu');
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [componentPage, setComponentPage] = useState(1);
    const [live, setLive] = useState<LiveState>({ status: 'loading', products: [], message: 'Consultando o banco operacional…' });
    const [answers, setAnswers] = useState<SavedAnswers>({ collection: snapshot.initialCollectionAnswers || {}, portions: snapshot.initialPortionAnswers || {} });

    useEffect(() => {
        let cancelled = false;
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Partial<SavedAnswers>;
            queueMicrotask(() => {
                if (!cancelled) {
                    setAnswers({
                        collection: { ...snapshot.initialCollectionAnswers, ...(saved.collection || {}) },
                        portions: { ...snapshot.initialPortionAnswers, ...(saved.portions || {}) }
                    });
                }
            });
        } catch { /* Mantém a base canônica quando o armazenamento local está inválido. */ }

        const loadLive = async () => {
            try {
                const token = localStorage.getItem('admin_token');
                const slug = localStorage.getItem('admin_slug') || 'default';
                const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                const apiBase = isLocal ? '' : (process.env.NEXT_PUBLIC_API_URL || '');
                const query = new URLSearchParams({ slug, feeRate: '0.05', targetContributionRate: '0.35' });
                const response = await fetch(`${apiBase}/api/admin/pricing/costing-report?${query}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const payload = await response.json() as { products?: LiveProduct[] };
                setLive({ status: 'online', products: payload.products || [], message: 'Banco operacional conectado.' });
            } catch (cause) {
                setLive({ status: 'offline', products: [], message: `Snapshot completo disponível; banco operacional indisponível (${cause instanceof Error ? cause.message : 'falha desconhecida'}).` });
            }
        };
        void loadLive();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
    }, [answers]);

    const approved = Object.entries(snapshot.pricingScope.approvedPrices).filter(([, item]) => item && typeof item === 'object') as [string, PriceDecision][];
    const proposed = Object.entries(snapshot.pricingScope.proposedPrices).filter(([, item]) => item && typeof item === 'object') as [string, PriceDecision][];
    const fixedItems = Object.values(snapshot.fixedCupPricing.batches).flatMap(batch => batch.items || []);
    const pendingIngredients = snapshot.ingredients.filter(item => /provis/i.test(item.status));
    const pendingComponents = snapshot.components.filter(item => /provis/i.test(item.status));
    const completedCollection = snapshot.collection.filter(item => String(answers.collection[item.id] || '').trim()).length;
    const completedPortions = snapshot.portions.filter(item => Number(answers.portions[item.id]) > 0).length;

    const products = useMemo(() => snapshot.products.filter(item => (!search || textMatches(search, item.sku, item.family, item.product, item.size)) && (!status || item.state.code === status)), [search, status]);
    const recipes = useMemo(() => snapshot.fichas.filter(item => (!search || textMatches(search, item.product, item.variant, item.note)) && (!status || item.state.code === status)), [search, status]);
    const ingredients = useMemo(() => snapshot.ingredients.filter(item => (!search || textMatches(search, item.ingredient, item.source, item.note)) && (!status || (status === 'provisional' ? /provis/i.test(item.status) : !/provis/i.test(item.status)))), [search, status]);
    const portions = useMemo(() => snapshot.portions.filter(item => !search || textMatches(search, item.complement, item.menuType, item.source)), [search]);
    const components = useMemo(() => snapshot.components.filter(item => (!search || textMatches(search, item.product, item.variant, item.ingredient, item.source)) && (!status || (status === 'provisional' ? /provis/i.test(item.status) : !/provis/i.test(item.status)))), [search, status]);
    const pagedComponents = components.slice((componentPage - 1) * PAGE_SIZE, componentPage * PAGE_SIZE);
    const pending = useMemo(() => snapshot.collection.filter(item => (!search || textMatches(search, item.id, item.field, item.current, item.impact)) && (!status || (status === 'done' ? String(answers.collection[item.id] || '').trim() : !String(answers.collection[item.id] || '').trim()))), [search, status, answers.collection]);

    const setCollectionAnswer = (id: string, value: string) => setAnswers(current => ({ ...current, collection: { ...current.collection, [id]: value } }));
    const setPortionAnswer = (id: string, value: string) => setAnswers(current => ({ ...current, portions: { ...current.portions, [id]: value } }));
    const selectTab = (nextTab: Tab) => {
        setTab(nextTab);
        setSearch('');
        setStatus('');
        setComponentPage(1);
    };
    const tabs: { id: Tab; label: string; count?: number }[] = [
        { id: 'menu', label: 'Preços do cardápio', count: snapshot.products.length },
        { id: 'overview', label: 'Visão geral' }, { id: 'products', label: 'Produtos', count: snapshot.products.length },
        { id: 'recipes', label: 'Fichas', count: snapshot.fichas.length }, { id: 'ingredients', label: 'Insumos', count: snapshot.ingredients.length },
        { id: 'portions', label: 'Porções', count: snapshot.portions.length }, { id: 'components', label: 'Componentes', count: snapshot.components.length },
        { id: 'pending', label: 'Pendências', count: snapshot.collection.length }
    ];

    return <div className="space-y-6">
        <header className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#42113c] via-[#6d1c5e] to-[#9f3d78] p-6 text-white shadow-xl md:p-9">
            <div className="flex flex-wrap items-start justify-between gap-5">
                <div><p className="text-xs font-black uppercase tracking-[0.2em] text-fuchsia-200">RXA · Centro de precificação</p><h1 className="mt-2 text-3xl font-black md:text-5xl">Ficha técnica do X-Açaí</h1><p className="mt-3 max-w-3xl text-sm text-fuchsia-100 md:text-base">Base de {snapshot.asOf}: receitas, gramagens, embalagens, insumos, custos e decisões de preço em um único lugar.</p></div>
                <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm"><strong className="block">Regra confirmada</strong>5% pagamento + 35% contribuição<br /><span className="text-fuchsia-200">Preço técnico = custo ÷ 0,60</span></div>
            </div>
        </header>

        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><strong>Controle de publicação:</strong> esta área calcula e organiza. Nenhum preço daqui foi enviado automaticamente à Takeat. “Preço antigo do app” é somente referência; “recomendado” ainda precisa da sua aprovação.</section>

        <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm" aria-label="Seções da ficha técnica">
            {tabs.map(item => <button key={item.id} onClick={() => selectTab(item.id)} className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-black transition ${tab === item.id ? 'bg-purple-800 text-white' : 'text-slate-600 hover:bg-purple-50 hover:text-purple-800'}`}>{item.label}{item.count !== undefined && <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] ${tab === item.id ? 'bg-white/20' : 'bg-slate-100'}`}>{item.count}</span>}</button>)}
        </nav>

        {tab === 'menu' && <MenuPriceBoard />}
        {tab === 'overview' && <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard label="Produtos mapeados" value={snapshot.products.length} detail={`${snapshot.fichas.length} registros de ficha técnica`} />
                <SummaryCard label="Custos de insumo" value={snapshot.ingredients.length} detail={`${pendingIngredients.length} ainda provisório(s)`} tone="text-emerald-700" />
                <SummaryCard label="Componentes" value={snapshot.components.length} detail={`${pendingComponents.length} linha(s) provisória(s)`} tone="text-blue-700" />
                <SummaryCard label="Famílias precificadas" value={`${snapshot.fixedCupPricing.completedFamilies}/${snapshot.fixedCupPricing.totalFamilies}`} detail={`Atual: ${snapshot.fixedCupPricing.currentFamily}`} tone="text-amber-700" />
            </div>

            <div className="grid gap-5 xl:grid-cols-3">
                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black text-slate-800">Decisões de preço</h2><p className="text-sm text-slate-500">Preço presencial/Takeat, sem comissão de marketplace.</p></div>{badge(`${approved.length} aprovados`, 'done')}</div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">{approved.map(([key, item]) => <div key={key} className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-slate-800">{item.product}</p><p className="mt-1 text-xs text-emerald-800">Aprovado · ainda não publicado</p></div><strong className="text-xl text-emerald-800">{money.format(item.price || 0)}</strong></div>{item.worstCaseContributionMarginPercent !== undefined && <p className="mt-2 text-xs text-slate-600">Contribuição no pior caso: {number.format(item.worstCaseContributionMarginPercent)}%</p>}</div>)}</div>
                    {proposed.map(([key, item]) => <div key={key} className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-black text-slate-800">{item.product}</p><p className="text-xs text-amber-900">Recomendação aguardando sua confirmação</p></div><strong className="text-xl text-amber-800">{money.format(item.proposedPrice || 0)}</strong></div></div>)}
                </article>
                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-black text-slate-800">Estado operacional</h2><div className={`mt-4 rounded-xl p-4 ${live.status === 'online' ? 'bg-emerald-50 text-emerald-900' : live.status === 'loading' ? 'bg-blue-50 text-blue-900' : 'bg-amber-50 text-amber-950'}`}><div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${live.status === 'online' ? 'bg-emerald-500' : live.status === 'loading' ? 'animate-pulse bg-blue-500' : 'bg-amber-500'}`} /><strong>{live.status === 'online' ? 'Banco conectado' : live.status === 'loading' ? 'Verificando banco' : 'Modo snapshot'}</strong></div><p className="mt-2 text-xs">{live.message}</p></div><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-slate-50 p-3"><dt className="text-slate-500">Produtos no banco</dt><dd className="text-xl font-black">{live.products.length}</dd></div><div className="rounded-xl bg-slate-50 p-3"><dt className="text-slate-500">Prontos no banco</dt><dd className="text-xl font-black">{live.products.filter(item => item.status === 'ready').length}</dd></div></dl></article>
            </div>

                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-black text-slate-800">Sequência dos copos fixos</h2><p className="mt-1 text-sm text-slate-500">As seis famílias fixas estão aprovadas nos quatro tamanhos. Os preços foram calculados pelas fichas reais, com reserva de pagamento de 5% e piso de contribuição de 35%. Nenhum preço foi publicado na Takeat.</p><div className="mt-4 overflow-x-auto"><table className="min-w-[780px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Produto</th><th className="p-3">Custo direto</th><th className="p-3">Mínimo matemático</th><th className="p-3">Preço</th><th className="p-3">Contribuição</th><th className="p-3">Estado</th></tr></thead><tbody>{fixedItems.map((item, index) => { const approved = /aprovad/i.test(item.status); return <tr key={`${item.product}-${item.sizeMl}-${index}`} className="border-t"><td className="p-3 font-black">{item.product.replace('Açaí ', '')} {item.sizeMl} ml</td><td className="p-3">{money.format(item.totalDirectCost)}</td><td className="p-3">{money.format(item.mathematicalMinimumPrice)}</td><td className="p-3 text-lg font-black text-purple-800">{money.format(item.recommendedPrice)}</td><td className="p-3">{number.format(item.contributionMarginPercent)}%</td><td className="p-3">{badge(approved ? 'Aprovado' : 'Recomendado', approved ? 'done' : 'revisar')}</td></tr>; })}</tbody></table></div></article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-black text-slate-800">Gramagem padrão dos Monte Seu</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{Object.entries(snapshot.sizePortionRules).map(([key, rule]) => <div key={key} className="rounded-xl border border-purple-100 bg-purple-50 p-4"><p className="font-black text-purple-950">{rule.label}</p><p className="mt-2 text-2xl font-black text-purple-800">{rule.portionGramsPerComplement} g</p><p className="text-xs text-slate-600">por complemento · {rule.complementChoices || rule.marmitexComplementChoices || '—'} escolhas{rule.layers ? ` · ${rule.layers} camadas` : ''}</p></div>)}</div></article>
        </div>}

        {tab === 'products' && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-black text-slate-800">Produtos e referências de preço</h2><p className="mb-4 mt-1 text-sm text-slate-500">O preço antigo do app não é recomendação. O mínimo técnico é calculado com reserva de 5% e contribuição-alvo de 35%.</p><Toolbar search={search} onSearch={setSearch} status={status} onStatus={setStatus} count={products.length} statuses={[{ value: 'done', label: 'Custo recalculado' }, { value: 'revisar', label: 'Revisar' }, { value: 'variavel', label: 'Variável' }, { value: 'receita', label: 'Receita pendente' }, { value: 'combo', label: 'Combo' }]} /><div className="overflow-x-auto"><table className="min-w-[1050px] w-full text-left text-sm"><thead className="bg-purple-950 text-xs uppercase text-white"><tr><th className="p-3">Produto</th><th className="p-3">Tamanho</th><th className="p-3">Custo direto</th><th className="p-3">Mínimo técnico</th><th className="p-3">Preço antigo do app</th><th className="p-3">Estado</th><th className="p-3">Próxima ação</th></tr></thead><tbody>{products.map(item => <tr key={item.sku} className="border-t align-top hover:bg-purple-50/40"><td className="p-3"><strong>{item.product}</strong><div className="text-xs text-slate-500">{item.family} · {item.sku}</div></td><td className="p-3 font-bold">{item.size}</td><td className="p-3 font-bold">{item.cost === null ? '—' : money.format(item.cost)}<div className="max-w-60 text-xs font-normal text-slate-500">{item.costQuality}</div></td><td className="p-3 font-black text-purple-800">{minPrice(item.cost) === null ? '—' : money.format(minPrice(item.cost) as number)}</td><td className="p-3">{item.appPrice === null ? '—' : money.format(item.appPrice)}<div className="text-[11px] font-bold uppercase text-amber-700">Só referência</div></td><td className="p-3">{badge(item.state.label, item.state.code)}</td><td className="max-w-xs p-3 text-xs text-slate-600">{item.state.action}</td></tr>)}</tbody></table></div></section>}

        {tab === 'recipes' && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-black text-slate-800">Fichas técnicas</h2><p className="mb-4 mt-1 text-sm text-slate-500">Separação do açaí, complementos e embalagem por produto/variante.</p><Toolbar search={search} onSearch={setSearch} status={status} onStatus={setStatus} count={recipes.length} statuses={[{ value: 'done', label: 'Fechada' }, { value: 'revisar', label: 'Revisar' }, { value: 'variavel', label: 'Variável' }, { value: 'combo', label: 'Combo' }]} /><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{recipes.map(item => <article key={item.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3">{badge(item.state.label, item.state.code)}<span className="text-xs font-bold text-slate-400">#{item.id}</span></div><h3 className="mt-3 font-black text-slate-800">{item.product}</h3><p className="text-xs text-slate-500">{item.variant}</p><div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-lg bg-slate-50 p-2">Açaí<strong className="block text-sm">{item.acai === null ? '—' : money.format(item.acai)}</strong></div><div className="rounded-lg bg-slate-50 p-2">Complementos<strong className="block text-sm">{item.ingredients === null ? 'Variável' : money.format(item.ingredients)}</strong></div><div className="rounded-lg bg-slate-50 p-2">Embalagem<strong className="block text-sm">{item.packaging === null ? '—' : money.format(item.packaging)}</strong></div><div className="rounded-lg bg-purple-50 p-2">Total direto<strong className="block text-sm text-purple-800">{item.total === null ? 'Variável' : money.format(item.total)}</strong></div></div><p className="mt-3 text-xs text-slate-600"><strong>Próximo:</strong> {item.state.action}</p>{item.note && <p className="mt-2 border-t pt-2 text-xs text-slate-500">{item.note}</p>}</article>)}</div></section>}

        {tab === 'ingredients' && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-black text-slate-800">Custos dos insumos</h2><p className="mb-4 mt-1 text-sm text-slate-500">Preço de compra, conteúdo da embalagem e custo-base usado nas fichas.</p><Toolbar search={search} onSearch={setSearch} status={status} onStatus={setStatus} count={ingredients.length} statuses={[{ value: 'confirmed', label: 'Confirmados/comprovados' }, { value: 'provisional', label: 'Provisórios' }]} /><div className="overflow-x-auto"><table className="min-w-[900px] w-full text-left text-sm"><thead className="bg-purple-950 text-xs uppercase text-white"><tr><th className="p-3">Insumo</th><th className="p-3">Compra</th><th className="p-3">Conteúdo</th><th className="p-3">Custo-base</th><th className="p-3">Estado</th><th className="p-3">Fonte</th></tr></thead><tbody>{ingredients.map(item => <tr key={item.ingredient} className="border-t align-top"><td className="p-3 font-black">{item.ingredient}</td><td className="p-3">{item.currentPrice === null ? '—' : money.format(item.currentPrice)}</td><td className="p-3">{item.packQuantity === null ? '—' : `${number.format(item.packQuantity)} ${item.unit}`}</td><td className="p-3 font-bold">{item.baseCost === null ? '—' : money.format(item.baseCost)}<div className="text-xs font-normal text-slate-500">{item.comparisonUnit}</div></td><td className="p-3">{badge(item.status, item.status)}</td><td className="max-w-sm p-3 text-xs text-slate-600">{item.source}{item.referenceDate && <div className="mt-1 text-slate-400">Referência: {item.referenceDate}</div>}</td></tr>)}</tbody></table></div></section>}

        {tab === 'portions' && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-black text-slate-800">Porções dos complementos</h2><p className="mb-4 mt-1 text-sm text-slate-500">Digite a porção real quando medir. O valor fica salvo neste navegador.</p></div>{badge(`${completedPortions}/${snapshot.portions.length} preenchidas`, completedPortions === snapshot.portions.length ? 'done' : 'revisar')}</div><Toolbar search={search} onSearch={setSearch} status="" onStatus={() => undefined} count={portions.length} statuses={[]} /><div className="overflow-x-auto"><table className="min-w-[1000px] w-full text-left text-sm"><thead className="bg-purple-950 text-xs uppercase text-white"><tr><th className="p-3">Complemento</th><th className="p-3">Venda</th><th className="p-3">Compra</th><th className="p-3">Pacote</th><th className="p-3">Porção real</th><th className="p-3">Custo da porção</th><th className="p-3">Estado</th></tr></thead><tbody>{portions.map(item => { const portion = Number(answers.portions[item.id]) || 0; const cost = item.inputPrice && item.packQuantity && portion > 0 ? item.inputPrice / item.packQuantity * portion : null; return <tr key={item.id} className="border-t align-top"><td className="p-3"><strong>{item.complement}</strong><div className="max-w-xs text-xs text-slate-500">{item.menuType}</div></td><td className="p-3">{item.addonPrice === null ? '—' : money.format(item.addonPrice)}</td><td className="p-3">{item.inputPrice === null ? '—' : money.format(item.inputPrice)}</td><td className="p-3">{item.packQuantity === null ? '—' : `${number.format(item.packQuantity)} ${item.unit}`}</td><td className="p-3"><div className="flex items-center gap-2"><input type="number" min="0" step="0.1" value={answers.portions[item.id] ?? ''} onChange={event => setPortionAnswer(item.id, event.target.value)} className="w-24 rounded-lg border border-slate-300 px-3 py-2" /><span>{item.unit}</span></div></td><td className="p-3 font-black text-purple-800">{cost === null ? '—' : money.format(cost)}</td><td className="p-3">{badge(portion > 0 ? 'Preenchido' : 'Pendente', portion > 0 ? 'done' : 'revisar')}</td></tr>; })}</tbody></table></div></section>}

        {tab === 'components' && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-black text-slate-800">Componentes detalhados</h2><p className="mb-4 mt-1 text-sm text-slate-500">Linhas que formam as fichas, com quantidade, custo e evidência.</p><Toolbar search={search} onSearch={value => { setSearch(value); setComponentPage(1); }} status={status} onStatus={value => { setStatus(value); setComponentPage(1); }} count={components.length} statuses={[{ value: 'confirmed', label: 'Confirmados' }, { value: 'provisional', label: 'Provisórios' }]} /><div className="overflow-x-auto"><table className="min-w-[1100px] w-full text-left text-sm"><thead className="bg-purple-950 text-xs uppercase text-white"><tr><th className="p-3">Produto</th><th className="p-3">Ingrediente</th><th className="p-3">Quantidade</th><th className="p-3">Custo unitário</th><th className="p-3">Custo na ficha</th><th className="p-3">Estado</th><th className="p-3">Fonte</th></tr></thead><tbody>{pagedComponents.map(item => <tr key={item.id} className="border-t align-top"><td className="p-3"><strong>{item.product}</strong><div className="text-xs text-slate-500">{item.variant}</div></td><td className="p-3 font-bold">{item.ingredient}</td><td className="p-3">{item.quantity === null ? '—' : number.format(item.quantity)} {item.unit}</td><td className="p-3">{item.unitCost === null ? '—' : money.format(item.unitCost)}</td><td className="p-3 font-black">{item.totalCost === null ? '—' : money.format(item.totalCost)}</td><td className="p-3">{badge(item.status, item.status)}</td><td className="max-w-sm p-3 text-xs text-slate-600">{item.source}</td></tr>)}</tbody></table></div><div className="mt-4 flex items-center justify-between"><button disabled={componentPage === 1} onClick={() => setComponentPage(page => page - 1)} className="rounded-lg border px-4 py-2 text-sm font-bold disabled:opacity-40">Anterior</button><span className="text-sm font-bold text-slate-500">Página {componentPage} de {Math.max(1, Math.ceil(components.length / PAGE_SIZE))}</span><button disabled={componentPage >= Math.ceil(components.length / PAGE_SIZE)} onClick={() => setComponentPage(page => page + 1)} className="rounded-lg border px-4 py-2 text-sm font-bold disabled:opacity-40">Próxima</button></div></section>}

        {tab === 'pending' && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-black text-slate-800">Coleta e validações restantes</h2><p className="mb-4 mt-1 text-sm text-slate-500">As respostas iniciais vieram da ficha consolidada. Alterações ficam salvas neste navegador.</p></div>{badge(`${completedCollection}/${snapshot.collection.length} preenchidas`, completedCollection === snapshot.collection.length ? 'done' : 'revisar')}</div><Toolbar search={search} onSearch={setSearch} status={status} onStatus={setStatus} count={pending.length} statuses={[{ value: 'done', label: 'Preenchidos' }, { value: 'pending', label: 'Sem resposta' }]} /><div className="space-y-4">{pending.map(item => { const answer = answers.collection[item.id] || ''; return <article key={item.id} className={`grid gap-4 rounded-2xl border p-4 lg:grid-cols-[80px_1.2fr_1fr_1fr] ${String(answer).trim() ? 'border-emerald-200 bg-emerald-50/30' : 'border-amber-300 bg-amber-50/40'}`}><div><p className="text-lg font-black text-purple-900">{item.id}</p><p className="text-xs text-slate-500">Lote {item.lot} · P{item.priority}</p>{badge(String(answer).trim() ? 'Preenchido' : 'Pendente', String(answer).trim() ? 'done' : 'revisar')}</div><div><h3 className="font-black text-slate-800">{item.field}</h3><p className="mt-2 text-sm text-slate-600"><strong>Referência atual:</strong> {item.current}</p><p className="mt-1 text-xs text-slate-500">Impacto: {item.impact}</p></div><div><label className="text-xs font-black uppercase text-slate-500">Resposta real</label><textarea value={answer} onChange={event => setCollectionAnswer(item.id, event.target.value)} rows={4} className="mt-2 w-full rounded-xl border border-amber-300 bg-white p-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100" placeholder="Informe a medição ou observação" /></div><div><p className="text-xs font-black uppercase text-slate-500">Como comprovar</p><p className="mt-2 text-sm text-slate-600">{item.proof}</p></div></article>; })}</div></section>}
    </div>;
}
