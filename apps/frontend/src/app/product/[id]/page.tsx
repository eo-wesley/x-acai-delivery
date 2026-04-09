'use client';

import { useEffect, useMemo, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useCart, buildCartKey, SelectedOption } from '../../../components/CartContext';
import { useTenant, getApiBase } from '../../../hooks/useTenant';

interface OptionItem {
    id: string;
    name: string;
    price_cents: number;
    sort_order: number;
    available: number;
}

interface OptionGroup {
    id: string;
    name: string;
    required: number;
    min_select: number;
    max_select: number;
    sort_order: number;
    options: OptionItem[];
}

interface Product {
    id: string;
    name: string;
    description?: string;
    price_cents: number;
    category?: string;
    image_url?: string;
    option_groups: OptionGroup[];
}

const formatOptionPrice = (cents: number) =>
    cents === 0 ? 'gratis' : `+R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;

const formatCurrency = (cents: number) =>
    `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;

function buildGroupLabel(group: OptionGroup) {
    const required = Boolean(group.required);
    const minSelect = Number(group.min_select || 0);
    const maxSelect = Number(group.max_select || 0);

    if (maxSelect === 99) {
        return minSelect > 0 ? `Escolha no minimo ${minSelect}` : 'Multipla escolha';
    }

    if (minSelect > 0 && minSelect === maxSelect) {
        return `Escolha ${minSelect}`;
    }

    if (minSelect > 0 && maxSelect > minSelect) {
        return `Escolha entre ${minSelect} e ${maxSelect}`;
    }

    if (required && minSelect > 0) {
        return `Escolha no minimo ${minSelect}`;
    }

    if (maxSelect > 1) {
        return `Escolha ate ${maxSelect}`;
    }

    return maxSelect === 1 ? 'Escolha 1' : 'Opcional';
}

