'use client';

import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../../lib/firebase';
import { useRouter } from 'next/navigation';
import { Shield } from 'lucide-react';

export default function AdminLoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [slug, setSlug] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const token = await userCredential.user.getIdToken(true);
            localStorage.setItem('admin_token', token);
            localStorage.setItem('admin_slug', slug.toLowerCase());
            router.push('/admin');
        } catch (error: any) {
            console.error("Login failed:", error);
            setErrorMsg('Falha na autenticação. Verifique e-mail e senha.');
        } finally {
            setLoading(false);
        }
    };

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
                    {errorMsg && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-xl font-bold text-center text-sm border border-red-100">
                            {errorMsg}
                        </div>
                    )}

                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 mb-1 block">IDENTIFICADOR DA LOJA (SLUG)</label>
                        <input
                            type="text"
                            placeholder="ex: x-acai-delivery"
                            value={slug}
                            onChange={(e) => setSlug(e.target.value)}
                            className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none font-semibold text-gray-700 bg-gray-50/50"
                            required
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 mb-1 block">E-MAIL</label>
                        <input
                            type="email"
                            placeholder="admin@xacai.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none font-semibold text-gray-700 bg-gray-50/50"
                            required
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 mb-1 block">SENHA</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
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
