'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function SearchPage() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
            const res = await fetch(`${API_URL}/api/menu/search?q=${encodeURIComponent(query)}`);
            if (res.ok) {
                const data = await res.json();
                setResults(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 pb-20">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Buscar no Cardápio</h2>
            <form onSubmit={handleSearch} className="flex gap-2 mb-6 relative">
                <input
                    type="text"
                    placeholder="Ex: açaí, morango..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all shadow-sm"
                />
                <button type="submit" disabled={loading} className="bg-purple-600 hover:bg-purple-700 text-white px-6 rounded-lg font-semibold transition-colors disabled:opacity-50">
                    {loading ? '...' : 'Ir'}
                </button>
            </form>

            <div className="flex flex-col gap-3">
                {results.map((item: any) => (
                    <Link key={item.id} href={`/product/${item.id}`}>
                        <div className="flex bg-white rounded-lg shadow-sm border border-gray-100 p-3 items-center hover:bg-gray-50 transition-colors">
                            <div className="flex-1">
                                <h3 className="font-semibold text-gray-800">{item.name}</h3>
                                <div className="font-bold text-purple-600 mt-1">R$ {(item.price_cents / 100).toFixed(2)}</div>
                            </div>
                            <div className="text-gray-400 text-sm">{">"}</div>
                        </div>
                    </Link>
                ))}
                {!loading && query && results.length === 0 && (
                    <div className="text-center text-gray-500 py-10">Nenhum item encontrado.</div>
                )}
            </div>
        </div>
    );
}
