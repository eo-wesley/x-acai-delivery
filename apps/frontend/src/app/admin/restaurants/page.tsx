'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export default function RestaurantsListPage() {
    const [restaurants, setRestaurants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const handleManage = (rest: any) => {
        localStorage.setItem('admin_slug', rest.slug);
        localStorage.setItem('admin_restaurant_id', rest.id);
        window.dispatchEvent(new Event('tenant_changed'));
        window.location.href = '/admin/orders';
    };

    const fetchRestaurants = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('admin_token');
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
            const res = await fetch(`${API_URL}/api/super/restaurants`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setRestaurants(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-gray-800 flex items-center gap-2">
                        🏢 Lojas (Tenants)
                    </h1>
                    <p className="text-gray-500 font-medium mt-1 text-sm">Visão do Super Admin: Todas as Franquias / Lojistas do SaaS</p>
                </div>
                <Link
                    href="/admin/restaurants/new"
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 md:py-2 px-6 rounded-xl shadow-lg shadow-purple-600/30 transition flex items-center gap-2"
                >
                    <span className="text-xl">+</span> Novo Lojista
                </Link>
            </div>

            {loading ? (
                <div className="text-center p-10 text-gray-500 font-bold animate-pulse text-lg">Carregando carteira de clientes SaaS...</div>
            ) : restaurants.length === 0 ? (
                <div className="bg-white border rounded-2xl p-10 text-center shadow-sm">
                    <p className="text-gray-500 font-medium text-lg mb-4">Nenhum Lojista cadastrado no sistema ainda.</p>
                    <Link href="/admin/restaurants/new" className="text-purple-600 font-bold hover:underline">
                        → Cadastrar Primeiro Lojista
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {restaurants.map(rest => (
                        <div key={rest.id} className="bg-white border rounded-2xl p-6 shadow-sm hover:shadow-md transition group overflow-hidden relative">
                            {/* Color Header Indicator */}
                            <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: rest.primary_color || '#8B5CF6' }}></div>

                            <div className="flex justify-between items-start mb-4 mt-2">
                                <div>
                                    <h3 className="text-xl font-black text-gray-800">{rest.name}</h3>
                                    <p className="text-sm text-gray-400 font-medium">Slug: <span className="text-gray-600 font-mono bg-gray-100 px-1 rounded">{rest.slug}</span></p>
                                </div>
                                <span className={`px-2 py-1 text-[10px] uppercase font-black tracking-wider rounded-lg ${rest.theme === 'dark' ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-600'}`}>
                                    {rest.theme}
                                </span>
                            </div>

                            {rest.slogan && (
                                <p className="text-gray-500 text-sm mb-4 italic truncate">"{rest.slogan}"</p>
                            )}

                            <div className="text-xs text-gray-400 border-t pt-4 flex justify-between items-center">
                                <span>Cadastrado em: {new Date(rest.created_at).toLocaleDateString('pt-BR')}</span>
                                <button
                                    onClick={() => handleManage(rest)}
                                    className="bg-purple-50 text-purple-600 font-black px-3 py-1 rounded-lg hover:bg-purple-600 hover:text-white transition text-[10px] uppercase"
                                >
                                    Gerenciar ⚡
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
