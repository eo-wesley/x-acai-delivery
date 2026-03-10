'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Phone, Lock, ArrowRight, CheckCircle2, Store } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function CustomerLogin() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const slug = searchParams.get('slug') || localStorage.getItem('last_slug') || 'default';

    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState<'phone' | 'otp'>('phone');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (slug) localStorage.setItem('last_slug', slug);
    }, [slug]);

    const handleRequestOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch(`${API}/api/${slug}/customer/auth/request-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone })
            });

            if (res.ok) {
                setStep('otp');
            } else {
                const data = await res.json();
                setError(data.error || 'Erro ao enviar código.');
            }
        } catch (err) {
            setError('Falha na conexão.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch(`${API}/api/${slug}/customer/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, otp })
            });

            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('customer_token', data.token);
                localStorage.setItem('customer_data', JSON.stringify(data.customer));
                router.push('/account');
            } else {
                setError(data.error || 'Código inválido.');
            }
        } catch (err) {
            setError('Falha na verificação.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 bg-gradient-to-b from-purple-50 to-white">
            <div className="w-full max-w-md space-y-8 text-center">
                <div className="flex flex-col items-center">
                    <div className="bg-purple-600 p-4 rounded-3xl text-white shadow-xl mb-4">
                        <Store size={32} />
                    </div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">
                        Minha Conta
                    </h1>
                    <p className="text-gray-500 font-bold text-sm">
                        {step === 'phone' ? 'Digite seu WhatsApp para entrar' : 'Digite o código de 6 dígitos'}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 border-2 border-red-100 text-red-600 p-4 rounded-2xl text-xs font-black uppercase text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={step === 'phone' ? handleRequestOtp : handleVerifyOtp} className="space-y-4 text-left">
                    {step === 'phone' ? (
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">WhatsApp</label>
                            <div className="relative">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="tel"
                                    placeholder="11999999999"
                                    required
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full bg-white border-2 border-gray-100 rounded-2xl py-4 pl-12 pr-4 font-bold text-gray-700 focus:border-purple-500 outline-none transition-all shadow-sm"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Código de 6 dígitos</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    maxLength={6}
                                    placeholder="000000"
                                    required
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    className="w-full bg-white border-2 border-gray-100 rounded-2xl py-4 pl-12 pr-4 font-bold text-gray-700 focus:border-purple-500 outline-none transition-all shadow-sm tracking-[1em] text-center"
                                />
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gray-900 text-white font-black py-4 rounded-2xl text-lg shadow-xl shadow-purple-100 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-tighter"
                    >
                        {loading ? 'Aguarde...' : (
                            <>
                                {step === 'phone' ? 'Receber Código' : 'Confirmar e Entrar'}
                                <ArrowRight size={20} />
                            </>
                        )}
                    </button>

                    {step === 'otp' && (
                        <button
                            type="button"
                            onClick={() => setStep('phone')}
                            className="w-full text-center text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-purple-600 transition pt-2"
                        >
                            Alterar Telefone
                        </button>
                    )}
                </form>

                <div className="pt-8 border-t border-gray-100">
                    <div className="flex items-center justify-center gap-2 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                        <CheckCircle2 size={14} className="text-emerald-500" />
                        Acesso Seguro via OTP
                    </div>
                </div>
            </div>
        </div>
    );
}
