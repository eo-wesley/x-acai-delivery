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
            <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                {/* Background Decor */}
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
                <div className="absolute -left-4 -bottom-4 w-32 h-32 bg-purple-400/20 rounded-full blur-3xl" />

                <div className="relative z-10">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        {customerName ? `Olá, ${customerName.split(' ')[0]}! 👋` : 'Que bom te ver de novo! 👋'}
                    </h2>
                    <p className="text-white/80 text-sm mt-1">
                        Bom te ver por aqui. Esperamos que seu dia esteja sendo incrível!
                    </p>

                    {lastItem && (
                        <div className="mt-5 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl shadow-inner">
                                        🍇
                                    </div>
                                    <div>
                                        <div className="text-[10px] uppercase tracking-widest text-white/60 font-black">Sugestão Real-Time</div>
                                        <div className="text-sm font-bold truncate">Repetir o {lastItem.name}?</div>
                                    </div>
                                </div>
                                <Link
                                    href={`/product/${lastItem.id}`}
                                    className="bg-white text-purple-700 text-xs font-black px-4 py-2 rounded-xl shadow-lg hover:scale-105 transition-transform active:scale-95"
                                >
                                    PEDIR AGORA
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
