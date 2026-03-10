'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useCart } from '../components/CartContext';
import { useTenant, getApiBase } from '../hooks/useTenant';
import WelcomeBanner from '../components/WelcomeBanner';
import LiveSalesPopup from '../components/LiveSalesPopup';
import FidelityStamps from '../components/FidelityStamps';
import FlashDealBanner from '../components/FlashDealBanner';

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price_cents: number;
  category?: string;
  image_url?: string;
  available?: number;
  out_of_stock?: number;
  hidden?: number;
  tags?: string[];
}

interface StoreInfo {
  name: string;
  store_status: string;
  temp_close_reason?: string;
  description?: string;
  prep_time_minutes?: number;
  delivery_fee_cents?: number;
  min_order_cents?: number;
  banner_url?: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  font_family?: string;
  can_accept_orders?: boolean;
}

export default function Home() {
  const { slug, ready } = useTenant();
  const { addToCart, cartCount } = useCart();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [customerPoints, setCustomerPoints] = useState(0);

  const load = useCallback(() => {
    if (!ready) return;
    const API = getApiBase();
    setLoading(true);

    const phone = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('customer_data') || '{}')?.phone : null;

    Promise.allSettled([
      fetch(`${API}/api/${slug}/menu`).then(r => r.json()),
      fetch(`${API}/api/${slug}/store`).then(r => r.json()).catch(() => null),
      phone ? fetch(`${API}/api/${slug}/loyalty/me?phone=${phone}`).then(r => r.json()).catch(() => null) : Promise.resolve(null),
    ]).then(([menuRes, storeRes, loyaltyRes]) => {
      if (menuRes.status === 'fulfilled') setMenuItems(Array.isArray(menuRes.value) ? menuRes.value : []);
      if (storeRes.status === 'fulfilled' && storeRes.value) setStore(storeRes.value);
      if (loyaltyRes.status === 'fulfilled' && loyaltyRes.value) {
        setCustomerPoints(loyaltyRes.value.points || 0);
      }
      setLoading(false);
    });
  }, [slug, ready]);

  useEffect(() => { load(); }, [load]);

  const storeOpen = !store || store.store_status === 'open';
  const canOrder = !store || store.can_accept_orders !== false;

  const categories = ['', ...Array.from(new Set(menuItems.map(m => m.category).filter(Boolean)))];

  const filtered = menuItems.filter(m =>
    m.hidden !== 1 &&
    (!category || m.category === category) &&
    (!searchTerm || m.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.description?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const popularItems = menuItems.filter(m => m.tags?.includes('popular') || m.tags?.includes('promo') || m.category === 'Destaques').slice(0, 5);
  const highlights = popularItems.length > 0 ? popularItems : menuItems.filter(m => m.hidden !== 1 && m.available !== 0 && m.out_of_stock !== 1).slice(0, 4);

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
      <div className="max-w-md mx-auto bg-white shadow-sm min-h-screen pb-24 relative" style={themeVars}>
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
            {store?.delivery_fee_cents !== undefined && (
              <span className="text-xs bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                {store.delivery_fee_cents === 0 ? '🚚 Grátis' : `🚚 ${R(store.delivery_fee_cents)}`}
              </span>
            )}
            {store?.min_order_cents ? (
              <span className="text-xs bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">🛒 Mín. {R(store.min_order_cents)}</span>
            ) : null}
          </div>
        </div>

        {/* Store Status Banner */}
        {!storeOpen && (
          <div className={`mx-4 -mt-8 relative z-10 rounded-2xl p-4 shadow-lg ${store?.store_status === 'closed' ? 'bg-red-600 text-white' : 'bg-yellow-400 text-yellow-900'
            }`}>
            <div className="font-black text-lg">
              {store?.store_status === 'closed' ? '🔴 Loja Fechada' :
                store?.store_status === 'paused' ? '⏸️ Pedidos Pausados' :
                  store?.store_status === 'busy' ? '🟠 Estamos Lotados' : '🔴 Loja Fechada'}
            </div>
            <p className="text-sm mt-1 opacity-90">
              {store?.temp_close_reason || 'Volte em breve!'}
            </p>
          </div>
        )}

        <WelcomeBanner />
        <FlashDealBanner />

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
              placeholder="Buscar açaí, suco, acompanhamento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-2xl py-3 px-4 pl-12 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all font-medium"
            />
            <span className="absolute left-4 top-3 text-xl opacity-50">🔍</span>
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600 font-bold">✕</button>
            )}
          </div>

          {/* Highlights / Popular Items Slider */}
          {!searchTerm && highlights.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-black text-gray-800 mb-3 flex items-center gap-2">⭐ Mais Pedidos</h2>
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x">
                {highlights.map(item => (
                  <Link href={`/product/${item.id}`} key={`high-${item.id}`} className="shrink-0 w-48 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden snap-start flex flex-col transition hover:shadow-md">
                    <div className="h-32 bg-purple-50 relative flex items-center justify-center text-5xl">
                      {item.image_url
                        ? <img src={item.image_url} alt={item.name} className="object-cover w-full h-full" />
                        : '🍇'}
                    </div>
                    <div className="p-3 flex flex-col flex-1">
                      <h3 className="font-bold text-gray-800 text-sm truncate">{item.name}</h3>
                      <div className="mt-auto font-black text-purple-700">{R(item.price_cents)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Categories Slider */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide snap-x">
            {categories.map(c => (
              <button key={c || 'all'} onClick={() => { setCategory(c || ''); setSearchTerm(''); }}
                className={`flex-shrink-0 snap-start px-5 py-2.5 rounded-full text-sm font-black border transition-all ${category === c ? 'bg-purple-600 text-white border-purple-600 shadow-md transform scale-105' : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'
                  }`}>
                {c || 'Todos'}
              </button>
            ))}
          </div>

          {/* Menu Items */}
          <div className="flex flex-col gap-4">
            {filtered.map(item => {
              const unavailable = item.available === 0 || item.out_of_stock === 1;
              return (
                <Link
                  href={unavailable || !canOrder ? '#' : `/product/${item.id}`}
                  key={item.id}
                  className={`flex bg-white rounded-xl shadow-sm border border-gray-100 p-4 gap-4 items-center transition ${unavailable || !canOrder ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-md active:scale-[0.98]'}`}
                  onClick={(e) => { if (unavailable || !canOrder) e.preventDefault(); }}
                >
                  <div className="w-24 h-24 bg-purple-50 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 text-3xl relative">
                    {item.image_url
                      ? <img src={item.image_url} alt={item.name} className="object-cover w-full h-full" />
                      : '🍇'}
                    {item.out_of_stock === 1 && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="text-white text-xs font-black">ESGOTADO</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col py-1">
                    <h3 className="font-bold text-gray-800 text-base leading-tight truncate">{item.name}</h3>
                    {item.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{item.description}</p>}
                    <div className="mt-auto pt-2 flex items-center justify-between">
                      <div className="font-black text-purple-700 text-lg">
                        {R(item.price_cents)}
                      </div>
                      {item.available === 0 && !item.out_of_stock && (
                        <span className="text-[10px] uppercase tracking-wider text-orange-500 font-bold bg-orange-50 px-2 py-1 rounded">Indisponível hoje</span>
                      )}
                    </div>
                  </div>

                  <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-sm transition-all duration-200 ${unavailable || !canOrder
                    ? 'bg-gray-100 text-gray-400'
                    : 'bg-purple-100 text-purple-700'
                    }`}>
                    ➔
                  </div>
                </Link>
              );
            })}

            {filtered.length === 0 && (
              <div className="text-center text-gray-400 mt-16">
                <div className="text-5xl mb-4">🥣</div>
                <p className="font-semibold">
                  {menuItems.length === 0 ? 'Cardápio vazio ou servidor offline.' : 'Nenhum item nessa categoria.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Cart Button */}
        {cartCount > 0 && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-[calc(448px-32px)] z-50">
            <Link href="/cart"
              style={{ backgroundColor: 'var(--primary)' }}
              className="w-full text-white font-black py-4 px-6 rounded-2xl shadow-xl flex items-center justify-between transition hover:opacity-90">
              <span className="bg-white/20 px-2 py-0.5 rounded-lg text-sm">{cartCount} {cartCount === 1 ? 'item' : 'itens'}</span>
              <span>Ver Sacola 🛍️</span>
              <span className="w-8" />
            </Link>
          </div>
        )}
        {/* Social Proof Popup */}
        <LiveSalesPopup />
      </div>
    </div>
  );
}
