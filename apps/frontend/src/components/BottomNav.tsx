'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from './CartContext';

export default function BottomNav() {
    const pathname = usePathname();
    const { cartCount, subtotalCents } = useCart();

    // Hide bottom nav on admin pages
    if (pathname?.startsWith('/admin')) return null;

    const navItems = [
        { href: '/', label: 'Início', icon: '🏠' },
        { href: '/search', label: 'Busca', icon: '🔎' },
        { href: '/orders', label: 'Pedidos', icon: '🧾' },
        { href: '/account', label: 'Perfil', icon: '👤' },
    ];

    return (
        <>
            {/* Floating Cart Button (shows only if cart has items) */}
            {cartCount > 0 && pathname !== '/cart' && pathname !== '/checkout' && (
                <div className="fixed bottom-[80px] left-0 w-full z-40 px-4">
                    <Link href="/cart">
                        <div className="max-w-md mx-auto bg-purple-600 rounded-lg p-4 shadow-lg flex justify-between items-center cursor-pointer transform hover:scale-[1.02] transition-transform">
                            <div className="flex items-center gap-3">
                                <span className="bg-purple-800 text-white font-bold h-8 w-8 rounded-full flex items-center justify-center">
                                    {cartCount}
                                </span>
                                <span className="text-white font-medium">Ver Sacola</span>
                            </div>
                            <span className="text-white font-bold">
                                R$ {(subtotalCents / 100).toFixed(2)}
                            </span>
                        </div>
                    </Link>
                </div>
            )}

            {/* Real Bottom Nav */}
            <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 z-50">
                <div className="max-w-md mx-auto flex justify-between items-center text-xs pb-safe">
                    {navItems.map((item) => {
                        const active = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex flex-col items-center flex-1 py-3 justify-center text-center transition-colors ${active ? 'text-purple-600 font-bold' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                                <div className="text-xl mb-1">{item.icon}</div>
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </>
    );
}
