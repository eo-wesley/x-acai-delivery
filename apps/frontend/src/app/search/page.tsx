'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTenant, getApiBase } from '../../hooks/useTenant';
import { loadMenuCatalog, type CatalogMenuItem } from '../../lib/load-menu';
import { filterMenuItems, getMenuDisplayName, getMenuPriceLabel, isMenuItemAvailable, sortPublicMenuItems } from '../../lib/menu-presentation';

export default function SearchPage() {
    const { slug, ready } = useTenant();
    const [query, setQuery] = useState('');
    const [catalog, setCatalog] = useState<CatalogMenuItem[]>([]);
    const [loadedSlug, setLoadedSlug] = useState<string | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (!ready) return;
        let cancelled = false;
        loadMenuCatalog(getApiBase(), slug).then(items => {
            if (cancelled) return;
            setCatalog(items);
            setFailed(false);
            setLoadedSlug(slug);
        }).catch(() => {
            if (cancelled) return;
            setCatalog([]);
            setFailed(true);
            setLoadedSlug(slug);
        });
        return () => { cancelled = true; };
    }, [slug, ready]);

    const loading = !ready || loadedSlug !== slug;
    const results = query.trim() ? filterMenuItems(sortPublicMenuItems(catalog), null, query) : [];

    return (
        <div className="bg-gray-50 min-h-screen">
            <div className="max-w-md mx-auto bg-white shadow-sm min-h-screen p-4 pb-28 relative">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Buscar no Cardápio</h2>
                <div className="mb-6 relative">
                    <label htmlFor="menu-search" className="sr-only">Buscar produto</label>
                    <input
                        id="menu-search"
                        type="search"
                        placeholder="Ex: açaí, morango..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full min-w-0 border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all shadow-sm"
                    />
                </div>

                <div className="flex flex-col gap-3" aria-live="polite">
                    {loading && <p className="text-gray-500 text-center py-10">Carregando cardápio...</p>}
                    {!loading && failed && <p className="text-gray-500 text-center py-10">Não foi possível carregar o cardápio. Tente novamente em instantes.</p>}
                    {!loading && !failed && results.map(item => (
                        <Link key={item.id} href={`/product/${item.id}`}>
                            <div className="flex bg-white rounded-lg shadow-sm border border-gray-100 p-3 items-center hover:bg-gray-50 transition-colors">
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-gray-800">{getMenuDisplayName(item)}</h3>
                                    <p className="text-xs text-gray-500 mt-1">{item.category}</p>
                                    <div className="font-bold text-purple-600 mt-1">{getMenuPriceLabel(item)} R$ {(item.price_cents / 100).toFixed(2).replace('.', ',')}</div>
                                    {!isMenuItemAvailable(item) && <p className="text-xs text-gray-500 mt-1">Indisponível no momento</p>}
                                </div>
                                <div className="text-gray-400 text-sm">{">"}</div>
                            </div>
                        </Link>
                    ))}
                    {!loading && !failed && query.trim() && results.length === 0 && (
                        <div className="text-center text-gray-500 py-10">Nenhum item encontrado.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
