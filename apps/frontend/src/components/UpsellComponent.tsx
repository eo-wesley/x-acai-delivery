'use client';

import React from 'react';
import { useCart } from './CartContext';
import Link from 'next/link';

interface UpsellProps {
    allProducts: any[];
}

/**
 * UpsellComponent — O "Coração" da Receita na Fase 61.
 * Exibe progresso para recompensas e recomendações inteligentes.
 */
export default function UpsellComponent({ allProducts }: UpsellProps) {
    const {
        subtotalCents,
        progressToFreeDelivery,
        isFreeDeliveryEligible,
        freeDeliveryThreshold,
        getRecommendations
    } = useCart();

    const recommendations = getRecommendations(allProducts);
    const remainingForFree = Math.max(0, freeDeliveryThreshold - subtotalCents);
    const R = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;

    if (subtotalCents === 0) return null;

    return (
        <div className="space-y-6 my-6 anim-fade-in">
            {/* 🎯 Reward Progress Bar */}
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

            {/* 🍟 Smart Recommendations */}
            {recommendations.length > 0 && (
                <div>
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 px-1">
                        ✨ Combina perfeitamente com seu pedido
                    </h3>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
                        {recommendations.map(item => (
                            <Link
                                href={`/product/${item.id}`}
                                key={`upsell-${item.id}`}
                                className="shrink-0 w-40 bg-white border border-gray-100 rounded-2xl p-3 shadow-sm snap-start hover:shadow-md transition active:scale-95"
                            >
                                <div className="h-24 bg-purple-50 rounded-xl mb-2 flex items-center justify-center text-3xl overflow-hidden">
                                    {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" /> : '🥤'}
                                </div>
                                <h4 className="text-xs font-bold text-gray-800 truncate">{item.name}</h4>
                                <div className="flex items-center justify-between mt-1">
                                    <span className="text-sm font-black text-purple-600">{R(item.price_cents)}</span>
                                    <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs">+</div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
