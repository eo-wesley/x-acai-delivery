'use client';

import { useEffect, useMemo, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useCart, buildCartKey, SelectedOption } from '../../../components/CartContext';
import { useTenant, getApiBase } from '../../../hooks/useTenant';
import { buildPromotionOptionGroups } from '../../../lib/promotion-options';

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

const COMPLEMENT_OPTIONS = [
    'Amendoim Torrado Granulado', 'Aveia', 'Banana', 'Bis',
    'Cereal Ball Chocolate', 'Cereal Ball Mesclado', 'Cobertura De Caramelo',
    'Cobertura De Chocolate', 'Cobertura De Morango', 'Cobertura Fini Bananas',
    'Cobertura Fini Beijos', 'Cobertura Fini Dentaduras', 'Confete',
    'Gotas De Chocolate', 'Granola', 'Granulado Brigadeiro', 'Granulado Colorido',
    'Kiwi', 'Leite Condensado', 'Leite Em Pó', 'Morango', 'Ovomaltine',
    'Ouro Branco', 'Paçoca',
];

const ADDITIONAL_OPTIONS = [
    ['Amendoim Torrado Granulado', 400], ['Aveia', 400], ['Banana', 400], ['Bis', 400],
    ['Cereal Ball Chocolate', 400], ['Cereal Ball Mesclado', 400], ['Cobertura De Caramelo', 400],
    ['Cobertura De Chocolate', 400], ['Cobertura De Morango', 400], ['Cobertura Fini Bananas', 400],
    ['Cobertura Fini Beijos', 400], ['Cobertura Fini Dentaduras', 400], ['Confete', 400],
    ['Creme De Amendoim', 600], ['Creme De Avelã', 600], ['Creme De Bueno', 600],
    ['Creme De Bombom', 600], ['Creme De Leitinho', 600], ['Creme De Morango', 600],
    ['Gotas De Chocolate', 500], ['Granola', 400], ['Granulado Brigadeiro', 400],
    ['Granulado Colorido', 400], ['Kit-Kat', 600], ['Kiwi', 500], ['Leite Condensado', 400],
    ['Leite Em Pó', 400], ['Morango', 500], ['Nutella', 1000], ['Ovomaltine', 500],
    ['Ouro Branco', 400], ['Paçoca', 400],
] as const;

const BEVERAGE_OPTIONS = [
    ['Água Mineral Crystal com Gás 500ml', 700],
    ['Água Mineral Crystal Sem Gás 500ml', 600],
    ['Coca-Cola 350ml', 1000],
    ['Pepsi 350ml', 1000],
] as const;

