'use client';

import React from 'react';
import { Star, CheckCircle2 } from 'lucide-react';

interface FidelityStampsProps {
    points: number;
    pointsPerStamp?: number;
    totalStamps?: number;
}

/**
 * FidelityStamps — O "Vício" Saudável da Fase 63.
 * Transforma pontos abstratos em um cartão de selos visual e gratificante.
 */
const FidelityStamps: React.FC<FidelityStampsProps> = ({
    points,
    pointsPerStamp = 100,
    totalStamps = 10
}) => {
    const stampsEarned = Math.floor(points / pointsPerStamp);
    const progress = Math.min(stampsEarned, totalStamps);
    const remaining = totalStamps - progress;
    const percentage = (progress / totalStamps) * 100;

    return (
        <div className="bg-white rounded-[2.5rem] p-6 border border-gray-100 shadow-xl shadow-gray-200/50">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h3 className="text-xl font-black text-gray-900 tracking-tighter uppercase mb-1 flex items-center gap-2">
                        Seu Cartão Fidelidade
                    </h3>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                        {remaining > 0
                            ? `Faltam ${remaining} ${remaining === 1 ? 'selo' : 'selos'} para o próximo prêmio!`
                            : '🎉 Você completou o cartão! Resgate seu prêmio.'}
                    </p>
                </div>
                <div className="text-right">
                    <span className="text-2xl font-black text-purple-600 leading-none">{progress}</span>
                    <span className="text-gray-300 font-black">/{totalStamps}</span>
                </div>
            </div>

            {/* Stamps Grid */}
            <div className="grid grid-cols-5 gap-3 mb-6">
                {Array.from({ length: totalStamps }).map((_, i) => {
                    const isEarned = i < progress;
                    return (
                        <div
                            key={i}
                            className={`aspect-square rounded-2xl flex items-center justify-center transition-all duration-500 transform ${isEarned
                                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-200 rotate-0 scale-100'
                                    : 'bg-gray-50 text-gray-200 border-2 border-dashed border-gray-200 rotate-6 scale-90'
                                }`}
                        >
                            {isEarned ? (
                                <CheckCircle2 size={24} className="animate-in zoom-in duration-300" />
                            ) : (
                                <Star size={20} className="opacity-30" />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Progress Bar Container */}
            <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                    <div>
                        <span className="text-[10px] font-black inline-block py-1 px-3 uppercase rounded-full text-purple-600 bg-purple-50 tracking-widest">
                            Progresso Real
                        </span>
                    </div>
                    <div className="text-right">
                        <span className="text-xs font-black inline-block text-purple-600">
                            {Math.round(percentage)}%
                        </span>
                    </div>
                </div>
                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded-full bg-gray-100">
                    <div
                        style={{ width: `${percentage}%` }}
                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-purple-600 transition-all duration-1000 ease-out"
                    ></div>
                </div>
            </div>

            {progress === totalStamps && (
                <button className="w-full bg-gray-900 text-white font-black py-4 rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-xs">
                    Resgatar meu Açaí Grátis 🥣🔥
                </button>
            )}
        </div>
    );
};

export default FidelityStamps;
