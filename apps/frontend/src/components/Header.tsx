'use client';

import Link from 'next/link';

export default function Header() {
    return (
        <header className="sticky top-0 z-50 bg-purple-600 shadow-md">
            <div className="w-full max-w-md mx-auto px-4 py-3 flex items-center justify-between">
                <Link href="/">
                    <h1 className="text-xl font-bold text-white tracking-tight leading-none flex items-center gap-1">
                        <span className="text-2xl">🍇</span> X-Açaí
                    </h1>
                </Link>
                <Link href="/orders">
                    <button className="bg-purple-700 hover:bg-purple-800 text-white p-2 rounded-full text-sm font-semibold transition">
                        Pedidos
                    </button>
                </Link>
            </div>
        </header>
    );
}
