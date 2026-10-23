'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

/**
 * WelcomeBanner — O "Anfitrião" da Fase 62.
 * Reconhece o cliente e traz um toque de personalização mundial.
 */
const WelcomeBanner: React.FC = () => {
    const [customerName, setCustomerName] = useState<string | null>(null);
    const [lastItem, setLastItem] = useState<{ id: string, name: string } | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Recupera dados do cliente (salvos no localStorage durante o checkout)
        const savedName = localStorage.getItem('customer_name');
        const lastOrder = localStorage.getItem('last_order_details');

        if (savedName) setCustomerName(savedName);
        if (lastOrder) {
            try {
                const parsed = JSON.parse(lastOrder);
                setLastItem(parsed);
            } catch (e) { /* ignore */ }
        }

        // Delay para animação de entrada
        const timer = setTimeout(() => setIsVisible(true), 100);
        return () => clearTimeout(timer);
    }, []);

    if (!customerName && !lastItem) return null;

    return (
        <div className={`transition-all duration-700 ease-out p-4 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
            <div className="relative overflow-hidden rounded-[24px] bg-purple-800 p-5 text-white shadow-[0_14px_36px_rgba(43,11,53,0.14)]">
                <div className="absolute -right-10 -top-16 h-40 w-40 rounded-full border-[24px] border-white/[0.04]" aria-hidden="true" />
                <div className="relative z-10">
                    <h2 className="text-lg font-semibold tracking-tight">
                        {customerName ? `Oi, ${customerName.split(' ')[0]}.` : 'Que bom ter você de volta.'}
                    </h2>
                    <p className="mt-1 text-sm text-white/75">
                        Continue escolhendo o que vai na sua próxima tigela.
                    </p>

                    {lastItem && (
                        <div className="mt-4 rounded-2xl border border-white/15 bg-white/[0.07] p-3">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#DCEB83] p-2">
                                        <img src="/brand/x-acai-micro-amora.svg" alt="" className="h-full w-full object-contain" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/60">Seu último item</div>
                                        <div className="truncate text-sm font-semibold">{lastItem.name}</div>
                                    </div>
                                </div>
                                <Link
                                    href={`/product/${lastItem.id}`}
                                    className="shrink-0 rounded-full bg-[#DCEB83] px-4 py-2.5 text-xs font-bold text-[#2B0B35] transition hover:brightness-95 active:scale-95"
                                >
                                    Ver item
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WelcomeBanner;
