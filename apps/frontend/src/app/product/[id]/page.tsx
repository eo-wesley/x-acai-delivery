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
    const [currentStep, setCurrentStep] = useState(0); // 0 = main info, 1..N = option groups

    useEffect(() => {
        if (!ready) return;
        const API = getApiBase();
        fetch(`${API}/api/${slug}/menu/item/${id}`)
            .then(r => r.json())
            .then(data => {
                if (data && data.id) {
                    setProduct(data);
                    // Initialize selections
                    const init: Record<string, string[]> = {};
                    (data.option_groups || []).forEach((g: OptionGroup) => { init[g.id] = []; });
                    setSelections(init);
                } else {
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

    const optionGroups = product?.option_groups || [];
    const totalSteps = optionGroups.length + 1; // Info + Groups

    // Step Validation
    const isStepValid = (stepIdx: number) => {
        if (stepIdx === 0) return true;
        const group = optionGroups[stepIdx - 1];
        if (!group.required) return true;
        return (selections[group.id] || []).length >= group.min_select;
    };

    const nextStep = () => {
        console.log('nextStep clicked', currentStep, totalSteps);
        if (isStepValid(currentStep) && currentStep < totalSteps - 1) {
            setCurrentStep(currentStep + 1);
            try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch(e) {}
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    // Validation groups missing
    const validationErrors: string[] = [];
    if (product) {
        for (const g of optionGroups) {
            if (g.required && (selections[g.id] || []).length < g.min_select) {
                validationErrors.push(g.name);
            }
        }
    }
    const isValid = validationErrors.length === 0;

    // Price calculation
    const modifierTotal = optionGroups.flatMap(g =>
        (selections[g.id] || []).map(optId => {
            const opt = g.options.find(o => o.id === optId);
            return opt ? opt.price_cents : 0;
        })
    ).reduce((a, b) => a + b, 0);

    const totalPerItem = product ? product.price_cents + modifierTotal : 0;
    const totalWithQty = totalPerItem * qty;

    const buildSelectedOptions = (): SelectedOption[] => {
        if (!product) return [];
        return optionGroups.flatMap(g =>
            (selections[g.id] || []).map(optId => {
                const opt = g.options.find(o => o.id === optId)!;
                return { groupId: g.id, groupName: g.name, optionId: opt.id, optionName: opt.name, price_cents: opt.price_cents };
            })
        );
    };

    const handleAdd = () => {
        console.log('handleAdd called!', { product, isValid });
        if (!product || !isValid) {
            console.error('handleAdd early return', { product, isValid });
            return;
        }
        try {
            const selectedOptions = buildSelectedOptions();
            const cartKey = buildCartKey(product.id, selectedOptions);
            console.log('Adding to cart:', cartKey);
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
            console.log('Cart updated successfully, redirecting...');
            setTimeout(() => {
                router.push('/');
            }, 900);
        } catch (e) {
            console.error('Error in handleAdd:', e);
        }
    };

    if (loading) return (
        <div className="animate-pulse pb-28">
            <div className="w-full h-52 bg-purple-100" />
            <div className="p-5 space-y-4">
                <div className="h-7 bg-gray-200 rounded-xl w-3/4" />
                <div className="h-4 bg-gray-100 rounded-xl" />
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
        <div className="bg-white min-h-screen">
            <div className="max-w-md mx-auto min-h-screen pb-36 relative">
                {/* Header / Stepper Progress */}
                <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                        <button onClick={() => currentStep === 0 ? router.back() : prevStep()}
                            className="bg-gray-100 p-2 rounded-full w-10 h-10 flex items-center justify-center hover:bg-gray-200 transition">
                            {currentStep === 0 ? '✕' : '←'}
                        </button>
                        <div className="flex-1">
                            <div className="flex justify-between text-[10px] font-black uppercase text-gray-400 mb-1">
                                <span>{currentStep === 0 ? 'Detalhes' : `Passo ${currentStep}`}</span>
                                <span>{Math.round(((currentStep + 1) / totalSteps) * 100)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-purple-600 transition-all duration-500" style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Step Content */}
                <div className="p-4 anim-fade-in">
                    {currentStep === 0 && (
                        <div className="space-y-6">
                            {/* Hero Image */}
                            <div className="w-full h-64 bg-purple-50 rounded-3xl overflow-hidden flex items-center justify-center relative shadow-inner">
                                {product.image_url
                                    ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                                    : <span className="text-9xl grayscale opacity-20">🥣</span>
                                }
                                <div className="absolute top-4 left-4 bg-white/90 px-3 py-1 rounded-full text-xs font-black text-purple-700 shadow-sm uppercase tracking-widest">
                                    {product.category || 'Premium'}
                                </div>
                            </div>

                            <div>
                                <h1 className="text-3xl font-black text-gray-900 leading-tight">{product.name}</h1>
                                <p className="text-gray-500 mt-2 text-base leading-relaxed">{product.description || 'Uma experiência única de sabor preparada especialmente para você.'}</p>
                            </div>

                            <div className="bg-purple-50 p-6 rounded-3xl border border-purple-100">
                                <span className="text-xs font-black text-purple-400 uppercase tracking-widest block mb-1">A partir de</span>
                                <span className="text-4xl font-black text-purple-700">{Rfull(product.price_cents)}</span>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-2xl flex items-center gap-3">
                                <span className="text-xl">✨</span>
                                <p className="text-xs text-gray-500 font-medium">Configure seu pedido nos próximos passos para uma experiência personalizada.</p>
                            </div>
                        </div>
                    )}

                    {currentStep > 0 && (
                        <div className="space-y-6">
                            <GroupSelector
                                group={optionGroups[currentStep - 1]}
                                selected={selections[optionGroups[currentStep - 1].id] || []}
                                onChange={optIds => setGroupSelection(optionGroups[currentStep - 1].id, optIds)}
                            />

                            {/* Show summary if last step */}
                            {currentStep === totalSteps - 1 && (
                                <div className="bg-gray-50 rounded-2xl p-4 mt-6">
                                    <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-wide">Observações Finais</label>
                                    <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
                                        placeholder="Ex: sem talheres, guardanapo extra..."
                                        className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:border-purple-500 resize-none text-sm bg-white" />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Bottom Navigation */}
                <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-100 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] p-4 z-50">
                    <div className="flex gap-4">
                        {currentStep > 0 && (
                            <div className="flex items-center bg-gray-100 rounded-2xl p-1 px-2">
                                <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-8 h-8 font-bold text-gray-500">-</button>
                                <span className="w-6 text-center font-black text-sm">{qty}</span>
                                <button onClick={() => setQty(qty + 1)} className="w-8 h-8 font-bold text-purple-600">+</button>
                            </div>
                        )}

                        {currentStep < totalSteps - 1 ? (
                            <button
                                id="next-step-btn"
                                onClick={nextStep}
                                disabled={!isStepValid(currentStep)}
                                className={`flex-1 font-black py-4 rounded-2xl shadow-lg transition text-base flex justify-center items-center gap-2 ${isStepValid(currentStep) ? 'bg-purple-600 text-white shadow-purple-200' : 'bg-gray-100 text-gray-400'
                                    }`}
                            >
                                {currentStep === 0 ? 'Começar Montagem' : 'Próximo Passo'}
                                <span className="opacity-50">→</span>
                            </button>
                        ) : (
                            <button
                                id="add-to-cart-btn"
                                onClick={handleAdd}
                                disabled={!isValid || added}
                                className={`flex-1 font-black py-4 rounded-2xl shadow-lg transition text-base flex justify-between items-center px-6 ${added ? 'bg-green-500 text-white' : !isValid ? 'bg-gray-100 text-gray-400' : 'bg-purple-600 text-white'
                                    } pointer-events-auto relative z-[60]`}
                            >
                                {added ? '✓ Adicionado' : (
                                    <>
                                        <span>Fechar Pedido</span>
                                        <span>{Rfull(totalWithQty)}</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