function fallbackId(scope: string, value: string) {
    return `fallback-${scope}-${value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

function fallbackOptions(scope: string, values: readonly (readonly [string, number])[] | string[]): OptionItem[] {
    return values.map((value, index) => {
        const name = Array.isArray(value) ? value[0] : value;
        const price_cents = Array.isArray(value) ? value[1] : 0;
        return { id: fallbackId(scope, name), name, price_cents, sort_order: index, available: 1 };
    });
}

function normalizeOptionLabel(value: string) {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isMonteSeu(product: Pick<Product, 'name' | 'category'>) {
    return normalizeOptionLabel(product.category || '').includes('monte') || /\d+\s*complementos/i.test(product.name);
}

function buildFallbackOptionGroups(product: Pick<Product, 'id' | 'name' | 'category'>): OptionGroup[] {
    const promotionGroups = buildPromotionOptionGroups(product);
    if (promotionGroups.length > 0) return promotionGroups;
    const category = (product.category || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const name = product.name || '';
    const normalizedName = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const scope = product.id;
    const beverageGroup: OptionGroup = {
        id: fallbackId(scope, 'bebida'),
        name: 'Vai uma Bebida?',
        required: 0,
        min_select: 0,
        max_select: 1,
        sort_order: 10,
        options: fallbackOptions(`${scope}-bebida`, BEVERAGE_OPTIONS),
    };

    if (isMonteSeu(product)) {
        const freeCount = Number(name.match(/(\d+)\s*complementos/i)?.[1] || 0);
        const placement = normalizedName.includes('marmitex')
            ? 'Dentro Da Marmitex'
            : normalizedName.includes('barca')
                ? 'Dentro Da Barca'
                : normalizedName.includes('roleta')
                    ? 'Dentro Da Roleta'
                    : 'Dentro Do Copo';

        return [
            {
                id: fallbackId(scope, 'massa'),
                name: 'Vai o quê?',
                required: 1,
                min_select: 1,
                max_select: 1,
                sort_order: 0,
                // Vídeo do Monte o Seu: 00:24 / 01:18, cupuaçu +R$5,00.
                options: fallbackOptions(`${scope}-massa`, [['Açaí', 0], ['Cupuaçu', 500]]),
            },
            {
                id: fallbackId(scope, 'onde-vai'),
                name: 'Onde vai?',
                required: 1,
                min_select: 1,
                max_select: 1,
                sort_order: 1,
                options: fallbackOptions(`${scope}-onde`, [[placement, 0], ['Itens Separados', 500]]),
            },
            {
                id: fallbackId(scope, 'complementos'),
                name: `Complementos (escolha ${freeCount})`,
                required: 1,
                min_select: freeCount,
                max_select: freeCount,
                sort_order: 2,
                options: fallbackOptions(`${scope}-complementos`, COMPLEMENT_OPTIONS),
            },
            {
                id: fallbackId(scope, 'adicionais'),
                name: 'Adicionais pagos',
                required: 0,
                min_select: 0,
                max_select: 99,
                sort_order: 3,
                options: fallbackOptions(`${scope}-adicionais`, ADDITIONAL_OPTIONS),
            },
            beverageGroup,
            {
                id: fallbackId(scope, 'colher'),
                name: 'Colher',
                required: 1,
                min_select: 1,
                max_select: 1,
                sort_order: /barca\s+m\b/.test(normalizedName) ? 4 : 20,
                options: fallbackOptions(`${scope}-colher`, [['Sim', 0], ['Não', 0]]),
            },
        ];
    }

    if (category.includes('combo') || normalizedName.includes('escolha 2')) {
        return [
            {
                id: fallbackId(scope, 'copos'),
                name: 'Escolha seus 2 Copos',
                required: 1,
                min_select: 2,
                max_select: 2,
                sort_order: 0,
                options: fallbackOptions(`${scope}-copos`, [
                    ['Açaí X-King Paçoca', 0], ['Açaí X-Splash', 0],
                    ['Açaí X-Tradicional', 0], ['Açaí X-Paçoleite', 0],
                ]),
            },
            beverageGroup,
            {
                id: fallbackId(scope, 'colher'),
                name: 'Colher',
                required: 1,
                min_select: 1,
                max_select: 1,
                sort_order: 20,
                options: fallbackOptions(`${scope}-colher`, [['Sim', 0], ['Não', 0]]),
            },
        ];
    }

    return [];
}

function resolveProductOptionGroups(product: Pick<Product, 'id' | 'name' | 'category'> & { option_groups?: OptionGroup[] }): OptionGroup[] {
    const groups = product.option_groups;
    if (!groups?.length) return buildFallbackOptionGroups(product);
    if (!isMonteSeu(product)) return groups;

    // Algumas versões importadas já têm acompanhamentos, mas omitem a massa
    // ou a colher. Completar apenas os dois grupos ausentes preserva os IDs,
    // preços, opções e limites dos grupos que já vieram do cadastro.
    const hasMass = groups.some(group => {
        const label = normalizeOptionLabel(group.name);
        return label.includes('massa') || label.includes('base') || label === 'vaioque'
            || (group.options.some(option => normalizeOptionLabel(option.name) === 'acai')
                && group.options.some(option => normalizeOptionLabel(option.name) === 'cupuacu'));
    });
    const hasSpoon = groups.some(group => /colher|talher/.test(normalizeOptionLabel(group.name)));
    if (hasMass && hasSpoon) return groups;

    const fallback = buildFallbackOptionGroups(product);
    const firstOrder = Math.min(...groups.map(group => group.sort_order ?? 0));
    const lastOrder = Math.max(...groups.map(group => group.sort_order ?? 0));
    const beverage = groups.find(group => normalizeOptionLabel(group.name).includes('bebida'));
    const spoonOrder = /barca\s+m\b/i.test(product.name) && beverage
        ? (beverage.sort_order ?? 0) - 0.5
        : lastOrder + 1;
    return [
        ...(!hasMass ? [{ ...fallback[0], sort_order: firstOrder - 1 }] : []),
        ...groups,
        ...(!hasSpoon ? [{ ...fallback[fallback.length - 1], sort_order: spoonOrder }] : []),
    ];
}

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
    const selectedCounts = selected.reduce<Record<string, number>>((acc, optionId) => {
        acc[optionId] = (acc[optionId] || 0) + 1;
        return acc;
    }, {});

    const toggleSingle = (optId: string) => {
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

    const incrementOption = (optId: string) => {
        if (isSingle) {
            toggleSingle(optId);
            return;
        }

        if (!allowUnlimited && maxSelect > 0 && selectionCount >= maxSelect) return;
        onChange([...selected, optId]);
    };

    const decrementOption = (optId: string) => {
        const lastIndex = selected.lastIndexOf(optId);
        if (lastIndex === -1) return;

        const nextSelections = [...selected];
        nextSelections.splice(lastIndex, 1);
        onChange(nextSelections);
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

            <div className="divide-y divide-gray-50" role={isSingle ? 'radiogroup' : 'group'} aria-label={group.name}>
                {group.options.map(opt => {
                    const optionCount = selectedCounts[opt.id] || 0;
                    const isSelected = optionCount > 0;
                    const disabled = !isSingle && !isSelected && limitReached;
                    const canIncrement = allowUnlimited || maxSelect <= 0 || selectionCount < maxSelect;

                    if (isSingle) {
                        return (
                            <button
                                key={opt.id}
                                type="button"
                                role="radio"
                                aria-checked={isSelected}
                                onClick={() => toggleSingle(opt.id)}
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
                                        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                                            isSelected ? 'border-purple-600 bg-purple-600' : 'border-gray-300 bg-white'
                                        }`}
                                    >
                                        {isSelected ? <div className="h-2 w-2 rounded-full bg-white" /> : null}
                                    </div>
                                    <div>
                                        <p className={`text-sm font-semibold ${isSelected ? 'text-purple-700' : 'text-gray-800'}`}>
                                            {opt.name}
                                        </p>
                                    </div>
                                </div>
                                <span className={`shrink-0 whitespace-nowrap text-sm font-black ${opt.price_cents > 0 ? 'text-gray-700' : 'text-gray-400'}`}>
                                    {opt.price_cents === 0 && /tamanho/i.test(group.name) ? 'Incluso' : formatOptionPrice(opt.price_cents)}
                                </span>
                            </button>
                        );
                    }

                    return (
                        <div
                            key={opt.id}
                            className={`flex items-center justify-between gap-4 px-4 py-3 transition ${
                                isSelected ? 'bg-purple-50' : disabled ? 'bg-white opacity-70' : 'bg-white'
                            }`}
                        >
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`flex h-6 min-w-6 items-center justify-center rounded-md border-2 px-1 text-[11px] font-black ${
                                            isSelected
                                                ? 'border-purple-600 bg-purple-600 text-white'
                                                : 'border-gray-300 bg-white text-gray-400'
                                        }`}
                                    >
                                        {optionCount > 0 ? optionCount : '+'}
                                    </div>
                                    <div className="min-w-0">
                                        <p className={`break-words text-sm font-semibold ${isSelected ? 'text-purple-700' : 'text-gray-800'}`}>
                                            {opt.name}
                                        </p>
                                        <p className={`mt-1 text-sm font-black ${opt.price_cents > 0 ? 'text-gray-700' : 'text-gray-400'}`}>
                                            {formatOptionPrice(opt.price_cents)}
                                        </p>
                                        {optionCount > 1 ? (
                                            <p className="text-xs font-bold uppercase tracking-wide text-purple-500">
                                                repetido {optionCount}x
                                            </p>
                                        ) : null}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-shrink-0 items-center gap-3">
                                <div className="flex items-center rounded-2xl border border-gray-200 bg-white p-1 shadow-sm">
                                    <button
                                        type="button"
                                        onClick={() => decrementOption(opt.id)}
                                        disabled={optionCount === 0}
                                        className="flex h-8 w-8 items-center justify-center rounded-xl text-lg font-black text-gray-500 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-35"
                                        aria-label={`Diminuir ${opt.name}`}
                                    >
                                        -
                                    </button>
                                    <span className="w-7 text-center text-sm font-black text-gray-800">
                                        {optionCount}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => incrementOption(opt.id)}
                                        disabled={!canIncrement}
                                        className="flex h-8 w-8 items-center justify-center rounded-xl text-lg font-black text-purple-600 transition hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-35"
                                        aria-label={`Aumentar ${opt.name}`}
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        </div>
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
    const [descriptionExpanded, setDescriptionExpanded] = useState(false);
    const [loading, setLoading] = useState(true);
    const [added, setAdded] = useState(false);
    const [selections, setSelections] = useState<Record<string, string[]>>({});

    useEffect(() => {
        if (!ready) return;

        const API = getApiBase();

        const loadFromFallback = () => {
            return fetch('/default-menu.json')
                .then(r => r.json())
                .then(items => {
                    const found = (Array.isArray(items) ? items : []).find((item: Product) => item.id === id);
                    if (found) {
                        const optionGroups = resolveProductOptionGroups(found);
                        setProduct({ ...found, option_groups: optionGroups });
                        const initialSelections: Record<string, string[]> = {};
                        optionGroups.forEach((group: OptionGroup) => {
                            initialSelections[group.id] = [];
                        });
                        setSelections(initialSelections);
                    }
                })
                .catch(() => {});
        };

        fetch(`${API}/api/${slug}/menu/item/${id}`)
            .then(async r => {
                if (!r.ok) throw new Error('API offline');
                return r.json();
            })
            .then(data => {
                if (data && data.id) {
                    const optionGroups = resolveProductOptionGroups(data);
                    setProduct({ ...data, option_groups: optionGroups });
                    const initialSelections: Record<string, string[]> = {};
                    optionGroups.forEach((group: OptionGroup) => {
                        initialSelections[group.id] = [];
                    });
                    setSelections(initialSelections);
                    return;
                }

                return fetch(`${API}/api/${slug}/menu`)
                    .then(async r => {
                        if (!r.ok) throw new Error('API offline');
                        return r.json();
                    })
                    .then(items => {
                        const found = (Array.isArray(items) ? items : []).find((item: Product) => item.id === id);
                        if (found) {
                            const optionGroups = resolveProductOptionGroups(found);
                            setProduct({ ...found, option_groups: optionGroups });
                            const initialSelections: Record<string, string[]> = {};
                            optionGroups.forEach((group: OptionGroup) => { initialSelections[group.id] = []; });
                            setSelections(initialSelections);
                        } else {
                            return loadFromFallback();
                        }
                    })
                    .catch(() => loadFromFallback());
            })
            .catch(() => loadFromFallback())
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
                            <p id="product-description" className={`mt-2 whitespace-pre-line text-base leading-relaxed text-gray-500 ${descriptionExpanded ? '' : 'line-clamp-3'}`}>
                                {product.description || 'Monte seu pedido com os complementos disponiveis abaixo.'}
                            </p>
                            {(product.description?.length || 0) > 200 ? (
                                <button type="button" aria-expanded={descriptionExpanded} aria-controls="product-description" onClick={() => setDescriptionExpanded(current => !current)} className="mt-2 text-sm font-bold text-purple-700">
                                    {descriptionExpanded ? 'Recolher descrição' : 'Ler descrição completa'}
                                </button>
                            ) : null}
                        </div>

                        <div className="rounded-3xl border border-purple-100 bg-purple-50 p-6">
                            <p className="text-xs font-black uppercase tracking-widest text-purple-400">Preco base</p>
                            <p className="mt-1 text-4xl font-black text-purple-700">{formatCurrency(product.price_cents)}</p>
                            {optionGroups.length > 0 ? (
                                <p className="mt-3 text-sm font-medium text-purple-700/80">
                                    Escolha suas opções abaixo. O valor é atualizado a cada escolha.
                                </p>
                            ) : null}
                        </div>
                    </section>

                    {optionGroups.length > 0 ? (
                        <section className="space-y-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-black text-gray-900">Personalize seu pedido</h2>
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
                                    Opções selecionadas: {formatCurrency(modifierTotal)}
                                </p>
                                <p className="mt-1 text-sm font-semibold text-gray-700">
                                    Total por unidade: {formatCurrency(totalPerItem)}
                                </p>
                            </div>
                            <div className="shrink-0 rounded-2xl bg-white px-3 py-3 text-right shadow-sm">
                                <p className="text-xs font-black uppercase tracking-widest text-gray-400">Total</p>
                                <p className="mt-1 whitespace-nowrap text-lg font-black text-purple-700">{formatCurrency(totalWithQty)}</p>
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
                        className={`flex w-full items-center justify-between gap-2 rounded-2xl px-4 py-4 text-sm font-black transition sm:text-base ${
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
                                <span className="shrink-0 whitespace-nowrap">{formatCurrency(totalWithQty)}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
