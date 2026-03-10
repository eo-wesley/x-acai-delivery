'use client';

import { useState, useEffect, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type Rating = {
    id: string;
    order_id: string;
    customer_name?: string;
    stars: number;
    comment?: string;
    total_cents: number;
    order_date: string;
    created_at: string;
};

function Stars({ n }: { n: number }) {
    return (
        <div className="flex gap-0.5">
            {Array.from({ length: 5 }, (_, i) => (
                <span key={i} className={`text-lg ${i < n ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
            ))}
        </div>
    );
}

function getToken() { return localStorage.getItem('admin_token') || ''; }
function getSlug() { return localStorage.getItem('admin_slug') || 'default'; }

export default function AdminRatings() {
    const [ratings, setRatings] = useState<Rating[]>([]);
    const [loading, setLoading] = useState(true);

    const loadRatings = useCallback(async () => {
        try {
            const res = await fetch(`${API}/api/admin/ratings?slug=${getSlug()}`, {
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            if (res.ok) setRatings(await res.json());
        } catch { }
        setLoading(false);
    }, []);

    useEffect(() => { loadRatings(); }, [loadRatings]);

    const avg = ratings.length ? (ratings.reduce((s, r) => s + r.stars, 0) / ratings.length).toFixed(1) : '–';

    const getSentiment = (stars: number) => {
        if (stars >= 4) return { label: 'Satisfeito', color: 'bg-green-100 text-green-700', icon: '😊' };
        if (stars === 3) return { label: 'Neutro', color: 'bg-yellow-100 text-yellow-700', icon: '😐' };
        return { label: 'Crítico', color: 'bg-red-100 text-red-700', icon: '🚨' };
    };

    return (
        <div className="max-w-5xl mx-auto pb-20">
            <header className="mb-8">
                <h1 className="text-3xl font-black text-gray-800 flex items-center gap-2">
                    ⭐ Avaliações e Sentimento
                </h1>
                <p className="text-gray-500">Acompanhe a satisfação dos seus clientes em tempo real.</p>
            </header>

            {/* Premium Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-3xl p-6 text-white shadow-lg shadow-yellow-100">
                    <div className="text-sm font-bold uppercase opacity-80 tracking-widest">Média Geral</div>
                    <div className="flex items-end gap-2 mt-2">
                        <span className="text-5xl font-black">{avg}</span>
                        <span className="text-xl mb-1 opacity-80">/ 5.0</span>
                    </div>
                </div>
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                    <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">Total de Reviews</div>
                    <div className="text-4xl font-black text-purple-600 mt-2">{ratings.length}</div>
                    <div className="mt-4 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500" style={{ width: '100%' }}></div>
                    </div>
                </div>
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                    <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">Satisfação</div>
                    <div className="text-4xl font-black text-green-600 mt-2">
                        {ratings.length ? Math.round((ratings.filter(r => r.stars >= 4).length / ratings.length) * 100) : 0}%
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Baseado em avaliações 4-5 estrelas.</p>
                </div>
            </div>

            {/* Ratings List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="grid grid-cols-1 gap-4">
                        {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-2xl"></div>)}
                    </div>
                ) : ratings.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-100">
                        <div className="text-6xl mb-4">📭</div>
                        <h3 className="text-xl font-bold text-gray-700">Tudo calmo por aqui</h3>
                        <p className="text-gray-400 max-w-xs mx-auto mt-2">As avaliações aparecerão conforme os clientes concluírem seus pedidos.</p>
                    </div>
                ) : (
                    ratings.map(r => {
                        const sentiment = getSentiment(r.stars);
                        return (
                            <div key={r.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${r.stars >= 4 ? 'bg-green-500' : r.stars === 3 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>

                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Stars n={r.stars} />
                                            <span className="text-lg font-black text-gray-800">{r.customer_name || 'Cliente'}</span>
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${sentiment.color}`}>
                                                {sentiment.icon} {sentiment.label}
                                            </span>
                                        </div>
                                        {r.comment ? (
                                            <p className="text-gray-600 bg-gray-50 p-4 rounded-2xl mt-3 italic relative">
                                                <span className="text-3xl text-gray-200 absolute -top-2 left-2 font-serif opacity-50">"</span>
                                                {r.comment}
                                            </p>
                                        ) : (
                                            <p className="text-gray-400 text-sm mt-2 italic">Sem comentário adicional.</p>
                                        )}
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-1">
                                        <div className="text-sm font-black text-gray-800">Pedido #{r.order_id.slice(0, 8).toUpperCase()}</div>
                                        <div className="text-xs text-gray-400">R$ {(r.total_cents / 100).toFixed(2).replace('.', ',')}</div>
                                        <div className="text-[10px] text-gray-300 font-bold uppercase mt-2">{new Date(r.created_at).toLocaleString('pt-BR')}</div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
