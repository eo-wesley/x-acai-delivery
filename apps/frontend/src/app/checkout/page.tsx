'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '../../components/CartContext';
import { useTenant, getApiBase } from '../../hooks/useTenant';

const PAYMENT_METHODS = [
    { value: 'pix', label: 'PIX', emoji: '💸', hint: 'Link de pagamento gerado após o pedido' },
    { value: 'card', label: 'Cartão', emoji: '💳', hint: 'Pague na entrega com maquininha' },
    { value: 'cash', label: 'Dinheiro', emoji: '💵', hint: 'Informe o valor para troco' },
];

export default function CheckoutPage() {
    const router = useRouter();
    const { items, subtotalCents, clearCart, coupon, applyCoupon, removeCoupon } = useCart();
    const { slug } = useTenant();

    const [form, setForm] = useState({
        name: '',
        phone: '',
        addressText: '',
        notes: '',
        paymentMethod: 'pix',
        changeFor: '',
        taxId: '',
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [walletBalance, setWalletBalance] = useState<number | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('customer_token');
        if (token) {
            const phone = JSON.parse(localStorage.getItem('customer_data') || '{}')?.phone;
            if (phone) {
                const API = getApiBase();
                fetch(`${API}/api/${slug}/loyalty/me?phone=${phone}`)
                    .then(r => r.json())
                    .then(data => {
                        if (data.walletBalance !== undefined) {
                            setWalletBalance(data.walletBalance);
                            setForm(f => ({ ...f, name: data.customerName || f.name, phone: phone || f.phone }));
                        }
                    })
                    .catch(console.error);
            }
        }
    }, [slug]);

    // Cupom global state helper
    const [couponInput, setCouponInput] = useState(coupon?.code || '');
    const [couponLoading, setCouponLoading] = useState(false);
    const [couponMsg, setCouponMsg] = useState('');

    const deliveryFeeCents = 500;
    const discountCents = coupon?.discountCents || 0;
    const totalCents = Math.max(0, subtotalCents + deliveryFeeCents - discountCents);

    // --- Empty cart guard ---
    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
                <span className="text-7xl mb-4">🛒</span>
                <h2 className="text-lg font-black text-gray-800">Sacola vazia</h2>
                <p className="text-gray-500 mt-2 mb-6 text-sm">Adicione itens antes de finalizar.</p>
                <Link href="/"><button className="bg-purple-600 text-white font-bold py-3 px-8 rounded-xl">Ver Cardápio</button></Link>
            </div>
        );
    }

    // --- Coupon apply ---
    const handleApplyCoupon = async () => {
        if (!couponInput.trim()) return;
        setCouponLoading(true);
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
            setCouponMsg('❌ Falha ao validar cupom');
        } finally {
            setCouponLoading(false);
        }
    };

    const handleRemoveCoupon = () => {
        removeCoupon();
        setCouponInput('');
        setCouponMsg('');
    };

    // --- Submit ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!form.name.trim()) { setError('Informe seu nome.'); return; }
        if (!form.phone.trim() || form.phone.replace(/\D/g, '').length < 10) { setError('Informe um telefone válido com DDD.'); return; }
        if (!form.addressText.trim()) { setError('Informe o endereço de entrega.'); return; }

        setLoading(true);
        setError('');

        const API = getApiBase();
        const payload = {
            customerId: `cust_${form.phone.replace(/\D/g, '') || Date.now()}`,
            customerName: form.name.trim(),
            customerPhone: form.phone.trim(),
            items: items.map(i => ({
                menuItemId: i.menuItemId,
                qty: i.qty,
                notes: i.notes || '',
                selected_options: i.selected_options || [],
            })),
            subtotalCents,
            deliveryFeeCents,
            discountCents,
            couponCode: coupon?.code,
            totalCents,
            addressText: form.addressText.trim(),
            notes: form.notes.trim(),
            paymentMethod: form.paymentMethod,
            changeFor: form.paymentMethod === 'cash' && form.changeFor ? Number(form.changeFor) * 100 : undefined,
            taxId: form.taxId.replace(/\D/g, ''),
        };

        try {
            const res = await fetch(`${API}/api/${slug}/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                const data = await res.json();
                clearCart();

                // 🚀 Phase 62: Persist context for personalization
                try {
                    localStorage.setItem('customer_name', form.name.trim());
                    if (items.length > 0) {
                        const lastOrderDetails = {
                            id: items[0].menuItemId,
                            name: items[0].name
                        };
                        localStorage.setItem('last_order_details', JSON.stringify(lastOrderDetails));
                    }
                } catch (e) { console.error('Failed to save personalization data', e); }

                // PIX: persist QR data in sessionStorage, then redirect to /pix/[id]
                if (form.paymentMethod === 'pix' && (data.pix_qr_code || data.payment_reference)) {
                    const pixSession = {
                        orderId: data.id,
                        qrCode: data.pix_qr_code || '',
                        qrBase64: data.pix_qr_base64 || '',
                        slug,
                        totalCents,
                        expiresAt: data.pix_expires_at || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
                        items: items.map(i => ({ name: i.name, qty: i.qty })),
                    };
                    try {
                        localStorage.setItem('tenant_slug', slug);
                        sessionStorage.setItem(`pix_${data.id}`, JSON.stringify(pixSession));
                    } catch {
                        /* ignore storage quota errors */
                    }
                    router.push(`/pix/${data.id}`);
                } else {
                    // Cash/card: go directly to order tracking
                    router.push(`/order/${data.id}?method=${form.paymentMethod}`);
                }
            } else {
                const errData = await res.json().catch(() => ({}));
                setError(errData.error || 'Erro ao criar pedido. Tente novamente.');
            }
        } catch {
            setError('Falha na comunicação com o servidor. Verifique sua conexão.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-gray-50 min-h-screen">
            <div className="max-w-md mx-auto bg-white shadow-sm min-h-screen p-4 pb-36 relative">
                {/* Header */}
                <div className="flex items-center gap-3 mb-5">
                    <button onClick={() => router.back()} className="text-purple-600 font-bold text-sm">← Voltar</button>
                    <h2 className="text-xl font-black text-gray-800">Finalizar Pedido</h2>
                </div>

                {/* Global error */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm font-medium" role="alert">
                        ⚠️ {error}
                        <button onClick={() => setError('')} className="float-right text-red-400 hover:text-red-600 font-black">✕</button>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>

                    {/* Personal Info */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-700 mb-3 text-xs uppercase tracking-widest">👤 Dados Pessoais</h3>
                        <div className="flex flex-col gap-3">
                            <input
                                type="text"
                                placeholder="Seu nome completo *"
                                required
                                autoComplete="name"
                                className="border border-gray-200 rounded-lg p-3 w-full outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 text-sm transition"
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                            />
                            <input
                                type="tel"
                                placeholder="Telefone / WhatsApp com DDD *"
                                required
                                autoComplete="tel"
                                className="border border-gray-200 rounded-lg p-3 w-full outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 text-sm transition"
                                value={form.phone}
                                onChange={e => setForm({ ...form, phone: e.target.value })}
                            />
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">CPF para Nota (Opcional)</label>
                                <input
                                    type="text"
                                    placeholder="000.000.000-00"
                                    className="border border-gray-200 rounded-lg p-3 w-full outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 text-sm transition"
                                    value={form.taxId}
                                    onChange={e => setForm({ ...form, taxId: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Address */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-700 mb-3 text-xs uppercase tracking-widest">📍 Endereço de Entrega</h3>
                        <textarea
                            required
                            rows={3}
                            placeholder="Rua, Número, Bairro, Complemento... *"
                            autoComplete="street-address"
                            className="border border-gray-200 rounded-lg p-3 w-full outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 resize-none text-sm transition"
                            value={form.addressText}
                            onChange={e => setForm({ ...form, addressText: e.target.value })}
                        />
                    </div>

                    {/* Payment */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-700 mb-3 text-xs uppercase tracking-widest">💳 Forma de Pagamento</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {PAYMENT_METHODS.map(m => (
                                <button
                                    key={m.value}
                                    type="button"
                                    onClick={() => setForm({ ...form, paymentMethod: m.value })}
                                    className={`flex flex-col items-center py-3 px-2 rounded-xl border-2 font-bold text-sm transition ${form.paymentMethod === m.value
                                        ? 'border-purple-600 bg-purple-50 text-purple-700 shadow-sm'
                                        : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'}`}
                                >
                                    <span className="text-2xl mb-1">{m.emoji}</span>
                                    {m.label}
                                </button>
                            ))}
                            {walletBalance !== null && walletBalance > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setForm({ ...form, paymentMethod: 'wallet' })}
                                    className={`flex flex-col items-center py-3 px-2 rounded-xl border-2 font-bold text-sm transition ${form.paymentMethod === 'wallet'
                                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-sm'
                                        : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'} ${walletBalance < totalCents ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    disabled={walletBalance < totalCents}
                                >
                                    <span className="text-2xl mb-1">💜</span>
                                    Carteira
                                    <span className="text-[9px] font-normal leading-tight mt-1">Saldo: R$ {(walletBalance / 100).toFixed(2)}</span>
                                </button>
                            )}
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                            {PAYMENT_METHODS.find(m => m.value === form.paymentMethod)?.hint}
                        </p>
                        {form.paymentMethod === 'cash' && (
                            <input
                                type="number"
                                placeholder="Troco para quanto? (opcional)"
                                className="mt-3 border border-gray-200 rounded-lg p-3 w-full outline-none focus:border-purple-500 text-sm"
                                value={form.changeFor}
                                onChange={e => setForm({ ...form, changeFor: e.target.value })}
                            />
                        )}
                    </div>

                    {/* Coupon */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-700 mb-3 text-xs uppercase tracking-widest">🎟️ Cupom de Desconto</h3>
                        {coupon ? (
                            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                                <div>
                                    <p className="font-black text-green-700 text-sm">🎉 Cupom aplicado!</p>
                                    <p className="text-xs text-green-600">{couponMsg || 'Desconto garantido!'}</p>
                                </div>
                                <button type="button" onClick={handleRemoveCoupon} className="text-red-400 hover:text-red-600 text-xs font-bold">Remover</button>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Código do cupom"
                                    className="flex-1 border border-gray-200 rounded-lg p-3 outline-none focus:border-purple-500 text-sm uppercase"
                                    value={couponInput}
                                    onChange={e => setCouponInput(e.target.value.toUpperCase())}
                                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleApplyCoupon())}
                                />
                                <button
                                    type="button"
                                    onClick={handleApplyCoupon}
                                    disabled={couponLoading || !couponInput.trim()}
                                    className="bg-gray-800 text-white font-bold px-4 rounded-lg text-sm disabled:opacity-40 transition"
                                >
                                    {couponLoading ? '...' : 'Aplicar'}
                                </button>
                            </div>
                        )}
                        {couponMsg && !coupon && (
                            <p className="text-xs mt-2 text-red-500">{couponMsg}</p>
                        )}
                    </div>

                    {/* Notes */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-700 mb-3 text-xs uppercase tracking-widest">📝 Observações</h3>
                        <textarea
                            rows={2}
                            placeholder="Alguma obs para o pedido? (opcional)"
                            className="border border-gray-200 rounded-lg p-3 w-full outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 resize-none text-sm transition"
                            value={form.notes}
                            onChange={e => setForm({ ...form, notes: e.target.value })}
                        />
                    </div>

                    {/* Order Summary */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2 text-sm">
                        <p className="font-bold text-gray-700 text-xs uppercase tracking-widest mb-2">🧾 Resumo</p>
                        {items.map(item => (
                            <div key={item.menuItemId} className="flex justify-between text-gray-600">
                                <span>{item.qty}x {item.name}</span>
                                <span>R$ {((item.price_cents * item.qty) / 100).toFixed(2).replace('.', ',')}</span>
                            </div>
                        ))}
                        <div className="border-t border-gray-200 pt-2 space-y-1">
                            <div className="flex justify-between text-gray-500">
                                <span>Subtotal</span>
                                <span>R$ {(subtotalCents / 100).toFixed(2).replace('.', ',')}</span>
                            </div>
                            <div className="flex justify-between text-gray-500">
                                <span>Taxa de entrega</span>
                                <span>R$ {(deliveryFeeCents / 100).toFixed(2).replace('.', ',')}</span>
                            </div>
                            {coupon && (
                                <div className="flex justify-between text-green-600 font-semibold">
                                    <span>Desconto ({coupon.code})</span>
                                    <span>− R$ {(discountCents / 100).toFixed(2).replace('.', ',')}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-black text-gray-900 text-base pt-1 border-t border-gray-200">
                                <span>Total</span>
                                <span>R$ {(totalCents / 100).toFixed(2).replace('.', ',')}</span>
                            </div>
                        </div>
                    </div>

                    {/* Sticky Submit CTA */}
                    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 p-4 z-50 shadow-lg">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-black py-4 rounded-xl shadow-lg transition active:scale-95 disabled:opacity-60 text-base"
                        >
                            {loading
                                ? '⏳ Confirmando pedido...'
                                : `✅ Confirmar Pedido · R$ ${(totalCents / 100).toFixed(2).replace('.', ',')}`}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
