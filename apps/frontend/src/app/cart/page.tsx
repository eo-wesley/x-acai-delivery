'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '../../components/CartContext';

import { useTenant, getApiBase } from '../../hooks/useTenant';
import { useEffect } from 'react';
import UpsellComponent from '../../components/UpsellComponent';

const Rfull = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;

export default function CartPage() {
    const router = useRouter();
    const { items, removeFromCart, updateQty, cartCount, subtotalCents, coupon, applyCoupon, removeCoupon } = useCart();
    const { slug } = useTenant();

    const [couponInput, setCouponInput] = useState(coupon?.code || '');
    const [couponMsg, setCouponMsg] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [allProducts, setAllProducts] = useState<any[]>([]);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const API = getApiBase();
                const res = await fetch(`${API}/api/${slug}/menu`);
                const data = await res.json();
                if (res.ok) setAllProducts(data);
            } catch (err) {
                console.error('Failed to fetch products for upsell', err);
            }
        };
        if (slug) fetchProducts();
    }, [slug]);

    const deliveryFeeCents = 500;
    const discountCents = coupon?.discountCents || 0;
    const totalCents = Math.max(0, subtotalCents + deliveryFeeCents - discountCents);

    const handleApplyCoupon = async () => {
        if (!couponInput.trim()) return;
        setVerifying(true);
        setCouponMsg('');
        try {
            const API = getApiBase();
            const res = await fetch(`${API}/api/${slug}/coupons/validate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: couponInput.trim(), orderTotalCents: subtotalCents }),
            });
            const data = await res.json();
            if (res.ok && data.valid) {
                applyCoupon(couponInput.trim().toUpperCase(), data.discountCents);
                setCouponMsg(`✅ ${data.message}`);
                setCouponInput(couponInput.trim().toUpperCase());
            } else {
                setCouponMsg(`❌ ${data.error || 'Cupom inválido'}`);
                removeCoupon();
            }
        } catch {
            setCouponMsg('❌ Falha ao validar');
        } finally {
            setVerifying(false);
        }
    };

    const handleRemoveCoupon = () => {
        removeCoupon();
        setCouponInput('');
        setCouponMsg('');
    };

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
                <span className="text-7xl mb-5">🛒</span>
                <h2 className="text-xl font-black text-gray-800">Sua sacola está vazia</h2>
                <p className="text-gray-500 mt-2 mb-8 text-sm">Navegue no cardápio e adicione seus favoritos!</p>
                <Link href="/">
                    <button className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-xl transition shadow-md">
                        Ver Cardápio
                    </button>
                </Link>
            </div>
        );
    }

    return (
        <div className="bg-gray-50">
            <div className="max-w-md mx-auto bg-white shadow-sm min-h-screen p-4 pb-36 relative">
                {/* Header */}
                <div className="flex items-center gap-3 mb-5">
                    <button onClick={() => router.back()} className="text-purple-600 font-bold text-sm">← Voltar</button>
                    <h2 className="text-xl font-black text-gray-800">Minha Sacola ({cartCount})</h2>
                </div>

                {/* Items */}
                <div className="flex flex-col gap-3">
                    {items.map((item) => {
                        const extrasCents = item.price_cents - (item.base_price_cents || item.price_cents);
                        return (
                            <div key={item.cartKey || item.menuItemId} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                                <div className="flex gap-3 justify-between">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-black text-gray-800 text-sm leading-tight">{item.name}</h3>

                                        {/* Selected Options Summary */}
                                        {(item.selected_options || []).length > 0 && (
                                            <div className="mt-1.5 space-y-0.5">
                                                {item.selected_options!.map((opt, i) => (
                                                    <div key={i} className="flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                                                        <span className="text-xs text-gray-500">{opt.optionName}</span>
                                                        {opt.price_cents > 0 && (
                                                            <span className="text-xs text-purple-600 font-semibold">+{Rfull(opt.price_cents)}</span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {item.notes && (
                                            <p className="text-xs text-gray-400 mt-1 italic">"{item.notes}"</p>
                                        )}

                                        {/* Pricing breakdown */}
                                        <div className="mt-2 flex items-baseline gap-2 flex-wrap">
                                            {item.base_price_cents && item.base_price_cents !== item.price_cents && (
                                                <span className="text-xs text-gray-400">Base: {Rfull(item.base_price_cents)}</span>
                                            )}
                                            {extrasCents > 0 && (
                                                <span className="text-xs text-gray-400">Opções: +{Rfull(extrasCents)}</span>
                                            )}
                                            <span className="text-purple-700 font-black text-sm">
                                                {Rfull(item.price_cents)} × {item.qty} = {Rfull(item.price_cents * item.qty)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Controls */}
                                    <div className="flex flex-col items-end justify-between flex-shrink-0">
                                        <button
                                            onClick={() => removeFromCart(item.cartKey || item.menuItemId)}
                                            className="text-red-400 text-xs font-bold hover:text-red-600 mb-2">
                                            ✕
                                        </button>
                                        <div className="flex items-center gap-1 bg-gray-100 rounded-xl overflow-hidden">
                                            <button
                                                onClick={() => updateQty(item.cartKey || item.menuItemId, item.qty - 1)}
                                                className="w-9 h-9 text-gray-600 font-black text-lg hover:bg-gray-200 flex items-center justify-center">
                                                −
                                            </button>
                                            <span className="font-black text-gray-800 min-w-[24px] text-center text-sm">{item.qty}</span>
                                            <button
                                                onClick={() => updateQty(item.cartKey || item.menuItemId, item.qty + 1)}
                                                className="w-9 h-9 text-purple-600 font-black text-lg hover:bg-purple-50 flex items-center justify-center">
                                                +
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Totals */}
                <div className="mt-5 bg-white p-4 border border-gray-100 rounded-2xl shadow-sm space-y-2 text-sm">
                    <div className="flex justify-between text-gray-600">
                        <span>Subtotal ({cartCount} {cartCount === 1 ? 'item' : 'itens'})</span>
                        <span>{Rfull(subtotalCents)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600 pb-3 border-b border-gray-100">
                        <span>Taxa de Entrega</span>
                        <span>{Rfull(deliveryFeeCents)}</span>
                    </div>
                    {coupon && (
                        <div className="flex justify-between text-green-600 font-bold pb-2 border-b border-gray-100">
                            <span>Desconto ({coupon.code})</span>
                            <span>− {Rfull(discountCents)}</span>
                        </div>
                    )}
                    <div className="flex justify-between font-black text-gray-900 text-base pt-1">
                        <span>Total</span>
                        <span className="text-purple-700">{Rfull(totalCents)}</span>
                    </div>
                </div>

                {/* 🚀 Revenue AI: Upsell & Rewards */}
                <UpsellComponent allProducts={allProducts} />

                {/* Coupom Section */}
                <div className="mt-4 bg-white p-4 border border-gray-100 rounded-2xl shadow-sm">
                    <h3 className="font-bold text-gray-700 mb-3 text-sm">🎟️ Cupom de Desconto</h3>
                    {coupon ? (
                        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                            <div>
                                <p className="font-black text-green-700 text-sm">Cupom aplicado!</p>
                                <p className="text-xs text-green-600">{couponMsg || 'Desconto garantido!'}</p>
                            </div>
                            <button type="button" onClick={handleRemoveCoupon} className="text-red-400 hover:text-red-600 text-xs font-bold">Remover</button>
                        </div>
                    ) : (
                        <div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Digite seu cupom"
                                    className="flex-1 border border-gray-200 rounded-lg p-3 outline-none focus:border-purple-500 text-sm uppercase"
                                    value={couponInput}
                                    onChange={e => setCouponInput(e.target.value.toUpperCase())}
                                    onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                                />
                                <button
                                    type="button"
                                    onClick={handleApplyCoupon}
                                    disabled={verifying || !couponInput.trim()}
                                    className="bg-gray-800 text-white font-bold px-4 rounded-lg text-sm disabled:opacity-40 transition"
                                >
                                    {verifying ? '...' : 'Aplicar'}
                                </button>
                            </div>
                            {couponMsg && !coupon && (
                                <p className="text-xs mt-2 text-red-500">{couponMsg}</p>
                            )}
                        </div>
                    )}
                </div>

                {/* CTA */}
                <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-100 shadow-xl p-4 z-50">
                    <Link href="/checkout">
                        <button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black py-4 rounded-2xl shadow-lg transition active:scale-95 text-lg">
                            Finalizar Pedido · {Rfull(totalCents)}
                        </button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
