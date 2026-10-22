'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, House, Search, ShoppingBag, UserRound } from 'lucide-react';
import { useCart } from './CartContext';

const navItems = [
    { href: '/', label: 'Início', Icon: House },
    { href: '/search', label: 'Busca', Icon: Search },
    { href: '/orders', label: 'Pedidos', Icon: ClipboardList },
    { href: '/account', label: 'Perfil', Icon: UserRound },
];

export default function BottomNav() {
    const pathname = usePathname();
    const { cartCount, subtotalCents } = useCart();

    const hideBottomNav = Boolean(
        pathname?.startsWith('/admin') ||
        pathname?.startsWith('/product/') ||
        pathname?.startsWith('/pix/') ||
        pathname?.startsWith('/tracking/') ||
        pathname === '/cart' ||
        pathname === '/checkout' ||
        pathname === '/precificacao' ||
        pathname === '/dev/pricing-preview' ||
        pathname?.startsWith('/order/')
    );

    if (hideBottomNav) return null;

    return (
        <>
            {cartCount > 0 && pathname !== '/cart' && pathname !== '/checkout' && (
                <div className="fixed bottom-[76px] left-0 z-40 w-full px-4">
                    <Link
                        href="/cart"
                        aria-label={`Ver sacola com ${cartCount} ${cartCount === 1 ? 'item' : 'itens'}`}
                        className="mx-auto flex min-h-[60px] max-w-md items-center justify-between rounded-2xl bg-purple-800 px-4 py-3 text-white shadow-[0_12px_36px_rgba(43,11,53,0.28)] transition hover:-translate-y-0.5"
                    >
                        <span className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#DCEB83] text-sm font-black text-[#2B0B35]">
                                {cartCount}
                            </span>
                            <span className="flex items-center gap-2 text-sm font-semibold">
                                <ShoppingBag aria-hidden="true" size={17} strokeWidth={1.8} />
                                Ver sacola
                            </span>
                        </span>
                        <span className="text-sm font-bold">
                            {(subtotalCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                    </Link>
                </div>
            )}

            <nav aria-label="Navegação principal" className="fixed bottom-0 left-0 z-50 w-full border-t border-[#41134D]/10 bg-[#FFFDFA]/95 backdrop-blur-xl">
                <div className="mx-auto flex max-w-md items-center justify-between pb-safe">
                    {navItems.map(({ href, label, Icon }) => {
                        const active = pathname === href;
                        return (
                            <Link
                                key={href}
                                href={href}
                                aria-current={active ? 'page' : undefined}
                                className={`flex min-h-[64px] flex-1 flex-col items-center justify-center gap-1 py-2 text-center text-[11px] transition-colors ${active ? 'font-bold text-purple-700' : 'text-gray-500 hover:text-gray-800'}`}
                            >
                                <Icon aria-hidden="true" size={19} strokeWidth={active ? 2.2 : 1.7} />
                                <span>{label}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </>
    );
}
