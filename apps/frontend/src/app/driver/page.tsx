'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, Lock, Phone, User, Store } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function DriverLogin() {
    const router = useRouter();
    const [slug, setSlug] = useState('');
    const [phone, setPhone] = useState('');
    const [accessCode, setAccessCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch(`${API}/api/driver/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug, phone, accessCode })
            });

            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('driver_token', data.token);
                localStorage.setItem('driver_data', JSON.stringify(data.driver));
                router.push('/driver/dashboard');
            } else {
                setError(data.error || 'Erro ao realizar login.');
            }
        } catch (err) {
            setError('Falha na conexão com o servidor.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 md:p-12">
            <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl shadow-purple-100 p-8 border-4 border-white">
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-purple-600 p-5 rounded-3xl text-white shadow-xl shadow-purple-200 mb-4 animate-bounce">
                        <Truck size={40} strokeWidth={2.5} />
                    </div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase text-center">
                        Portal do Entregador
                    </h1>
                    <p className="text-gray-400 font-bold text-xs mt-1 uppercase tracking-widest text-center">
                        Faça login para iniciar sua rota
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 border-2 border-red-100 text-red-600 p-4 rounded-2xl text-xs font-black uppercase mb-6 text-center animate-shake">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Identificador da Loja (Slug)</label>
                        <div className="relative">
                            <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="ex: xacai-centro"
                                required
                                value={slug}
                                onChange={(e) => setSlug(e.target.value)}
                                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-4 pl-12 pr-4 font-bold text-gray-700 focus:border-purple-500 focus:bg-white outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Telefone</label>
                        <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="tel"
                                placeholder="11999999999"
                                required
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-4 pl-12 pr-4 font-bold text-gray-700 focus:border-purple-500 focus:bg-white outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Código de Acesso</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="password"
                                placeholder="••••"
                                required
                                value={accessCode}
                                onChange={(e) => setAccessCode(e.target.value)}
                                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-4 pl-12 pr-4 font-bold text-gray-700 focus:border-purple-500 focus:bg-white outline-none transition-all tracking-[0.5em]"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gray-900 hover:bg-black text-white font-black py-4 rounded-2xl text-lg shadow-lg shadow-gray-200 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 mt-4 flex items-center justify-center gap-3 uppercase tracking-tighter"
                    >
                        {loading ? 'Entrando...' : (
                            <>
                                ENTRAR NO APP <Truck size={20} />
                            </>
                        )}
                    </button>
                </form>

                <p className="mt-8 text-center text-gray-400 text-[10px] font-black uppercase tracking-widest leading-relaxed">
                    X-AÇAÍ DELIVERY SYSTEM <br />
                    VERSÃO LOGÍSTICA V1.0
                </p>
            </div>
        </div>
    );
}
