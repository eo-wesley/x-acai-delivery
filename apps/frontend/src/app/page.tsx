'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useCart } from '../components/CartContext';
import { useTenant, getApiBase } from '../hooks/useTenant';
import WelcomeBanner from '../components/WelcomeBanner';
import FidelityStamps from '../components/FidelityStamps';
import {
  filterMenuItems, getEditorialHighlights, getInitialMenuCategory, getMenuCategoryTabs,
  getMenuCardDescription, getMenuDisplayName, getMenuPriceLabel, isMenuItemAvailable, normalizeMenuText,
  sortPublicMenuItems, type MenuPresentationItem,
} from '../lib/menu-presentation';
import { getWaterBundle } from '../lib/water-bundles';
import { loadMenuCatalog } from '../lib/load-menu';
import { canStoreAcceptOrders, loadStoreInfo, storeUnavailableMessage, type StoreInfo } from '../lib/store-availability';

interface MenuItem extends MenuPresentationItem {
  price_cents: number;
  image_url?: string;
}

export default function Home() {
  const { slug, ready } = useTenant();
  const { cartCount } = useCart();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [loadedSlug, setLoadedSlug] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerPoints, setCustomerPoints] = useState(0);

  const load = useCallback(() => {
    if (!ready) return;
    const API = getApiBase();
    const phone = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('customer_data') || '{}')?.phone : null;

    Promise.allSettled([
      loadMenuCatalog(API, slug),
      loadStoreInfo(API, slug),
      phone ? fetch(`${API}/api/${slug}/loyalty/me?phone=${phone}`).then(r => r.json()).catch(() => null) : Promise.resolve(null),
    ]).then(([menuRes, storeRes, loyaltyRes]) => {
      setMenuItems(menuRes.status === 'fulfilled' ? menuRes.value : []);
      setStore(storeRes.status === 'fulfilled' ? storeRes.value : null);
      if (loyaltyRes.status === 'fulfilled' && loyaltyRes.value) {
        setCustomerPoints(loyaltyRes.value.points || 0);
      }
      setLoadedSlug(slug);
    });
  }, [slug, ready]);

  useEffect(() => { load(); }, [load]);

  const loading = !ready || loadedSlug !== slug;
  const canOrder = canStoreAcceptOrders(store);

  const publicMenuItems = sortPublicMenuItems(menuItems);
  const categoryTabs = getMenuCategoryTabs(publicMenuItems);
  const activeCategory = categoryTabs.some(tab => tab.key === category) ? category : getInitialMenuCategory(publicMenuItems);
  const query = normalizeMenuText(searchTerm);
  const filtered = filterMenuItems(publicMenuItems, activeCategory, searchTerm);
  const highlights = getEditorialHighlights(publicMenuItems);
  const waterBundles = publicMenuItems.flatMap(item => {
    const bundles = [getWaterBundle(menuItems, item.id, 'water'), getWaterBundle(menuItems, item.id, 'two-waters')];
    return bundles.filter(bundle => bundle !== null);
  });
  const visibleBundles = waterBundles.filter(bundle => query
    ? normalizeMenuText(`${bundle.title} ${bundle.description} Açaí Combos`).includes(query)
    : activeCategory === 'acai combos');

  const R = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;

  const themeVars = {
    '--primary': store?.primary_color || '#9333ea',
    '--primary-hover': (store?.primary_color || '#9333ea') + 'ee',
    'fontFamily': store?.font_family ? `'${store.font_family}', sans-serif` : 'inherit',
  } as React.CSSProperties;

  if (loading) return (
    <div className="p-4 pb-24">
      <div className="h-36 bg-purple-100 rounded-2xl animate-pulse mb-4" />
      {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse mb-3" />)}
    </div>
  );

  return (
    <div className="bg-gray-50">
      <div className={`max-w-md mx-auto bg-white shadow-sm min-h-screen relative ${cartCount > 0 ? 'pb-44' : 'pb-24'}`} style={themeVars}>
        {/* Store Banner / Header */}
        <div
          className="text-white p-5 pt-8 pb-16 relative bg-cover bg-center"
          style={{
            backgroundColor: 'var(--primary)',
            backgroundImage: store?.banner_url ? `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${store.banner_url})` : undefined
          }}
        >
          <div className="flex items-center gap-3">
            {store?.logo_url && (
              <img src={store.logo_url} className="w-12 h-12 rounded-xl object-contain bg-white p-1" alt="Logo" />
            )}
            <h1 className="text-2xl font-black">{store?.name || '🍇 X-Açaí Delivery'}</h1>
          </div>
          {store?.description && <p className="text-white/80 text-sm mt-1">{store.description}</p>}
          <div className="flex gap-3 mt-3 flex-wrap">
            {store?.prep_time_minutes && (
              <span className="text-xs bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">⏱ {store.prep_time_minutes} min</span>
            )}
            <span className="text-xs bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">🚚 Frete calculado no checkout</span>
            {store?.min_order_cents ? (
              <span className="text-xs bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">🛒 Mín. {R(store.min_order_cents)}</span>
            ) : null}
          </div>
        </div>

        {/* Store Status Banner */}
        {!canOrder && (
          <div role="status" className={`mx-4 -mt-8 relative z-10 rounded-2xl p-4 shadow-lg ${store?.store_status === 'closed' ? 'bg-red-600 text-white' : 'bg-yellow-400 text-yellow-900'
            }`}>
            <div className="font-black text-lg">
              {!store ? 'Prévia — pedidos indisponíveis' : store.store_status === 'closed' ? '🔴 Loja Fechada' :
                store?.store_status === 'paused' ? '⏸️ Pedidos Pausados' :
                  store?.store_status === 'busy' ? '🟠 Estamos Lotados' : 'Pedidos indisponíveis'}
            </div>
            <p className="text-sm mt-1 opacity-90">
              {storeUnavailableMessage(store)}
            </p>
          </div>
        )}

        <WelcomeBanner />

        <div className="p-4">
          {/* Phase 63: Fidelity Progress */}
          {ready && customerPoints > 0 && (
            <div className="mb-8">
              <FidelityStamps points={customerPoints} />
            </div>
          )}
          {/* Search Bar */}
          <div className="mb-6 relative">
            <input
              type="text"
              aria-label="Buscar em todo o cardápio"
              placeholder="Buscar açaí, suco, acompanhamento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-2xl py-3 px-10 pl-12 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all font-medium"
            />
            <span className="absolute left-4 top-3 text-xl opacity-50">🔍</span>
            {searchTerm && (
              <button aria-label="Limpar busca" onClick={() => setSearchTerm('')} className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600 font-bold">✕</button>
            )}
          </div>

          {/* Editorial suggestions; these do not represent a sales ranking. */}
          {!query && highlights.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">⭐ Destaques da X-Açaí</h2>
              <p className="text-sm text-gray-500 mt-1 mb-3">Sugestões para começar seu pedido.</p>
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x">
                {highlights.map(item => (
                  <Link href={`/product/${item.id}`} key={`high-${item.id}`}
                    className="shrink-0 w-56 max-w-[85%] bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden snap-start flex flex-col transition hover:shadow-md">
                    <div className="h-32 bg-purple-50 relative flex items-center justify-center text-5xl">
                      {item.image_url
                        ? <img src={item.image_url} alt={getMenuDisplayName(item)} className="object-cover w-full h-full" />
                        : '🍇'}
                    </div>
                    <div className="p-3 flex flex-col flex-1">
                      <h3 className="font-bold text-gray-800 text-sm leading-snug break-words">{getMenuDisplayName(item)}</h3>
                      <div className="mt-auto pt-3">
                        {getMenuPriceLabel(item) && <p className="text-xs text-gray-600 mb-0.5">{getMenuPriceLabel(item)}</p>}
                        <div className="font-black text-purple-700">{R(item.price_cents)}</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Categories Slider */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide snap-x" aria-label="Categorias do cardápio">
            {categoryTabs.map(tab => (
              <button key={tab.key} onClick={() => { setCategory(tab.key); setSearchTerm(''); }}
                aria-pressed={!query && activeCategory === tab.key}
                className={`flex-shrink-0 snap-start px-5 py-2.5 rounded-full text-sm font-black border transition-all ${!query && activeCategory === tab.key ? 'bg-purple-600 text-white border-purple-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'
                  }`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Menu Items */}
          <h2 className="font-black text-lg text-gray-800 mb-3">
            {query ? 'Resultados em todo o cardápio' : categoryTabs.find(tab => tab.key === activeCategory)?.label}
          </h2>
          <div className="flex flex-col gap-4">
            {visibleBundles.map(bundle => (
              <Link href={bundle.href} key={bundle.href}
                className="flex rounded-xl border border-purple-100 bg-purple-50/50 p-3 gap-3 items-start transition hover:shadow-md active:scale-[0.98]">
                <div className="w-20 h-24 shrink-0 relative">
                  <div className="w-20 h-20 rounded-xl bg-white flex items-center justify-center overflow-hidden text-3xl">
                    {bundle.baseProduct.image_url
                      ? <img src={bundle.baseProduct.image_url} alt={getMenuDisplayName(bundle.baseProduct)} className="object-cover w-full h-full" />
                      : '🍇'}
                  </div>
                  <div className="absolute bottom-0 right-0 w-9 h-12 rounded-lg bg-white border border-purple-100 flex items-center justify-center overflow-hidden">
                    {bundle.waterProduct.image_url
                      ? <img src={bundle.waterProduct.image_url} alt={bundle.waterProduct.name} className="object-contain w-full h-full" />
                      : '💧'}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-purple-700 mb-1">{bundle.waterQty === 1 ? '1 água incluída' : `${bundle.waterQty} águas incluídas`}</p>
                  <h3 className="font-bold text-gray-800 text-base leading-snug break-words">{bundle.title}</h3>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">{bundle.description}</p>
                  <p className="text-xs text-gray-600 mt-3">Preço do conjunto</p>
                  <p className="font-black text-purple-700 text-lg">A partir de {R(bundle.price_cents)}</p>
                </div>
              </Link>
            ))}
            {filtered.map(item => {
              const unavailable = !isMenuItemAvailable(item);
              const outOfStock = item.out_of_stock === 1 || item.out_of_stock === true;
              return (
                <Link
                  href={unavailable ? '#' : `/product/${item.id}`}
                  key={item.id}
                  aria-disabled={unavailable}
                  className={`flex bg-white rounded-xl shadow-sm border border-gray-100 p-3 gap-3 items-start transition ${unavailable ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-md active:scale-[0.98]'}`}
                  onClick={(e) => { if (unavailable) e.preventDefault(); }}
                >
                  <div className="w-20 h-20 bg-purple-50 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 text-3xl relative">
                    {item.image_url
                      ? <img src={item.image_url} alt={getMenuDisplayName(item)} className="object-cover w-full h-full" />
                      : '🍇'}
                    {outOfStock && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="text-white text-xs font-black">ESGOTADO</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col py-1">
                    <h3 className="font-bold text-gray-800 text-base leading-snug break-words">{getMenuDisplayName(item)}</h3>
                    {getMenuCardDescription(item) && <p className="text-xs text-gray-500 mt-1 line-clamp-3 leading-relaxed">{getMenuCardDescription(item)}</p>}
                    <div className="mt-auto pt-2 flex items-end justify-between gap-2 flex-wrap">
                      <div>
                        {getMenuPriceLabel(item) && <p className="text-xs text-gray-600 mb-0.5">{getMenuPriceLabel(item)}</p>}
                        <div className="font-black text-purple-700 text-lg">{R(item.price_cents)}</div>
                      </div>
                      {unavailable && !outOfStock && (
                        <span className="text-xs text-orange-700 font-bold bg-orange-50 px-2 py-1 rounded">Indisponível hoje</span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}

            {filtered.length === 0 && visibleBundles.length === 0 && (
              <div className="text-center text-gray-400 mt-16">
                <div className="text-5xl mb-4">🥣</div>
                <p className="font-semibold">
                  {menuItems.length === 0 ? 'Cardápio vazio ou servidor offline.' : query ? 'Nenhum item encontrado para sua busca.' : 'Nenhum item nessa categoria.'}
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
