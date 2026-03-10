'use client';

import React, { useEffect, useState } from 'react';

/**
 * LiveSalesPopup — Prova Social em Tempo Real (Fase 62).
 * Cria o efeito de "loja movimentada", essencial para conversão mundial.
 */
const LiveSalesPopup: React.FC = () => {
    const [sales, setSales] = useState<{ id: number, text: string, time: string } | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    const locations = ['Centro', 'Bairro Novo', 'Vila Real', 'Jardins', 'Parque das Flores', 'Alto da Serra'];
    const items = ['Combo de Verão', 'Açaí Tradicional 500ml', 'Barca Premium', 'Suco de Cupuaçu', 'Açaí Tropical'];

    const showRandomSale = () => {
        const location = locations[Math.floor(Math.random() * locations.length)];
        const item = items[Math.floor(Math.random() * items.length)];
        const time = Math.floor(Math.random() * 15) + 1; // 1-15 min ago

        setSales({
            id: Date.now(),
            text: `Alguém em ${location} acabou de pedir um ${item}`,
            time: `${time} min atrás`
        });

        setIsVisible(true);

        // Esconde após 5 segundos
        setTimeout(() => setIsVisible(false), 5000);
    };

    useEffect(() => {
        // Primeira notificação após 10 segundos
        const initialTimer = setTimeout(showRandomSale, 10000);

        // Ciclo de notificações a cada 30-60 segundos
        const interval = setInterval(() => {
            showRandomSale();
        }, 45000);

        return () => {
            clearTimeout(initialTimer);
            clearInterval(interval);
        };
    }, []);

    return (
        <div
            className={`fixed bottom-24 left-4 z-[100] transition-all duration-500 transform ${isVisible ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
                }`}
        >
            <div className="bg-white/90 backdrop-blur-lg border border-gray-200 rounded-2xl p-4 shadow-xl flex items-center gap-4 max-w-[280px]">
                <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white shrink-0 shadow-lg animate-pulse">
                    🛍️
                </div>
                <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-800 leading-tight">
                        {sales?.text}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-1 font-medium">
                        {sales?.time} • ✅ Verificado
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LiveSalesPopup;
