'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [restaurantId, setRestaurantId] = useState<string | null>(null);

    useEffect(() => {
        // Obter do localStorage ou da sessão
        const id = localStorage.getItem('admin_restaurant_id');
        if (!id) {
            // Em caso de erro, voltar para login
            router.push('/admin/login');
            return;
        }
        setRestaurantId(id);

        // Verificar se já completou
        const checkStatus = async () => {
            const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
            const res = await fetch(`${API}/api/onboard/status?restaurantId=${id}`);
            if (res.ok) {
                const data = await res.json();
                if (data.onboarding_step >= 3) {
                    router.push('/admin/dashboard');
                } else if (data.onboarding_step > 0) {
                    setStep(data.onboarding_step);
                }
            }
        };
        checkStatus();
    }, [router]);

    const handleApplyTemplate = async (template: string) => {
        setLoading(true);
        try {
            const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
            const res = await fetch(`${API}/api/onboard/template`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ restaurantId, template })
            });

            if (res.ok) {
                setStep(3);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const finishOnboarding = () => {
        // Poderíamos chamar um endpoint para marcar step 3
        router.push('/admin/dashboard');
    };

    return (
        <div className="min-h-screen bg-purple-50 flex items-center justify-center p-4 font-sans">
            <div className="max-w-xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-purple-100">
                {/* Progress Bar */}
                <div className="h-2 bg-gray-100 w-full flex">
                    <div className={`h-full bg-purple-600 transition-all duration-500 ${step === 1 ? 'w-1/3' : step === 2 ? 'w-2/3' : 'w-full'}`}></div>
                </div>

                <div className="p-10">
                    {step === 1 && (
                        <div className="text-center animate-fade-in">
                            <div className="text-6xl mb-6">👋</div>
                            <h1 className="text-3xl font-black text-gray-800 mb-4">Bem-vindo ao X-Açaí SaaS!</h1>
                            <p className="text-gray-500 font-medium mb-8">
                                Estamos muito felizes em ter você conosco. Vamos configurar sua loja em menos de 2 minutos.
                            </p>
                            <button
                                onClick={() => setStep(2)}
                                className="bg-purple-600 text-white font-black px-10 py-4 rounded-2xl shadow-lg hover:bg-purple-700 transition transform hover:scale-105"
                            >
                                Começar Agora 🚀
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="animate-fade-in">
                            <h2 className="text-2xl font-black text-gray-800 mb-2">Qual o seu nicho?</h2>
                            <p className="text-gray-500 mb-8 font-medium italic">
                                Isso nos ajuda a criar um menu inicial completo para você.
                            </p>

                            <div className="grid grid-cols-1 gap-4">
                                {[
                                    { id: 'acai', name: 'Açaí e Sorvetes', icon: '🍧', desc: 'Categorias e complementos prontos.' },
                                    { id: 'burger', name: 'Hambúrgueres', icon: '🍔', desc: 'Montagem de lanches e acompanhamentos.' },
                                    { id: 'pizza', name: 'Pizzaria', icon: '🍕', desc: 'Tamanhos, sabores e bordas inclusas.' }
                                ].map(niche => (
                                    <button
                                        key={niche.id}
                                        disabled={loading}
                                        onClick={() => handleApplyTemplate(niche.id)}
                                        className="flex items-center gap-5 p-5 border-2 border-gray-100 rounded-2xl hover:border-purple-400 hover:bg-purple-50 transition text-left group"
                                    >
                                        <span className="text-4xl group-hover:scale-110 transition">{niche.icon}</span>
                                        <div className="flex-1">
                                            <div className="font-black text-gray-800">{niche.name}</div>
                                            <div className="text-sm text-gray-400 font-medium">{niche.desc}</div>
                                        </div>
                                        <div className="text-purple-600 font-black opacity-0 group-hover:opacity-100">→</div>
                                    </button>
                                ))}
                            </div>

                            {loading && (
                                <div className="mt-6 text-center text-purple-600 font-bold animate-pulse">
                                    Criando seu menu mágico... ✨
                                </div>
                            )}
                        </div>
                    )}

                    {step === 3 && (
                        <div className="animate-fade-in">
                            <div className="text-5xl mb-6 text-center">📱</div>
                            <h2 className="text-2xl font-black text-gray-800 mb-4 text-center">Último passo: WhatsApp</h2>
                            <div className="bg-green-50 p-6 rounded-2xl border border-green-100 mb-8">
                                <p className="text-sm text-green-800 leading-relaxed font-medium">
                                    Sua loja já está com o menu inicial! Agora, para receber pedidos via IA, conecte seu número no painel de <b>Configurações</b> após entrar.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center">O que acontece agora?</p>
                                <ul className="text-sm text-gray-600 space-y-2 font-medium">
                                    <li className="flex gap-2">✅ Menu inicial criado</li>
                                    <li className="flex gap-2">✅ Painel administrativo liberado</li>
                                    <li className="flex gap-2">📍 Link da sua loja: <span className="text-purple-600">/seu-slug</span></li>
                                </ul>
                            </div>

                            <button
                                onClick={finishOnboarding}
                                className="w-full mt-10 bg-gray-900 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-black transition flex items-center justify-center gap-2"
                            >
                                Ir para o Painel 🏠
                            </button>
                        </div>
                    )}
                </div>

                <div className="bg-gray-50 px-10 py-5 border-t text-center">
                    <p className="text-xs font-bold text-gray-400">PASSO {step} DE 3</p>
                </div>
            </div>
        </div>
    );
}
