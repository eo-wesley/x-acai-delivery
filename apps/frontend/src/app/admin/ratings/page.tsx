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
    return <span>{Array.from({ length: 5 }, (_, i) => <span key={i} className={i < n ? 'text-yellow-400' : 'text-gray-200'}>★</span>)}</span>;
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

    return (
        <div>
            <h1 className="text-2xl font-black text-gray-800 mb-6">⭐ Avaliações dos Clientes</h1>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
                    <div className="text-3xl font-black text-yellow-500">{avg}</div>
                    <div className="text-xs text-gray-500 mt-1 uppercase tracking-wide">Média ⭐</div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
                    <div className="text-3xl font-black text-purple-600">{ratings.length}</div>
                    <div className="text-xs text-gray-500 mt-1 uppercase tracking-wide">Total</div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
                    <div className="text-3xl font-black text-green-600">{ratings.filter(r => r.stars >= 4).length}</div>
                    <div className="text-xs text-gray-500 mt-1 uppercase tracking-wide">4-5 estrelas ✅</div>
                </div>
            </div>

            {/* Ratings list */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-400 animate-pulse">Carregando...</div>
                ) : ratings.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                        <div className="text-4xl mb-3">⭐</div>
                        <p>Nenhuma avaliação ainda.</p>
                        <p className="text-xs mt-1">As avaliações aparecem após pedidos serem concluídos.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {ratings.map(r => (
                            <div key={r.id} className="p-4 hover:bg-gray-50 transition">
                                <div className="flex items-start justify-between gap-3 flex-wrap">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Stars n={r.stars} />
                                            <span className="text-sm font-black text-gray-700">{r.customer_name || 'Cliente'}</span>
                                        </div>
                                        {r.comment && (
                                            <p className="text-sm text-gray-600 italic mt-1">"{r.comment}"</p>
                                        )}
                                        <p className="text-xs text-gray-400 mt-1.5">
                                            Pedido #{r.order_id.slice(0, 8).toUpperCase()} · R$ {(r.total_cents / 100).toFixed(2).replace('.', ',')} ·{' '}
                                            {new Date(r.created_at).toLocaleDateString('pt-BR')}
                                        </p>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-xs font-bold flex-shrink-0 ${r.stars >= 4 ? 'bg-green-100 text-green-700' : r.stars === 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600'}`}>
                                        {r.stars >= 4 ? '😄 Ótimo' : r.stars === 3 ? '😐 Regular' : '😞 Ruim'}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
