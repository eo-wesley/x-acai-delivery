'use client';

import React, { useState, useEffect } from 'react';

type MenuItem = {
    id: string;
    name: string;
    price_cents: number;
    category: string;
    image_url?: string;
};

type OptionItem = {
    id: string;
    name: string;
    price_cents: number;
    available: boolean;
};

type OptionGroup = {
    id: string;
    name: string;
    required: boolean;
    min_select: number;
    max_select: number;
    options: OptionItem[];
};

type CartItem = {
    cartId: string;
    menuItemId: string;
    name: string;
    qty: number;
    basePrice: number;
    selected_options?: {
        groupId: string;
        groupName: string;
        optionId: string;
        optionName: string;
        price_cents: number;
    }[];
};

export default function AdminPDV() {
    const [menu, setMenu] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('pix');
    const [customerName, setCustomerName] = useState('');

    // Modal State
    const [selectedProduct, setSelectedProduct] = useState<MenuItem | null>(null);
    const [productOptions, setProductOptions] = useState<OptionGroup[]>([]);
    const [modalLoading, setModalLoading] = useState(false);
    const [selections, setSelections] = useState<Record<string, Record<string, boolean>>>({});
    const [qty, setQty] = useState(1);

    useEffect(() => {
        fetchMenu();
    }, []);

    const fetchMenu = async () => {
        try {
            const token = localStorage.getItem('admin_token');
            const slug = localStorage.getItem('admin_slug') || 'default';
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
            const res = await fetch(`${API_URL}/api/admin/menu?slug=${slug}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setMenu(Array.isArray(data) ? data.filter(i => i.available !== false) : []);
        } catch (e) {
            console.error('Menu load error', e);
        } finally {
            setLoading(false);
        }
    };

    const handleProductClick = async (item: MenuItem) => {
        setModalLoading(true);
        setSelectedProduct(item);
        setSelections({});
        setQty(1);

        try {
            const token = localStorage.getItem('admin_token');
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
            const res = await fetch(`${API_URL}/api/admin/menu/${item.id}/options`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const groups = await res.json();
                setProductOptions(groups || []);

                // Pre-select logic if max_select is 1 and minimum is 1 (radio behavior) - omitted for simplicity
                const initialSelections: Record<string, Record<string, boolean>> = {};
                (groups || []).forEach((g: OptionGroup) => {
                    initialSelections[g.id] = {};
                });
                setSelections(initialSelections);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setModalLoading(false);
        }
    };

    const toggleOption = (groupId: string, optionId: string, group: OptionGroup) => {
        setSelections(prev => {
            const groupSelects = { ...prev[groupId] };
            const isCurrentlySelected = !!groupSelects[optionId];

            if (isCurrentlySelected) {
                delete groupSelects[optionId];
            } else {
                const currentCount = Object.keys(groupSelects).length;
                if (group.max_select === 1) {
                    // Radio behavior
                    Object.keys(groupSelects).forEach(k => delete groupSelects[k]);
                    groupSelects[optionId] = true;
                } else if (currentCount < group.max_select) {
                    groupSelects[optionId] = true;
                } else {
                    alert(`Máximo de ${group.max_select} opções para este grupo.`);
                    return prev;
                }
            }
            return { ...prev, [groupId]: groupSelects };
        });
    };

    const addToCart = () => {
        if (!selectedProduct) return;

        // Validation
        for (const group of productOptions) {
            const count = Object.keys(selections[group.id] || {}).length;
            if (group.required && count < group.min_select) {
                alert(`Selecione ao menos ${group.min_select} opção em: ${group.name}`);
                return;
            }
        }

        // Build selected_options payload
        const selected_options: CartItem['selected_options'] = [];
        productOptions.forEach(group => {
            const groupSelects = selections[group.id] || {};
            group.options.forEach(opt => {
                if (groupSelects[opt.id]) {
                    selected_options.push({
                        groupId: group.id,
                        groupName: group.name,
                        optionId: opt.id,
                        optionName: opt.name,
                        price_cents: opt.price_cents
                    });
                }
            });
        });

        const newItem: CartItem = {
            cartId: Math.random().toString(36).substring(7),
            menuItemId: selectedProduct.id,
            name: selectedProduct.name,
            qty,
            basePrice: selectedProduct.price_cents,
            selected_options: selected_options.length > 0 ? selected_options : undefined
        };

        setCart([...cart, newItem]);
        setSelectedProduct(null);
    };

    const removeCartItem = (cartId: string) => {
        setCart(cart.filter(i => i.cartId !== cartId));
    };

    const getItemUnitPrice = (item: CartItem) => {
        let total = item.basePrice;
        item.selected_options?.forEach(opt => { total += opt.price_cents; });
        return total;
    };

    const subtotal = cart.reduce((acc, item) => acc + (getItemUnitPrice(item) * item.qty), 0);

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        setCheckoutLoading(true);

        try {
            const token = localStorage.getItem('admin_token');
            const slug = localStorage.getItem('admin_slug') || 'default';
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

            const payload = {
                customerId: 'pdv_guest',
                customerName: customerName || 'Cliente Balcão',
                items: cart.map(item => ({
                    menuItemId: item.menuItemId,
                    qty: item.qty,
                    selected_options: item.selected_options
                })),
                subtotalCents: subtotal,
                deliveryFeeCents: 0,
                totalCents: subtotal,
                addressText: 'Balcão / PDV',
                paymentMethod
            };

            const res = await fetch(`${API_URL}/api/admin/pdv/orders?slug=${slug}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert('Venda PDV Concluída!');
                setCart([]);
                setCustomerName('');
            } else {
                alert('Falha ao registrar venda.');
            }
        } catch (e) {
            alert('Erro de rede.');
        } finally {
            setCheckoutLoading(false);
        }
    };

    const formatCurrency = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;

    if (loading) return <div>Carregando catálogo...</div>;

    const categories = Array.from(new Set(menu.map(m => m.category).filter(Boolean)));

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)] overflow-hidden bg-gray-100 -mx-4 -mb-4 mt-[-1rem]">
            {/* LEFT: Catalog */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
                <h1 className="text-2xl font-black text-gray-800 shrink-0">Terminal PDV</h1>

                {categories.length > 0 ? categories.map(cat => (
                    <div key={cat}>
                        <h2 className="text-lg font-bold text-gray-700 mb-3 ml-1">{cat}</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                            {menu.filter(m => m.category === cat).map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => handleProductClick(item)}
                                    className="bg-white rounded-xl p-3 shadow-sm border border-gray-200 text-left hover:border-purple-500 hover:shadow-md transition active:scale-95 flex flex-col items-center justify-center text-center h-32"
                                >
                                    <span className="font-bold text-gray-800 line-clamp-2 text-sm">{item.name}</span>
                                    <span className="text-purple-600 font-black mt-2">{formatCurrency(item.price_cents)}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                        {menu.map(item => (
                            <button
                                key={item.id}
                                onClick={() => handleProductClick(item)}
                                className="bg-white rounded-xl p-3 shadow-sm border border-gray-200 text-left hover:border-purple-500 hover:shadow-md transition active:scale-95 flex flex-col items-center justify-center text-center h-32"
                            >
                                <span className="font-bold text-gray-800 line-clamp-2 text-sm">{item.name}</span>
                                <span className="text-purple-600 font-black mt-2">{formatCurrency(item.price_cents)}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* RIGHT: Cart & Checkout */}
            <div className="w-full lg:w-96 bg-white border-l shadow-xl flex flex-col h-full shrink-0">
                <div className="p-4 bg-gray-50 border-b shrink-0">
                    <h2 className="text-xl font-bold flex items-center justify-between">
                        Cesta <span className="bg-purple-100 text-purple-700 text-sm px-2 py-1 rounded-lg">{cart.length} itens</span>
                    </h2>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {cart.map(item => (
                        <div key={item.cartId} className="flex flex-col bg-white border border-gray-100 p-3 rounded-lg shadow-sm">
                            <div className="flex justify-between items-start">
                                <div className="flex gap-2">
                                    <span className="font-bold text-purple-600">{item.qty}x</span>
                                    <span className="font-bold text-gray-800">{item.name}</span>
                                </div>
                                <button onClick={() => removeCartItem(item.cartId)} className="text-red-400 hover:text-red-600 font-bold px-2.5 bg-red-50 rounded-md">✕</button>
                            </div>
                            {item.selected_options && item.selected_options.length > 0 && (
                                <ul className="text-xs text-gray-500 mt-1.5 ml-6 space-y-0.5 border-l-2 border-gray-100 pl-2">
                                    {item.selected_options.map((opt, i) => (
                                        <li key={i}>+ {opt.optionName} {opt.price_cents > 0 && `(${formatCurrency(opt.price_cents)})`}</li>
                                    ))}
                                </ul>
                            )}
                            <div className="text-right mt-2 text-sm font-black text-gray-700">
                                {formatCurrency(getItemUnitPrice(item) * item.qty)}
                            </div>
                        </div>
                    ))}
                    {cart.length === 0 && (
                        <div className="text-center text-gray-400 py-10 italic">Nenhum item adicionado</div>
                    )}
                </div>

                <div className="p-4 bg-gray-50 border-t shrink-0 space-y-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    <input
                        type="text"
                        placeholder="Nome do Cliente (Opcional)"
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        className="w-full text-sm border p-2 rounded-lg outline-none focus:ring-2 focus:ring-purple-200"
                    />

                    <div className="grid grid-cols-3 gap-2">
                        {['pix', 'card', 'cash'].map(method => (
                            <button
                                key={method}
                                onClick={() => setPaymentMethod(method)}
                                className={`py-2 text-sm font-bold rounded-lg border-2 transition ${paymentMethod === method ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-gray-200 bg-white text-gray-500'}`}
                            >
                                {method === 'pix' ? 'PIX' : method === 'card' ? 'Cartão' : 'Dinheiro'}
                            </button>
                        ))}
                    </div>

                    <div className="flex justify-between items-end pb-1 pt-2">
                        <span className="text-gray-500 font-semibold uppercase text-xs tracking-wider">Total Final</span>
                        <span className="text-3xl font-black text-green-600">{formatCurrency(subtotal)}</span>
                    </div>

                    <button
                        onClick={handleCheckout}
                        disabled={cart.length === 0 || checkoutLoading}
                        className="w-full bg-green-500 text-white font-black py-4 rounded-xl text-lg hover:bg-green-600 active:scale-95 transition disabled:opacity-50 disabled:scale-100 shadow-lg shadow-green-200"
                    >
                        {checkoutLoading ? 'Processando...' : 'FINALIZAR VENDA (F2)'}
                    </button>
                </div>
            </div>

            {/* Options Modal */}
            {selectedProduct && (
                <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg max-h-full flex flex-col overflow-hidden animate-fade-in">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50 shrink-0">
                            <h2 className="font-black text-xl text-gray-800">{selectedProduct.name}</h2>
                            <button onClick={() => setSelectedProduct(null)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold px-2">&times;</button>
                        </div>

                        <div className="p-4 overflow-y-auto flex-1 bg-white">
                            {modalLoading ? (
                                <div className="text-center py-10 text-gray-500 font-bold animate-pulse">Carregando opções...</div>
                            ) : (
                                <div className="space-y-6">
                                    {productOptions.map(group => (
                                        <div key={group.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                            <div className="flex justify-between items-baseline mb-3">
                                                <h3 className="font-bold text-lg text-gray-800">{group.name}</h3>
                                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                                    {group.required ? `Mín: ${group.min_select} / ` : ''} Máx: {group.max_select}
                                                </span>
                                            </div>
                                            <div className="space-y-2">
                                                {group.options.filter(o => o.available !== false).map(opt => {
                                                    const isChecked = !!selections[group.id]?.[opt.id];
                                                    return (
                                                        <label key={opt.id} className={`flex justify-between items-center p-3 rounded-lg border-2 cursor-pointer transition ${isChecked ? 'border-purple-600 bg-purple-50' : 'border-gray-200 bg-white hover:border-purple-300'}`}>
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isChecked ? 'border-purple-600 bg-purple-600' : 'border-gray-300'}`}>
                                                                    {isChecked && <div className="w-2 h-2 bg-white rounded-full" />}
                                                                </div>
                                                                <span className={`font-semibold ${isChecked ? 'text-purple-900' : 'text-gray-700'}`}>{opt.name}</span>
                                                            </div>
                                                            <span className={`text-sm font-bold ${isChecked ? 'text-purple-700' : 'text-gray-500'}`}>
                                                                {opt.price_cents > 0 ? `+ ${formatCurrency(opt.price_cents)}` : ''}
                                                            </span>
                                                            <input
                                                                type="checkbox"
                                                                className="hidden"
                                                                checked={isChecked}
                                                                onChange={() => toggleOption(group.id, opt.id, group)}
                                                            />
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                    {productOptions.length === 0 && (
                                        <p className="text-gray-500 text-center py-4">Sem adicionais para este item.</p>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t bg-white flex justify-between items-center shrink-0">
                            <div className="flex items-center bg-gray-100 rounded-lg p-1 mr-4">
                                <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-10 flex text-xl items-center justify-center font-bold text-gray-600 hover:bg-white rounded-md transition">-</button>
                                <span className="w-8 text-center font-bold">{qty}</span>
                                <button onClick={() => setQty(qty + 1)} className="w-10 h-10 flex text-xl items-center justify-center font-bold text-gray-600 hover:bg-white rounded-md transition">+</button>
                            </div>
                            <button
                                onClick={addToCart}
                                disabled={modalLoading}
                                className="flex-1 bg-purple-600 text-white font-bold py-3.5 rounded-xl hover:bg-purple-700 transition disabled:opacity-50 text-lg shadow-lg shadow-purple-200"
                            >
                                Adicionar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