function GroupSelector({
    group,
    selected,
    onChange,
}: {
    group: OptionGroup;
    selected: string[];
    onChange: (optionIds: string[]) => void;
}) {
    const required = Boolean(group.required);
    const minSelect = Number(group.min_select || 0);
    const maxSelect = Number(group.max_select || 0);
    const isSingle = maxSelect === 1;
    const allowUnlimited = maxSelect === 99;
    const selectionCount = selected.length;
    const limitReached = !allowUnlimited && maxSelect > 0 && selectionCount >= maxSelect;
    const isComplete = !required || selectionCount >= minSelect;

    const toggle = (optId: string) => {
        if (isSingle) {
            if (selected.includes(optId) && !required && minSelect === 0) {
                onChange([]);
                return;
            }

            onChange([optId]);
            return;
        }

        if (selected.includes(optId)) {
            onChange(selected.filter(id => id !== optId));
            return;
        }

        if (!limitReached) {
            onChange([...selected, optId]);
        }
    };

    return (
        <section
            className={`overflow-hidden rounded-3xl border-2 bg-white shadow-sm ${
                required && !isComplete ? 'border-orange-300' : 'border-gray-100'
            }`}
        >
            <div className={`flex items-start justify-between gap-4 px-4 py-4 ${required ? 'bg-gray-50' : 'bg-white'}`}>
                <div>
                    <p className="text-base font-black text-gray-900">{group.name}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                        <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${
                                required ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
                            }`}
                        >
                            {required ? 'Obrigatorio' : 'Opcional'}
                        </span>
                        <span className="rounded-full bg-purple-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-purple-700">
                            {buildGroupLabel(group)}
                        </span>
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-gray-500">
                            {selectionCount} selecionado{selectionCount === 1 ? '' : 's'}
                        </span>
                    </div>
                </div>

                {required ? (
                    <div
                        className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-black text-white ${
                            isComplete ? 'bg-green-500' : 'bg-orange-300'
                        }`}
                    >
                        {isComplete ? 'OK' : '!'}
                    </div>
                ) : null}
            </div>

            <div className="divide-y divide-gray-50">
                {group.options.map(opt => {
                    const isSelected = selected.includes(opt.id);
                    const disabled = !isSelected && limitReached;

                    return (
                        <button
                            key={opt.id}
                            type="button"
                            onClick={() => toggle(opt.id)}
                            disabled={disabled}
                            className={`flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition ${
                                isSelected
                                    ? 'bg-purple-50'
                                    : disabled
                                        ? 'cursor-not-allowed bg-white opacity-40'
                                        : 'bg-white hover:bg-gray-50'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className={`flex h-5 w-5 flex-shrink-0 items-center justify-center border-2 ${
                                        isSingle ? 'rounded-full' : 'rounded-md'
                                    } ${
                                        isSelected ? 'border-purple-600 bg-purple-600' : 'border-gray-300 bg-white'
                                    }`}
                                >
                                    {isSelected ? (
                                        <div
                                            className={`bg-white ${
                                                isSingle ? 'h-2 w-2 rounded-full' : 'flex h-3 w-3 items-center justify-center text-[9px] font-black'
                                            }`}
                                        >
                                            {isSingle ? '' : 'OK'}
                                        </div>
                                    ) : null}
                                </div>
                                <div>
                                    <p className={`text-sm font-semibold ${isSelected ? 'text-purple-700' : 'text-gray-800'}`}>
                                        {opt.name}
                                    </p>
                                </div>
                            </div>
                            <span className={`text-sm font-black ${opt.price_cents > 0 ? 'text-gray-700' : 'text-gray-400'}`}>
                                {formatOptionPrice(opt.price_cents)}
                            </span>
                        </button>
                    );
                })}
            </div>
        </section>
    );
}

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { addToCart } = useCart();
    const { slug, ready } = useTenant();

    const [product, setProduct] = useState<Product | null>(null);
    const [qty, setQty] = useState(1);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(true);
    const [added, setAdded] = useState(false);
    const [selections, setSelections] = useState<Record<string, string[]>>({});

    useEffect(() => {
        if (!ready) return;

        const API = getApiBase();

        fetch(`${API}/api/${slug}/menu/item/${id}`)
            .then(r => r.json())
            .then(data => {
                if (data && data.id) {
                    setProduct(data);
                    const initialSelections: Record<string, string[]> = {};
                    (data.option_groups || []).forEach((group: OptionGroup) => {
                        initialSelections[group.id] = [];
                    });
                    setSelections(initialSelections);
                    return;
                }

                return fetch(`${API}/api/${slug}/menu`)
                    .then(r => r.json())
                    .then(items => {
                        const found = (Array.isArray(items) ? items : []).find((item: Product) => item.id === id);
                        if (found) {
                            setProduct({ ...found, option_groups: [] });
                            setSelections({});
                        }
                    });
            })
            .catch(() => {
                // Leave fallback state handled below.
            })
            .finally(() => setLoading(false));
    }, [id, ready, slug]);

    const optionGroups = useMemo(() => {
        if (!product?.option_groups) return [];

        return [...product.option_groups]
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
            .map(group => ({
                ...group,
                options: [...(group.options || [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
            }));
    }, [product]);

    const validationErrors = useMemo(
        () =>
            optionGroups
                .filter(group => Boolean(group.required) && (selections[group.id] || []).length < Number(group.min_select || 0))
                .map(group => group.name),
        [optionGroups, selections],
    );

    const isValid = validationErrors.length === 0;

    const selectedOptions = useMemo<SelectedOption[]>(() => {
        return optionGroups.flatMap(group =>
            (selections[group.id] || []).map(optionId => {
                const option = group.options.find(item => item.id === optionId);
                if (!option) return null;

                return {
                    groupId: group.id,
                    groupName: group.name,
                    optionId: option.id,
                    optionName: option.name,
                    price_cents: option.price_cents,
                };
            }).filter(Boolean) as SelectedOption[],
        );
    }, [optionGroups, selections]);

    const modifierTotal = selectedOptions.reduce((sum, option) => sum + option.price_cents, 0);
    const totalPerItem = product ? product.price_cents + modifierTotal : 0;
    const totalWithQty = totalPerItem * qty;

    const handleGroupChange = (groupId: string, optionIds: string[]) => {
        setSelections(current => ({ ...current, [groupId]: optionIds }));
    };

    const handleAdd = () => {
        if (!product || !isValid) return;

        addToCart({
            cartKey: buildCartKey(product.id, selectedOptions),
            menuItemId: product.id,
            name: product.name,
            base_price_cents: product.price_cents,
            price_cents: totalPerItem,
            qty,
            notes: notes.trim() || undefined,
            selected_options: selectedOptions,
        });

        setAdded(true);
        setTimeout(() => {
            router.push('/');
        }, 900);
    };

    if (loading) {
        return (
            <div className="animate-pulse pb-32">
                <div className="h-60 w-full bg-purple-100" />
                <div className="space-y-4 p-5">
                    <div className="h-8 w-3/4 rounded-xl bg-gray-200" />
                    <div className="h-4 rounded-xl bg-gray-100" />
                    <div className="h-40 rounded-3xl bg-gray-100" />
                    <div className="h-52 rounded-3xl bg-gray-100" />
                </div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="mt-12 p-6 text-center">
                <div className="mb-4 text-5xl">?</div>
                <h2 className="text-xl font-black text-gray-800">Produto nao encontrado</h2>
                <button onClick={() => router.back()} className="mt-6 font-bold text-purple-600">
                    Voltar
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="relative mx-auto min-h-screen max-w-md bg-white pb-44 shadow-sm">
                <div className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 px-4 py-3 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-black text-gray-700 transition hover:bg-gray-200"
                        >
                            Voltar
                        </button>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-black text-gray-900">{product.name}</p>
                            <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">
                                {optionGroups.length > 0 ? 'Monte do seu jeito' : product.category || 'Cardapio'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-6 p-4">
                    <section className="overflow-hidden rounded-[28px] bg-purple-50 shadow-inner">
                        <div className="relative h-64 w-full bg-purple-50">
                            {product.image_url ? (
                                <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                            ) : (
                                <div className="flex h-full items-center justify-center text-6xl text-purple-200">Acai</div>
                            )}
                            <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-purple-700 shadow-sm">
                                {product.category || 'Produto'}
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <div>
                            <h1 className="text-3xl font-black leading-tight text-gray-900">{product.name}</h1>
                            <p className="mt-2 text-base leading-relaxed text-gray-500">
                                {product.description || 'Monte seu pedido com os complementos disponiveis abaixo.'}
                            </p>
                        </div>

                        <div className="rounded-3xl border border-purple-100 bg-purple-50 p-6">
                            <p className="text-xs font-black uppercase tracking-widest text-purple-400">Preco base</p>
                            <p className="mt-1 text-4xl font-black text-purple-700">{formatCurrency(product.price_cents)}</p>
                            {optionGroups.length > 0 ? (
                                <p className="mt-3 text-sm font-medium text-purple-700/80">
                                    Todos os acompanhamentos e adicionais estao nesta tela.
                                </p>
                            ) : null}
                        </div>
                    </section>

                    {optionGroups.length > 0 ? (
                        <section className="space-y-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-black text-gray-900">Complementos e adicionais</h2>
                                    <p className="text-sm text-gray-500">Selecione tudo o que quiser antes de adicionar ao carrinho.</p>
                                </div>
                                <div className="rounded-2xl bg-gray-100 px-3 py-2 text-right">
                                    <p className="text-[11px] font-black uppercase tracking-wide text-gray-400">Selecionados</p>
                                    <p className="text-sm font-black text-gray-700">{selectedOptions.length}</p>
                                </div>
                            </div>

                            {optionGroups.map(group => (
                                <GroupSelector
                                    key={group.id}
                                    group={group}
                                    selected={selections[group.id] || []}
                                    onChange={optionIds => handleGroupChange(group.id, optionIds)}
                                />
                            ))}
                        </section>
                    ) : null}

                    <section className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
                        <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">
                            Observacoes
                        </label>
                        <textarea
                            rows={3}
                            value={notes}
                            onChange={event => setNotes(event.target.value)}
                            placeholder="Ex: sem talheres, guardanapo extra..."
                            className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 p-3 text-sm outline-none transition focus:border-purple-500"
                        />
                    </section>

                    <section className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-xs font-black uppercase tracking-widest text-gray-400">Quantidade</p>
                                <p className="mt-1 text-sm text-gray-500">Ajuste quantas unidades deseja pedir.</p>
                            </div>
                            <div className="flex items-center rounded-2xl bg-gray-100 p-1 px-2">
                                <button
                                    type="button"
                                    onClick={() => setQty(Math.max(1, qty - 1))}
                                    className="h-9 w-9 text-lg font-black text-gray-500"
                                >
                                    -
                                </button>
                                <span className="w-8 text-center text-sm font-black text-gray-800">{qty}</span>
                                <button
                                    type="button"
                                    onClick={() => setQty(qty + 1)}
                                    className="h-9 w-9 text-lg font-black text-purple-600"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    </section>

                    <section className="rounded-3xl border border-gray-100 bg-gray-50 p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-black uppercase tracking-widest text-gray-400">Resumo</p>
                                <p className="mt-2 text-sm font-semibold text-gray-700">
                                    Base: {formatCurrency(product.price_cents)}
                                </p>
                                <p className="mt-1 text-sm font-semibold text-gray-700">
                                    Adicionais: {formatCurrency(modifierTotal)}
                                </p>
                                <p className="mt-1 text-sm font-semibold text-gray-700">
                                    Total por unidade: {formatCurrency(totalPerItem)}
                                </p>
                            </div>
                            <div className="rounded-2xl bg-white px-4 py-3 text-right shadow-sm">
                                <p className="text-xs font-black uppercase tracking-widest text-gray-400">Total</p>
                                <p className="mt-1 text-xl font-black text-purple-700">{formatCurrency(totalWithQty)}</p>
                            </div>
                        </div>
                    </section>

                    {validationErrors.length > 0 ? (
                        <section className="rounded-3xl border border-orange-200 bg-orange-50 p-4 text-orange-900 shadow-sm">
                            <p className="text-xs font-black uppercase tracking-widest">Faltam selecoes obrigatorias</p>
                            <p className="mt-2 text-sm font-medium">
                                Complete estes grupos antes de adicionar ao carrinho:
                            </p>
                            <p className="mt-2 text-sm font-black">{validationErrors.join(' | ')}</p>
                        </section>
                    ) : null}
                </div>

                <div className="fixed bottom-0 left-1/2 z-50 w-full max-w-md -translate-x-1/2 border-t border-gray-100 bg-white p-4 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
                    <button
                        id="add-to-cart-btn"
                        type="button"
                        onClick={handleAdd}
                        disabled={!isValid || added}
                        className={`flex w-full items-center justify-between rounded-2xl px-6 py-4 text-base font-black transition ${
                            added
                                ? 'bg-green-500 text-white'
                                : !isValid
                                    ? 'bg-gray-100 text-gray-400'
                                    : 'bg-purple-600 text-white shadow-lg shadow-purple-200'
                        }`}
                    >
                        {added ? (
                            <span>Adicionado ao carrinho</span>
                        ) : (
                            <>
                                <span>Adicionar ao carrinho</span>
                                <span>{formatCurrency(totalWithQty)}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
