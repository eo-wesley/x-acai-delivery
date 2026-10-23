'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList } from 'lucide-react';

export default function Header() {
    const pathname = usePathname();

    // Hide the customer header on restaurant operations pages.
    if (pathname?.startsWith('/admin') || pathname?.startsWith('/tracking/')) return null;

    return (
        <header className="sticky top-0 z-50 border-b border-white/10 bg-purple-800 text-white shadow-[0_6px_24px_rgba(43,11,53,0.12)]">
            <div className="mx-auto flex w-full max-w-md items-center justify-between px-5 py-3">
                <Link href="/" aria-label="X-Açaí — Início" className="flex items-center rounded-md">
                    <img
                        src="/brand/x-acai-principal-creme.svg"
                        alt="X-Açaí"
                        width={118}
                        height={38}
                        className="h-auto w-[104px]"
                    />
                </Link>
                <div className="flex items-center gap-2">
                    <Link
                        href="/precificacao"
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 text-xs font-bold text-white transition hover:bg-white/20"
                    >
                        <span>📊</span> Precificação
                    </Link>
                    <Link
                        href="/orders"
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/25 px-3.5 text-xs font-bold text-white transition hover:bg-white/10"
                    >
                        <ClipboardList aria-hidden="true" size={14} strokeWidth={2} />
                        Pedidos
                    </Link>
                </div>
            </div>
        </header>
    );
}
