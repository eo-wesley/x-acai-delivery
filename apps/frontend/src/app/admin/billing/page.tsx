'use client';

import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
function getToken() { return localStorage.getItem('admin_token') || ''; }

type Plan = {
    id: string;
    name: string;
    price: string;
    features: string[];
    color: string;
    highlight?: boolean;
};

const PLANS: Plan[] = [
    {
        id: 'starter',
        name: 'Starter',
        price: 'R$ 49/mês',
        features: ['Até 100 pedidos/mês', 'Cardápio Digital básico', 'Gestão de Pedidos', 'Suporte via Email'],
        color: 'bg-gray-100 text-gray-800'
    },
    {
        id: 'pro',
        name: 'Pro',
        price: 'R$ 99/mês',
        features: ['Pedidos Ilimitados', 'Analytics Avançado', 'Marketing Hub', 'Cupons & Fidelidade', 'Suporte Prioritário'],
        color: 'bg-purple-100 text-purple-700',
        highlight: true
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        price: 'R$ 199/mês',
        features: ['Tudo do Pro', 'White Label (Logo/Cores)', 'Múltiplas Unidades', 'API de Integração', 'Account Manager'],
        color: 'bg-blue-100 text-blue-700'
    }
];

export default function BillingPage() {
    const [currentPlan, setCurrentPlan] = useState('starter');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch(`${API}/api/admin/restaurant/config`, {
                    headers: { Authorization: `Bearer ${getToken()}` }
                });
                if (res.ok) {
                    const d = await res.json();
                    setCurrentPlan(d.subscription_plan || 'starter');
                }
            } catch { }
            setLoading(false);
        };
        load();
    }, []);

    const handleUpgrade = async (planId: string) => {
        if (planId === currentPlan) return;

        const confirm = window.confirm(`Deseja alterar seu plano para ${planId.toUpperCase()}?`);
        if (!confirm) return;

        try {
            const res = await fetch(`${API}/api/admin/restaurant/config`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ subscription_plan: planId })
            });
            if (res.ok) {
                setCurrentPlan(planId);
                alert('Plano atualizado com sucesso!');
            }
        } catch {
            alert('Erro ao atualizar plano');
        }
    };

    if (loading) return <div className="animate-pulse h-64 bg-gray-50 rounded-3xl" />;

    return (
        <div className="space-y-8 max-w-5xl">
            <div>
                <h1 className="text-3xl font-black text-gray-800">💳 Minha Assinatura</h1>
                <p className="text-gray-500">Gerencie seu plano e potencialize seu negócio.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {PLANS.map((plan) => (
                    <div key={plan.id}
                        className={`relative p-6 rounded-3xl border transition-all duration-300 ${plan.id === currentPlan
                                ? 'border-purple-500 ring-2 ring-purple-100 shadow-xl'
                                : 'border-gray-100 bg-white hover:shadow-lg'
                            }`}>

                        {plan.id === currentPlan && (
                            <span className="absolute -top-3 left-6 px-3 py-1 bg-purple-600 text-white text-xs font-bold rounded-full">
                                PLANO ATUAL
                            </span>
                        )}

                        {plan.highlight && (
                            <span className="absolute -top-3 right-6 px-3 py-1 bg-amber-400 text-amber-900 text-xs font-bold rounded-full">
                                POPULAR
                            </span>
                        )}

                        <div className="mb-6">
                            <h3 className="text-xl font-black text-gray-800">{plan.name}</h3>
                            <div className="text-2xl font-black text-purple-600 mt-2">{plan.price}</div>
                        </div>

                        <ul className="space-y-3 mb-8">
                            {plan.features.map((feature, i) => (
                                <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                                    <span className="text-green-500 font-bold">✓</span>
                                    {feature}
                                </li>
                            ))}
                        </ul>

                        <button
                            onClick={() => handleUpgrade(plan.id)}
                            disabled={plan.id === currentPlan}
                            className={`w-full py-4 rounded-2xl font-black transition ${plan.id === currentPlan
                                    ? 'bg-gray-100 text-gray-400 cursor-default'
                                    : 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-200'
                                }`}>
                            {plan.id === currentPlan ? 'Plano Ativo' : 'Fazer Upgrade'}
                        </button>
                    </div>
                ))}
            </div>

            {/* Billing History Placeholder */}
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                <h2 className="text-xl font-black text-gray-800 mb-6">📅 Histórico de Faturamento</h2>
                <div className="text-center py-10 text-gray-400 italic">
                    Nenhuma fatura pendente. Próximo vencimento em 30 dias.
                </div>
            </div>
        </div>
    );
}
