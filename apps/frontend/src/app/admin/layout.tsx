'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import NotificationToast from '../../components/NotificationToast';
import { Shield } from 'lucide-react';
import CopilotChat from '../../components/admin/CopilotChat';

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

    // Check Onboarding
    useEffect(() => {
        if (!token || pathname === '/admin/onboarding' || pathname === '/admin/restaurants') return;

        const checkOnboarding = async () => {
            try {
                const restaurantId = localStorage.getItem('admin_restaurant_id');
                if (!restaurantId) return;

                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
                const res = await fetch(`${API_URL}/api/onboard/status?restaurantId=${restaurantId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.onboarding_step < 3) {
                        router.push('/admin/onboarding');
                    }
                }
            } catch (e) {
                console.error('Onboarding check failed', e);
            }
        };

        checkOnboarding();
    }, [token, pathname, router]);


    const [loginForm, setLoginForm] = useState({
        slug: '',
        username: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
            const res = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: loginForm.username,
                    password: loginForm.password,
                    restaurant_slug: loginForm.slug
                })
            });

            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('admin_token', data.token);
                localStorage.setItem('admin_slug', loginForm.slug);
                localStorage.setItem('admin_user', JSON.stringify(data.user));
                setToken(data.token);
                setSlug(loginForm.slug);
            } else {
                const err = await res.json();
                setErrorMsg(err.error || 'Credenciais inválidas.');
            }
        } catch (err) {
            setErrorMsg('Erro de conexão com o servidor.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_slug');
        localStorage.removeItem('admin_user');
        setToken(null);
    };

    const [pingOrders, setPingOrders] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        if (!token) return;
        const checkNew = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/admin/orders?slug=${slug}&status=pending`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.length > pingOrders) {
                        audioRef.current?.play().catch(() => { });
                    }
                    setPingOrders(data.length);
                }
            } catch (e) { }
        };
        const iv = setInterval(checkNew, 10000);
        return () => clearInterval(iv);
    }, [token, slug, pingOrders]);

    if (!token) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-md w-full border border-gray-100">
                    <div className="flex flex-col items-center mb-8">
                        <div className="bg-purple-600 p-4 rounded-2xl shadow-lg mb-4 text-white">
                            <Shield size={32} />
                        </div>
                        <h1 className="text-3xl font-black text-gray-800 text-center leading-tight">Painel Operacional</h1>
                        <p className="text-gray-500 font-medium">X-Açaí Delivery SaaS</p>
                    </div>

                    <form onSubmit={handleLogin} className="flex flex-col gap-4">
                        {errorMsg && <div className="bg-red-50 text-red-600 p-3 rounded-xl font-bold text-center text-sm border border-red-100">{errorMsg}</div>}

                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 mb-1 block">IDENTIFICADOR DA LOJA (SLUG)</label>
                            <input
                                type="text"
                                placeholder="ex: minha-loja"
                                value={loginForm.slug}
                                onChange={(e) => setLoginForm({ ...loginForm, slug: e.target.value.toLowerCase() })}
                                className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none font-semibold text-gray-700 bg-gray-50/50"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 mb-1 block">USUÁRIO</label>
                            <input
                                type="text"
                                placeholder="Seu nome de usuário"
                                value={loginForm.username}
                                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                                className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none font-semibold text-gray-700 bg-gray-50/50"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 mb-1 block">SENHA</label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={loginForm.password}
                                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                                className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none font-semibold text-gray-700 bg-gray-50/50"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-purple-600 text-white font-black py-4 mt-2 rounded-2xl hover:bg-purple-700 transition-all shadow-xl shadow-purple-200 disabled:opacity-50 ring-offset-2 active:scale-95"
                        >
                            {loading ? 'VALIDANDO ACESSO...' : 'ENTRAR NO PAINEL'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    if (pathname === '/admin/onboarding') {
        return <div className="bg-gray-50 flex-1">{children}</div>;
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
                    <Link href="/admin/orders" className={`p-3 rounded-lg font-semibold flex items-center gap-2 ${pathname === '/admin/orders' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                        <span>📦</span> Pedidos
                    </Link>
                    <Link href="/admin/kitchen" className={`p-3 rounded-lg font-semibold flex items-center gap-2 ${pathname === '/admin/kitchen' ? 'bg-orange-100 text-orange-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                        <span>🍳</span> Cozinha (KDS)
                    </Link>
                    <Link href="/admin/live" className={`p-3 rounded-lg font-semibold flex items-center gap-2 ${pathname === '/admin/live' ? 'bg-red-100 text-red-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                        <span>🔴</span> Live Hub (War Room)
                    </Link>

                    <div className="border-t my-2 border-dashed border-gray-200"></div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2 mb-1">Gestão Operacional</div>
                    <Link href="/admin/menu" className={`p-3 rounded-lg font-semibold flex items-center gap-2 ${pathname === '/admin/menu' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                        <span>🍔</span> Cardápio
                    </Link>
                    <Link href="/admin/inventory" className={`p-3 rounded-lg font-semibold flex items-center gap-2 ${pathname === '/admin/inventory' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                        <span>📦</span> Estoque
                    </Link>
                    <Link href="/admin/procurement" className={`p-3 rounded-lg font-semibold flex items-center gap-2 ${pathname === '/admin/procurement' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                        <span>🛒</span> Compras
                    </Link>
                    <Link href="/admin/tables" className={`p-3 rounded-lg font-semibold flex items-center gap-2 ${pathname === '/admin/tables' ? 'bg-emerald-100 text-emerald-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                        <span>🍽️</span> Mesas
                    </Link>
                    <Link href="/admin/logistics" className={`p-3 rounded-lg font-semibold flex items-center gap-2 ${pathname === '/admin/logistics' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                        <span>🚚</span> Logística Hub
                    </Link>
                    <Link href="/admin/drivers" className={`p-3 rounded-lg font-semibold flex items-center gap-2 ${pathname === '/admin/drivers' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                        <span>🛵</span> Entregadores
                    </Link>

                    <div className="border-t my-2 border-dashed border-gray-200"></div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2 mb-1">Financeiro & CRM</div>
                    <Link href="/admin/finance" className={`p-3 rounded-lg font-semibold flex items-center gap-2 ${pathname === '/admin/finance' ? 'bg-emerald-100 text-emerald-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                        <span>💰</span> Gestão de Caixa
                    </Link>
                    <Link href="/admin/fiscal" className={`p-3 rounded-lg font-semibold flex items-center gap-2 ${pathname === '/admin/fiscal' ? 'bg-slate-100 text-slate-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                        <span>📄</span> Fiscal Hub
                    </Link>
                    <Link href="/admin/customers" className={`p-3 rounded-lg font-semibold flex items-center gap-2 ${pathname === '/admin/customers' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                        <span>👥</span> Clientes (CRM)
                    </Link>
                    <Link href="/admin/marketing" className={`p-3 rounded-lg font-semibold flex items-center gap-2 ${pathname === '/admin/marketing' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                        <span>📢</span> Marketing
                    </Link>

                    <div className="border-t my-2 border-dashed border-gray-200"></div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2 mb-1">Configurações</div>
                    <Link href="/admin/settings" className={`p-3 rounded-lg font-semibold flex items-center gap-2 ${pathname === '/admin/settings' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                        <span>⚙️</span> Configurações
                    </Link>
                    <Link href="/admin/team" className={`p-3 rounded-lg font-semibold flex items-center gap-2 ${pathname === '/admin/team' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                        <span>🛡️</span> Equipe
                    </Link>
                    <div className="border-t my-2 border-dashed border-gray-200"></div>
                    <Link href="/admin/analytics" className={`p-3 rounded-lg font-bold flex-1 md:flex-none text-center md:text-left transition-all ${pathname === '/admin/analytics' ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg' : 'text-gray-600 hover:bg-gray-50'}`}>
                        💎 Analytics Pro (Enterprise)
                    </Link>
                    <div className="border-t my-2"></div>
                    <Link href="/admin/team" className={`p-3 rounded-lg font-semibold flex-1 md:flex-none text-center md:text-left ${pathname === '/admin/team' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                        🛡️ Gestão de Equipe
                    </Link>
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
            {/* Notification Sound */}
            <audio ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" preload="auto" />
            <NotificationToast />
            <CopilotChat />
        </div>
    );
}
