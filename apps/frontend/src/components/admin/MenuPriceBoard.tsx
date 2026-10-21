'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowDownToLine, Check, ChevronDown, Pencil, Search, SlidersHorizontal, X } from 'lucide-react';
import snapshot from '@/data/xacai-pricing-snapshot.json';
import { buildMenuPrices, menuPricesCsv, parseMenuPrice, priceMoney, priceStatusLabels, type MenuPriceRow } from '@/lib/menu-prices';

const rows = buildMenuPrices(snapshot);
const categories = [...new Set(rows.map(row => row.category))];
const tones = { approved: 'bg-emerald-50 text-emerald-800 ring-emerald-200', proposed: 'bg-amber-50 text-amber-900 ring-amber-200', legacy: 'bg-slate-100 text-slate-600 ring-slate-200', draft: 'bg-violet-100 text-violet-800 ring-violet-200' };
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const emptyDrafts: Record<string, string> = {};

function download(name: string, content: string, type: string) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement('a');
    link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url);
}

export default function MenuPriceBoard() {
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [filter, setFilter] = useState('all');
    const [drafts, setDrafts] = useState<Record<string, string>>(emptyDrafts);
    const [savedDrafts, setSavedDrafts] = useState<Record<string, string>>(emptyDrafts);
    const [storageKey, setStorageKey] = useState('');
    const [editing, setEditing] = useState<string | null>(null);
    const [input, setInput] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        let active = true;
        queueMicrotask(() => {
            if (!active) return;
            try {
                const key = `xacai-menu-price-drafts-v1:${localStorage.getItem('admin_slug') || 'default'}`;
                const stored: unknown = JSON.parse(localStorage.getItem(key) || '{}');
                const values: Record<string, string> = {};
                if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
                    for (const [id, value] of Object.entries(stored)) {
                        if (rows.some(row => row.id === id) && typeof value === 'string' && parseMenuPrice(value) !== null) values[id] = value;
                    }
                }
                setStorageKey(key); setDrafts(values); setSavedDrafts(values);
            } catch { setError('Não foi possível ler os rascunhos deste navegador. Você pode revisar e baixar a tabela.'); }
        });
        return () => { active = false; };
    }, []);

    const editedCount = Object.keys(drafts).length;
    const unsaved = JSON.stringify(drafts) !== JSON.stringify(savedDrafts);
    const approvedCount = rows.filter(row => row.status === 'approved').length;
    const visible = useMemo(() => rows.filter(row =>
        (!category || row.category === category) &&
        (!search || normalize(`${row.name} ${row.size} ${row.id}`).includes(normalize(search))) &&
        (filter === 'all' || (filter === 'draft' ? Object.hasOwn(drafts, row.id) : row.status === filter))
    ), [category, search, filter, drafts]);

    const save = () => {
        try {
            if (!storageKey) throw new Error();
            localStorage.setItem(storageKey, JSON.stringify(drafts));
            setSavedDrafts({ ...drafts }); setMessage('Rascunho salvo neste navegador. Baixe uma cópia para guardar ou compartilhar.');
        } catch { setError('Não foi possível salvar neste navegador. Use Baixar tabela para preservar sua revisão.'); }
    };
    const applyEdit = (row: MenuPriceRow) => {
        const price = parseMenuPrice(input);
        if (price === null) { setError('Informe um preço maior que zero, com até duas casas decimais.'); return; }
        setDrafts(current => {
            const next = { ...current };
            if (price === row.price) delete next[row.id]; else next[row.id] = price.toFixed(2);
            return next;
        });
        setError(''); setEditing(null); setMessage('Preço adicionado à revisão. Salve o rascunho para manter a alteração.');
    };

    return <section className="overflow-hidden rounded-3xl border border-[#e5dfeb] bg-[#faf9f6] shadow-sm" aria-label="Tabela completa de preços">
        <div className="relative overflow-hidden bg-[#24112d] px-5 py-7 text-white md:px-8 md:py-9">
            <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border-[36px] border-[#563064]/40" />
            <div className="relative flex flex-wrap items-start justify-between gap-5">
                <div><div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#c5e96b]"><span className="h-1.5 w-1.5 rounded-full bg-[#c5e96b]" />Seu cardápio, preço por preço</div><h2 className="max-w-xl text-3xl font-black tracking-tight md:text-4xl">Tudo na mesa.<br /><span className="text-[#d7c4e8]">Você escolhe o próximo ajuste.</span></h2><p className="mt-3 max-w-lg text-sm leading-relaxed text-[#d7c8df]">Todos os produtos e adicionais, com o histórico ao lado. Revise os valores e monte a próxima versão do seu cardápio.</p></div>
                <div className="flex flex-wrap gap-2"><button onClick={() => download('Cardapio_X-Acai_Revisao.csv', menuPricesCsv(rows, drafts), 'text/csv;charset=utf-8')} className="inline-flex items-center gap-2 rounded-xl bg-[#c5e96b] px-4 py-3 text-sm font-extrabold text-[#24112d] transition hover:bg-[#d7f18f]"><ArrowDownToLine size={16} />Baixar tabela</button><button onClick={() => download('Precos_X-Acai_Rascunho.json', JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), sourceDate: snapshot.asOf, drafts, prices: rows }, null, 2), 'application/json')} className="rounded-xl border border-white/25 px-4 py-3 text-sm font-bold hover:bg-white/10">Cópia dos rascunhos</button></div>
            </div>
            <div className="relative mt-7 grid grid-cols-2 gap-3 md:grid-cols-4">{[
                [String(snapshot.products.length), 'produtos do cardápio'], [String(snapshot.portions.length), 'adicionais'], [String(approvedCount), 'preços aprovados'], [String(editedCount), 'ajustes no rascunho']
            ].map(([value, label]) => <div key={label} className="border-l border-white/20 pl-3"><p className="text-2xl font-black tabular-nums">{value}</p><p className="mt-1 text-xs text-[#d7c8df]">{label}</p></div>)}</div>
        </div>

        <div className="border-b border-[#e5dfeb] bg-white px-5 py-4 md:px-8"><p className="text-sm leading-relaxed text-slate-600"><strong className="text-[#452353]">Takeat / presencial.</strong> Aprovados entram com o valor decidido. Recomendados aguardam sua revisão; valores antigos continuam identificados. Edições ficam como rascunho neste navegador e podem ser exportadas. O cardápio de venda não é alterado por esta tela.</p></div>

        <div className="p-4 md:p-7">
            <div className="mb-5 flex flex-col gap-3 lg:flex-row"><label className="relative min-w-0 flex-1"><Search className="absolute left-3 top-3.5 text-slate-400" size={18} /><span className="sr-only">Buscar produto ou adicional</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar Paçoleite, 700 ml, Nutella…" className="w-full rounded-xl border border-[#ded7e3] bg-white py-3 pl-10 pr-3 text-sm outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100" /></label><label className="relative"><span className="sr-only">Categoria</span><select value={category} onChange={event => setCategory(event.target.value)} className="w-full appearance-none rounded-xl border border-[#ded7e3] bg-white py-3 pl-4 pr-10 text-sm font-semibold lg:w-56"><option value="">Todas as categorias</option>{categories.map(value => <option key={value}>{value}</option>)}</select><ChevronDown size={15} className="pointer-events-none absolute right-3 top-4 text-slate-400" /></label></div>
            <div className="mb-5 flex flex-wrap items-center gap-2"><SlidersHorizontal size={15} className="mr-1 text-slate-400" />{[
                ['all', 'Todos'], ['approved', 'Aprovados'], ['proposed', 'Recomendados'], ['legacy', 'Antigos · revisar'], ['draft', 'Meus ajustes']
            ].map(([value, label]) => <button key={value} onClick={() => setFilter(value)} aria-pressed={filter === value} className={`rounded-full border px-3.5 py-2 text-xs font-bold transition ${filter === value ? 'border-[#452353] bg-[#452353] text-white' : 'border-[#e0dbe5] bg-white text-slate-600 hover:border-purple-400'}`}>{label}</button>)}<span className="ml-auto text-xs text-slate-500">{visible.length} de {rows.length} itens</span></div>

            {error && <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
            {message && <div role="status" className="mb-4 rounded-xl border border-purple-200 bg-purple-50 p-3 text-sm text-purple-900">{message}</div>}

            <div className="overflow-hidden rounded-2xl border border-[#e4dfe8] bg-white"><div className="hidden grid-cols-[minmax(220px,2fr)_100px_120px_150px_150px] gap-3 bg-[#eee9f1] px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-[#75617e] xl:grid"><span>Produto / adicional</span><span>Tamanho</span><span>Antigo</span><span>Preço em revisão</span><span>Situação</span></div>
                {visible.length === 0 && <div className="px-5 py-16 text-center"><Search className="mx-auto mb-3 text-purple-300" /><h3 className="font-bold text-[#452353]">Nenhum item encontrado</h3><p className="mt-1 text-sm text-slate-500">Tente outro nome ou remova os filtros.</p><button onClick={() => { setSearch(''); setCategory(''); setFilter('all'); }} className="mt-4 rounded-lg bg-purple-100 px-4 py-2 text-sm font-bold text-purple-900">Limpar filtros</button></div>}
                {visible.map(row => {
                    const edited = Object.hasOwn(drafts, row.id);
                    const value = edited ? parseMenuPrice(drafts[row.id]) : row.price;
                    const difference = value !== null && row.legacyPrice !== null ? Math.round((value - row.legacyPrice) * 100) / 100 : null;
                    return <article key={row.id} data-price-row={row.id} className="grid gap-3 border-t border-[#f0ecf3] p-4 first:border-t-0 hover:bg-[#fcfafc] sm:grid-cols-2 xl:grid-cols-[minmax(220px,2fr)_100px_120px_150px_150px] xl:items-center xl:px-5">
                        <div><h3 className="text-sm font-extrabold text-[#33203d]">{row.name.replace(/^Açaí /, '')}</h3><p className="mt-1 text-[11px] text-slate-400">{row.category}{row.name === 'Kiwi' ? ' · pausado' : ''}</p></div><p className="text-xs font-semibold text-slate-500">{row.size}</p>
                        <div className="text-sm tabular-nums text-slate-400"><span className="mr-2 text-[10px] uppercase xl:hidden">Antigo</span>{priceMoney(row.legacyPrice)}</div>
                        <div>{editing === row.id ? <form onSubmit={event => { event.preventDefault(); applyEdit(row); }} className="flex items-center gap-1"><label className="sr-only" htmlFor={`price-${row.id}`}>Novo preço de {row.name} {row.size}</label><input id={`price-${row.id}`} autoFocus inputMode="decimal" value={input} onChange={event => setInput(event.target.value)} className="w-24 rounded-lg border border-purple-400 bg-white px-2 py-2 text-sm outline-none ring-2 ring-purple-100" /><button type="submit" aria-label={`Confirmar preço de ${row.id}`} className="rounded-lg bg-purple-800 p-2 text-white"><Check size={15} /></button><button type="button" onClick={() => { setEditing(null); setError(''); }} aria-label="Cancelar edição" className="rounded-lg p-2 text-slate-500"><X size={15} /></button></form> : <button onClick={() => { setEditing(row.id); setInput(value === null ? '' : value.toFixed(2).replace('.', ',')); setError(''); }} aria-label={`Editar ${row.name} ${row.size}`} className="group flex items-center gap-2 rounded-lg border border-transparent py-1.5 pr-2 text-left hover:border-purple-200 hover:bg-purple-50"><strong className="text-lg font-black tabular-nums text-[#452353]">{priceMoney(value)}</strong><Pencil size={12} className="text-purple-400 opacity-60 group-hover:opacity-100" /></button>}{difference !== null && difference !== 0 && <p className="text-[10px] text-slate-400">{difference > 0 ? '+' : '−'}{priceMoney(Math.abs(difference))} vs. antigo</p>}</div>
                        <div><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold ring-1 ring-inset ${tones[edited ? 'draft' : row.status]}`}>{edited ? 'Rascunho editado' : priceStatusLabels[row.status]}</span>{edited && <button onClick={() => setDrafts(current => { const next = { ...current }; delete next[row.id]; return next; })} className="mt-2 block text-[10px] font-semibold text-purple-700 underline underline-offset-2">Restaurar base</button>}</div>
                    </article>;
                })}
            </div>
            <div className="sticky bottom-3 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dcd1e3] bg-white/95 px-4 py-3 shadow-lg backdrop-blur"><div><p className="text-sm font-bold text-[#452353]">{unsaved ? 'Você tem ajustes para salvar' : editedCount ? 'Seu rascunho está salvo' : 'Sua base está pronta para revisar'}</p><p className="mt-0.5 text-[11px] text-slate-500">Salvar mantém os ajustes neste navegador. Baixar tabela cria uma cópia com todos os itens.</p></div><button disabled={!unsaved || !storageKey} onClick={save} className="rounded-xl bg-[#452353] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#653276] disabled:cursor-default disabled:bg-slate-100 disabled:text-slate-400">Salvar rascunho</button></div>
        </div>
    </section>;
}
