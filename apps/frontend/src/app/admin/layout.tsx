'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [token, setToken] = useState<string | null>(null);
    const [inputToken, setInputToken] = useState('');
    const [slug, setSlug] = useState('default');
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const savedToken = localStorage.getItem('admin_token');
        if (savedToken) setToken(savedToken);
        const savedSlug = localStorage.getItem('admin_slug');
        if (savedSlug) setSlug(savedSlug);
    }, []);

    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
            const res = await fetch(`${API_URL}/api/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ secret: inputToken })
            });

            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('admin_token', data.token);
                setToken(data.token);
            } else {
                setErrorMsg('Credenciais inválidas. Tente novamente.');
            }
        } catch (err) {
            setErrorMsg('Erro de conexão com o servidor.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('admin_token');
        setToken(null);
    };

    if (!token) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
                    <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">Admin Login</h1>
                    <form onSubmit={handleLogin} className="flex flex-col gap-4">
                        {errorMsg && <div className="text-red-500 font-bold text-center text-sm">{errorMsg}</div>}
                        <input
                            type="password"
                            placeholder="ADMIN_SECRET"
                            value={inputToken}
                            onChange={(e) => setInputToken(e.target.value)}
                            className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                            required
                        />
                        <button type="submit" disabled={loading} className="bg-purple-600 text-white font-bold p-3 rounded-lg hover:bg-purple-700 transition disabled:opacity-50">
                            {loading ? 'Acessando...' : 'Acessar Dashboard'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
            {/* Sidebar */}
            <aside className="w-full md:w-64 bg-white shadow-md flex flex-col">
                <div className="p-6 border-b flex justify-between items-center md:block">
                    <h2 className="text-xl font-black text-purple-700">Painel Lojista</h2>
                    <button onClick={handleLogout} className="md:hidden text-sm text-red-500 font-bold">Sair</button>
                    <div className="mt-4 hidden md:block">
                        <label className="text-xs font-bold text-gray-500 uppercase">Tenant Slug</label>
                        <input
                            type="text"
                            value={slug}
                            onChange={(e) => {
                                setSlug(e.target.value);
                                localStorage.setItem('admin_slug', e.target.value);
                                window.dispatchEvent(new Event('tenant_changed'));
                            }}
                            className="w-full border p-2 mt-1 rounded text-sm focus:ring-1 outline-none"
                        />
                    </div>
                </div>
                <nav className="flex-1 p-4 flex flex-col gap-2 overflow-y-auto">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-widest px-2 mb-1">Super Admin (SaaS)</div>
                    <Link href="/admin/restaurants" className={`p-3 rounded-lg font-bold flex-1 md:flex-none text-center md:text-left ${pathname === '/admin/restaurants' || pathname === '/admin/restaurants/new' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                        🏢 Gerir Lojas (Tenants)
                    </Link>
                    <div className="border-t my-2 border-dashed border-gray-300"></div>

                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2 mb-1 mt-2">Restaurante Atual</div>
                    <Link href="/admin/orders" className={`p-3 rounded-lg font-semibold flex-1 md:flex-none text-center md:text-left ${pathname === '/admin/orders' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                        📦 Pedidos
                    </Link>
                    <Link href="/admin/menu" className={`p-3 rounded-lg font-semibold flex-1 md:flex-none text-center md:text-left ${pathname === '/admin/menu' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                        🍔 Cardápio
                    </Link>
                    <div className="border-t my-2"></div>
                    <Link href="/admin/customers" className={`p-3 rounded-lg font-semibold flex-1 md:flex-none text-center md:text-left ${pathname === '/admin/customers' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                        👥 Clientes
                    </Link>
                    <Link href="/admin/inventory" className={`p-3 rounded-lg font-semibold flex-1 md:flex-none text-center md:text-left ${pathname === '/admin/inventory' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                        📦 Estoque
                    </Link>
                    <Link href="/admin/drivers" className={`p-3 rounded-lg font-semibold flex-1 md:flex-none text-center md:text-left ${pathname === '/admin/drivers' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                        🛵 Entregadores
                    </Link>
                    <Link href="/admin/recipes" className={`p-3 rounded-lg font-semibold flex-1 md:flex-none text-center md:text-left ${pathname === '/admin/recipes' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                        📝 Receitas
                    </Link>
                    <div className="border-t my-2"></div>
                    <Link href="/admin/pdv" className={`p-3 rounded-lg font-semibold flex-1 md:flex-none text-center md:text-left ${pathname === '/admin/pdv' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                        🏪 Caixa (PDV)
                    </Link>
                    <Link href="/admin/finance" className={`p-3 rounded-lg font-semibold flex-1 md:flex-none text-center md:text-left ${pathname === '/admin/finance' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                        💰 Financeiro
                    </Link>
                    <div className="border-t my-2"></div>
                    <Link href="/admin/coupons" className={`p-3 rounded-lg font-semibold flex-1 md:flex-none text-center md:text-left ${pathname === '/admin/coupons' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                        🎟️ Cupons
                    </Link>
                    <Link href="/admin/ratings" className={`p-3 rounded-lg font-semibold flex-1 md:flex-none text-center md:text-left ${pathname === '/admin/ratings' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                        ⭐ Avaliações
                    </Link>
                    <div className="border-t my-2 border-dashed border-gray-200"></div>
                    <Link href="/admin/analytics" className={`p-3 rounded-lg font-bold flex-1 md:flex-none text-center md:text-left ${pathname === '/admin/analytics' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                        📈 Dados Ocultos (Analytics)
                    </Link>
                    <div className="border-t my-2"></div>
                    <Link href="/admin/settings" className={`p-3 rounded-lg font-semibold flex-1 md:flex-none text-center md:text-left ${pathname === '/admin/settings' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                        ⚙️ Configurações
                    </Link>
                </nav>
                <div className="p-4 border-t hidden md:block">
                    <button onClick={handleLogout} className="w-full text-left text-red-500 font-bold p-2 hover:bg-red-50 rounded-lg">Sair do Painel</button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
