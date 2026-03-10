'use client';

import React, { useState, useEffect } from 'react';
import { Timer, Zap, ArrowRight } from 'lucide-react';

/**
 * FlashDealBanner — O Gatilho de Urgência da Fase 63.
 * Cria escassez artificial e real para converter o cliente indeciso.
 */
const FlashDealBanner: React.FC = () => {
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Lógica de Persistência do Timer (Session-based)
        const sessionKey = 'flash_deal_expiry';
        const now = Date.now();
        let expiry = Number(sessionStorage.getItem(sessionKey));

        if (!expiry || expiry < now) {
            // Nova oferta de 20 minutos
            expiry = now + 20 * 60 * 1000;
            sessionStorage.setItem(sessionKey, expiry.toString());
        }

        const updateTimer = () => {
            const remaining = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
            setTimeLeft(remaining);
            if (remaining > 0) setIsVisible(true);
            else setIsVisible(false);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, []);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (!isVisible) return null;

    return (
        <div className="px-4 py-2">
            <div className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-600 rounded-3xl p-4 text-white shadow-xl relative overflow-hidden group">
                {/* Animated Background Rays */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.2),transparent)] animate-pulse" />

                <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white shadow-inner animate-bounce duration-[2000ms]">
                            <Zap size={24} fill="currentColor" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-md">Oferta Relâmpago</span>
                                <div className="flex items-center gap-1 text-[10px] font-black text-orange-100 uppercase animate-pulse">
                                    <Timer size={12} /> {formatTime(timeLeft)}
                                </div>
                            </div>
                            <h4 className="text-lg font-black leading-tight mt-0.5 tracking-tighter">
                                15% OFF EM TODO O MENU! 🚀
                            </h4>
                        </div>
                    </div>

                    <button className="bg-white text-red-600 p-3 rounded-2xl shadow-lg group-hover:scale-110 transition-transform active:scale-90 flex items-center justify-center">
                        <ArrowRight size={20} strokeWidth={3} />
                    </button>
                </div>

                {/* Glassy Progress Sub-bar */}
                <div className="mt-3 h-1 w-full bg-white/20 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-white transition-all duration-1000 ease-linear shadow-[0_0_10px_white]"
                        style={{ width: `${(timeLeft / (20 * 60)) * 100}%` }}
                    />
                </div>
                <p className="text-[9px] text-white/70 font-bold uppercase mt-1.5 text-center tracking-widest">
                    Válido para os próximos {Math.ceil(timeLeft / 60)} minutos • Use o cupom: <span className="text-white">FLASH15</span>
                </p>
            </div>
        </div>
    );
};

export default FlashDealBanner;
