'use client';

import React, { useState } from 'react';
import { useCart, type CartItem } from './CartContext';
import { getMenuDisplayName, getMenuPriceLabel } from '../lib/menu-presentation';
import type { CatalogMenuItem } from '../lib/load-menu';

interface UpsellProps {
    allProducts: CatalogMenuItem[];
    showDeliveryReward?: boolean;
}

/**
 * UpsellComponent — O "Coração" da Receita e Aumento de Ticket Médio.
 * Oferece Order Bumps de 1 clique (Bebidas, Potinho Separado de Complementos e Extras).
 */
export default function UpsellComponent({ allProducts, showDeliveryReward = false }: UpsellProps) {
    const {
        items,
        addToCart,
        subtotalCents,
        progressToFreeDelivery,
        isFreeDeliveryEligible,
        freeDeliveryThreshold,
        getRecommendations
    } = useCart();

    const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

    const recommendations = getRecommendations(allProducts);
    const remainingForFree = Math.max(0, freeDeliveryThreshold - subtotalCents);
    const R = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;

    // Checa se já tem potinho separado adicionado na sacola
    const hasPotinhoSeparado = items.some(i => i.menuItemId === 'bump-potinho-separado');

    const handleOneClickAdd = (product: CatalogMenuItem) => {
        const cartItem: CartItem = {
            cartKey: `quick-${product.id}`,
            menuItemId: product.id,
            name: getMenuDisplayName(product),
            base_price_cents: product.price_cents,
            price_cents: product.price_cents,
            qty: 1,
            selected_options: [],
        };
        addToCart(cartItem);
        setAddedIds(prev => ({ ...prev, [product.id]: true }));
        setTimeout(() => {
            setAddedIds(prev => ({ ...prev, [product.id]: false }));
        }, 1500);
    };

    const handleAddPotinhoBump = () => {
        const bumpItem: CartItem = {
            cartKey: 'bump-potinho-separado',
            menuItemId: 'bump-potinho-separado',
            name: 'Potinho Individual de Complementos (Viagem Crocante)',
            base_price_cents: 350,
            price_cents: 350,
            qty: 1,
            notes: 'Enviar complementos secos em potinho 50ml separado para não murchar no trajeto',
            selected_options: [],
        };
        addToCart(bumpItem);
        setAddedIds(prev => ({ ...prev, 'bump-potinho-separado': true }));
        setTimeout(() => {
            setAddedIds(prev => ({ ...prev, 'bump-potinho-separado': false }));
        }, 1500);
    };

    if (subtotalCents === 0 && recommendations.length === 0) return null;

    return (
        <div className="space-y-4 my-5 anim-fade-in">
            {/* 🎯 Barra de Recompensa de Entrega Grátis */}
            {showDeliveryReward && (
                <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-sm overflow-hidden relative">
                    <div className="flex justify-between items-end mb-2">
                        <div>
                            <h3 className="text-sm font-black text-gray-800">
                                {isFreeDeliveryEligible ? '🎉 Entrega Grátis Liberada!' : '🚀 Quase lá!'}
                            </h3>
                            {!isFreeDeliveryEligible && (
                                <p className="text-xs text-gray-500 font-medium">
                                    Adicione mais <span className="text-purple-600 font-bold">{R(remainingForFree)}</span> para frete grátis.
                                </p>
                            )}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-purple-400">Progresso</span>
                    </div>

                    <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(168,85,247,0.4)]"
                            style={{ width: `${progressToFreeDelivery}%` }}
                        />
                    </div>

                    {isFreeDeliveryEligible && (
                        <div className="absolute -right-2 -top-2 opacity-10 text-6xl rotate-12 pointer-events-none">🚚</div>
                    )}
                </div>
            )}

            {/* 📦 Order Bump de Alta Margem: Potinho Separado para Viagem */}
            {!hasPotinhoSeparado && items.length > 0 && (
                <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/70 p-3.5 transition hover:bg-amber-50">
                    <div className="flex items-start gap-3">
                        <span className="text-2xl mt-0.5">🥣</span>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                                    Dica do Chef
                                </span>
                                <h4 className="text-xs font-black text-gray-900">Potinho Separado para Viagem</h4>
                            </div>
                            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                                Seus complementos crocantes (leite em pó, paçoca, granola) embalados à parte para não murchar no trajeto!
                            </p>
                            <div className="flex items-center justify-between mt-2.5">
                                <span className="text-xs font-black text-amber-900">+ R$ 3,50</span>
                                <button
                                    type="button"
                                    onClick={handleAddPotinhoBump}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition active:scale-95 shadow-sm ${
                                        addedIds['bump-potinho-separado']
                                            ? 'bg-green-600 text-white'
                                            : 'bg-amber-600 hover:bg-amber-700 text-white'
                                    }`}
                                >
                                    {addedIds['bump-potinho-separado'] ? '✓ Adicionado!' : '+ Adicionar à Sacola'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 🥤 Smart Recommendations / Order Bump com 1 Toque */}
            {recommendations.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-2.5 px-1">
                        <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                            <span>✨</span> Vai uma bebida gelada?
                        </h3>
                        <span className="text-[11px] font-bold text-purple-600">Adicione com 1 toque</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                        {recommendations.slice(0, 4).map(item => {
                            const isAdded = Boolean(addedIds[item.id]);
                            return (
                                <div
                                    key={`upsell-${item.id}`}
                                    className="bg-white border border-gray-100 rounded-2xl p-3 shadow-xs flex flex-col justify-between transition hover:border-purple-200 hover:shadow-sm"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center shrink-0 overflow-hidden">
                                            {item.image_url ? (
                                                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-xl">🥤</span>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="text-xs font-bold text-gray-900 leading-snug line-clamp-2">
                                                {getMenuDisplayName(item)}
                                            </h4>
                                            <p className="text-xs font-black text-purple-700 mt-0.5">
                                                {getMenuPriceLabel(item)} {R(item.price_cents)}
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handleOneClickAdd(item)}
                                        className={`w-full py-1.5 rounded-xl text-xs font-black transition active:scale-95 flex items-center justify-center gap-1 ${
                                            isAdded
                                                ? 'bg-green-600 text-white'
                                                : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200'
                                        }`}
                                    >
                                        {isAdded ? '✓ Adicionada!' : '+ Adicionar'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
