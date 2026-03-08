'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCart, buildCartKey, SelectedOption } from '../../../components/CartContext';
import { useTenant, getApiBase } from '../../../hooks/useTenant';

// ─── Types ────────────────────────────────────────────────────────────────────
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
const R = (cents: number) =>
    cents === 0 ? 'grátis' : `+R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;

const Rfull = (cents: number) =>
    `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;

// ─── Group Selector Component ─────────────────────────────────────────────────
function GroupSelector({
    group,
    selected,
    onChange,
}: {
    group: OptionGroup;
    selected: string[];
    onChange: (optionIds: string[]) => void;
}) {
    const isSingle = group.max_select === 1;
    const isMulti = group.max_select > 1;
    const limitReached = selected.length >= group.max_select && group.max_select !== 99;

    const toggle = (optId: string) => {
        if (isSingle) {
            onChange([optId]);
        } else {
            if (selected.includes(optId)) {
                onChange(selected.filter(id => id !== optId));
            } else if (!limitReached) {
                onChange([...selected, optId]);
            }
        }
    };

    const filled = selected.length >= group.min_select;

    return (
        <div className={`rounded-2xl border-2 overflow-hidden ${group.required && !filled ? 'border-orange-300' : 'border-gray-100'}`}>
            {/* Group Header */}
            <div className={`px-4 py-3 flex items-center justify-between ${group.required ? 'bg-gray-50' : 'bg-white'}`}>
                <div>
                    <span className="font-black text-gray-800 text-sm">{group.name}</span>
                    <div className="flex gap-2 mt-0.5 flex-wrap">
                        {group.required
                            ? <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">OBRIGATÓRIO</span>
                            : <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">OPCIONAL</span>
                        }
                        {isMulti && group.max_select !== 99 && (
                            <span className="text-[10px] font-bold bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">
                                Escolha até {group.max_select}
                            </span>
                        )}
                        {isMulti && group.max_select === 99 && (
                            <span className="text-[10px] font-bold bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">
                                Múltipla escolha
                            </span>
                        )}
                        {group.required && group.min_select === group.max_select && group.max_select > 1 && (
                            <span className="text-[10px] font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
                                Escolha exatamente {group.min_select}
                            </span>
                        )}
                    </div>
                </div>
                {group.required && (
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${filled ? 'bg-green-500' : 'bg-orange-300'}`}>
                        <span className="text-white text-xs font-black">{filled ? '✓' : '!'}</span>
                    </div>
                )}
            </div>

            {/* Options */}
            <div className="divide-y divide-gray-50">
                {group.options.map(opt => {
                    const isSelected = selected.includes(opt.id);
                    const disabled = !isSelected && limitReached;
                    return (
                        <button
                            key={opt.id}
                            onClick={() => toggle(opt.id)}
                            disabled={disabled}
                            className={`w-full flex items-center justify-between px-4 py-3 text-left transition ${isSelected
                                ? 'bg-purple-50'
                                : disabled
                                    ? 'opacity-40 cursor-not-allowed bg-white'
                                    : 'bg-white hover:bg-gray-50 active:bg-purple-50'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                {/* Radio / Checkbox Indicator */}
                                <div className={`flex-shrink-0 ${isSingle ? 'w-5 h-5 rounded-full' : 'w-5 h-5 rounded-md'} border-2 flex items-center justify-center transition ${isSelected ? 'border-purple-600 bg-purple-600' : 'border-gray-300'
                                    }`}>
                                    {isSelected && <div className={`bg-white ${isSingle ? 'w-2 h-2 rounded-full' : 'w-3 h-3 flex items-center justify-center text-[10px] font-black'}`}>{isSingle ? '' : '✓'}</div>}
                                </div>
                                <span className={`text-sm font-semibold ${isSelected ? 'text-purple-700' : 'text-gray-700'}`}>{opt.name}</span>
                            </div>
                            <span className={`text-sm font-bold ${opt.price_cents > 0 ? 'text-gray-600' : 'text-gray-400'}`}>
                                {R(opt.price_cents)}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
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

    // selections[groupId] = array of selected optionItem IDs
    const [selections, setSelections] = useState<Record<string, string[]>>({});

    useEffect(() => {
        if (!ready) return;
        const API = getApiBase();
        fetch(`${API}/api/${slug}/menu/item/${id}`)
            .then(r => r.json())
            .then(data => {
                if (data && data.id) {
                    setProduct(data);
                    // Initialize selections (empty for all groups)
                    const init: Record<string, string[]> = {};
                    (data.option_groups || []).forEach((g: OptionGroup) => { init[g.id] = []; });
                    setSelections(init);
                } else {
                    // fallback: try getting from list
                    return fetch(`${API}/api/${slug}/menu`)
                        .then(r => r.json())
                        .then(items => {
                            const found = (Array.isArray(items) ? items : []).find((p: any) => p.id === id);
                            if (found) setProduct({ ...found, option_groups: [] });
                        });
                }
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [id, slug, ready]);

    const setGroupSelection = useCallback((groupId: string, optIds: string[]) => {
        setSelections(prev => ({ ...prev, [groupId]: optIds }));
    }, []);

    // Validation: all required groups must have at least min_select items
    const validationErrors: string[] = [];
    if (product) {
        for (const g of product.option_groups || []) {
            if (g.required && (selections[g.id] || []).length < g.min_select) {
                validationErrors.push(g.name);
            }
        }
    }
    const isValid = validationErrors.length === 0;

    // Price calculation
    const modifierTotal = product
        ? (product.option_groups || []).flatMap(g =>
            (selections[g.id] || []).map(optId => {
                const opt = g.options.find(o => o.id === optId);
                return opt ? opt.price_cents : 0;
            })
        ).reduce((a, b) => a + b, 0)
        : 0;

    const totalPerItem = product ? product.price_cents + modifierTotal : 0;
    const totalWithQty = totalPerItem * qty;

    // Build selected_options array for cart
    const buildSelectedOptions = (): SelectedOption[] => {
        if (!product) return [];
        return (product.option_groups || []).flatMap(g =>
            (selections[g.id] || []).map(optId => {
                const opt = g.options.find(o => o.id === optId)!;
                return { groupId: g.id, groupName: g.name, optionId: opt.id, optionName: opt.name, price_cents: opt.price_cents };
            })
        );
    };

    const handleAdd = () => {
        if (!product || !isValid) return;
        const selectedOptions = buildSelectedOptions();
        const cartKey = buildCartKey(product.id, selectedOptions);
        addToCart({
            cartKey,
            menuItemId: product.id,
            name: product.name,
            base_price_cents: product.price_cents,
            price_cents: totalPerItem,
            qty,
            notes: notes.trim() || undefined,
            selected_options: selectedOptions,
        });
        setAdded(true);
        setTimeout(() => router.push('/'), 900);
    };

    if (loading) return (
        <div className="animate-pulse pb-28">
            <div className="w-full h-52 bg-purple-100" />
            <div className="p-5 space-y-4">
                <div className="h-7 bg-gray-200 rounded-xl w-3/4" />
                <div className="h-4 bg-gray-100 rounded-xl" />
                <div className="h-32 bg-gray-100 rounded-2xl" />
                <div className="h-32 bg-gray-100 rounded-2xl" />
            </div>
        </div>
    );

    if (!product) return (
        <div className="p-6 text-center mt-12">
            <div className="text-5xl mb-4">🔍</div>
            <h2 className="font-black text-gray-800 text-xl">Produto não encontrado</h2>
            <button onClick={() => router.back()} className="mt-6 text-purple-600 font-bold">← Voltar</button>
        </div>
    );

    return (
        <div className="pb-36 min-h-screen bg-gray-50">
            {/* Hero */}
            <div className="w-full h-52 bg-gradient-to-br from-purple-700 to-purple-900 flex items-center justify-center relative">
                <button onClick={() => router.back()}
                    className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm p-2 rounded-full shadow font-bold w-10 h-10 flex items-center justify-center text-gray-700 hover:bg-white">
                    ←
                </button>
                {product.image_url
                    ? <img src={product.image_url} alt={product.name} className="h-40 w-40 object-cover rounded-2xl shadow-xl" onError={e => (e.currentTarget.style.display = 'none')} />
                    : <span className="text-9xl">🥣</span>
                }
            </div>

            {/* Product Info */}
            <div className="bg-white px-5 pt-5 pb-4 shadow-sm">
                {product.category && (
                    <span className="text-xs bg-purple-100 text-purple-600 font-bold px-3 py-1 rounded-full">{product.category}</span>
                )}
                <h1 className="text-2xl font-black text-gray-800 mt-2">{product.name}</h1>
                {product.description && (
                    <p className="text-gray-500 mt-1 text-sm leading-relaxed">{product.description}</p>
                )}
                <div className="mt-3 text-2xl font-black text-purple-700">
                    {Rfull(product.price_cents)}
                    {modifierTotal > 0 && (
                        <span className="text-base text-gray-500 font-semibold ml-2">+ {Rfull(modifierTotal)} em opções</span>
                    )}
                </div>
            </div>

            {/* Option Groups */}
            <div className="px-4 py-4 space-y-4">
                {(product.option_groups || []).map(group => (
                    <GroupSelector
                        key={group.id}
                        group={group}
                        selected={selections[group.id] || []}
                        onChange={optIds => setGroupSelection(group.id, optIds)}
                    />
                ))}

                {/* Removed floating Qty (moved to bottom CTA) */}

                {/* Notes */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4">
                    <label className="block text-sm font-black text-gray-700 mb-2 uppercase tracking-wide">Observações (opcional)</label>
                    <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
                        placeholder="Ex: sem morango, extra nutella..."
                        className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:border-purple-500 resize-none text-sm" />
                </div>

                {/* Validation error hint */}
                {!isValid && (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                        <p className="text-sm font-bold text-orange-700">⚠️ Complete os itens obrigatórios:</p>
                        <ul className="mt-1 list-disc list-inside">
                            {validationErrors.map(e => <li key={e} className="text-sm text-orange-600">{e}</li>)}
                        </ul>
                    </div>
                )}
            </div>

            {/* Sticky CTA */}
            <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] p-4 pt-3 z-50">
                <div className="max-w-md mx-auto flex gap-3 items-center">
                    {/* Qty Controls */}
                    <div className="flex items-center justify-between gap-3 bg-gray-100 rounded-2xl p-2 px-4 shadow-inner">
                        <button onClick={() => setQty(Math.max(1, qty - 1))}
                            className="text-2xl font-bold text-gray-500 hover:text-purple-600 transition w-6 text-center select-none active:scale-90">
                            −
                        </button>
                        <span className="font-black text-lg w-4 text-center select-none">{qty}</span>
                        <button onClick={() => setQty(qty + 1)}
                            className="text-2xl font-bold text-purple-600 transition w-6 text-center select-none active:scale-90">
                            +
                        </button>
                    </div>

                    <button
                        onClick={handleAdd}
                        disabled={!isValid || added}
                        className={`flex-1 font-black py-4 rounded-2xl shadow-lg transition text-base flex justify-between items-center px-5 ${added
                            ? 'bg-green-500 text-white'
                            : !isValid
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                : 'bg-purple-600 hover:bg-purple-700 active:scale-95 text-white'
                            }`}>
                        {added
                            ? <span className="mx-auto">✓ Adicionado!</span>
                            : !isValid
                                ? <span className="mx-auto text-sm">Faltam Obrigatórios</span>
                                : (
                                    <>
                                        <span>Adicionar</span>
                                        <span>{Rfull(totalWithQty)}</span>
                                    </>
                                )
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}
