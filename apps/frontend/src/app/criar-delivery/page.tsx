'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getApiBase } from '@/hooks/useTenant';

export default function CreateDeliveryPage() {
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const API = getApiBase();
            const res = await fetch(`${API}/api/saas/onboard`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, slug, email, phone }),
            });

            if (!res.ok) throw new Error('Falha ao criar restaurante');

            const data = await res.json();
            // Redirecionar para o próximo passo do onboarding ou boas-vindas
            router.push(`/onboarding/welcome?id=${data.id}&slug=${data.slug}`);
        } catch (error) {
            alert('Erro ao criar seu delivery. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white">
            {/* Header Simples */}
            <header className="p-6 flex justify-between items-center border-b">
                <div className="text-2xl font-bold text-[#9333ea]">X-Açaí SaaS</div>
                <a href="/" className="text-gray-600 hover:text-gray-900">Voltar para a vitrine</a>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                {/* Lado Esquerdo: Marketing */}
                <div className="space-y-8">
                    <h1 className="text-5xl font-extrabold text-gray-900 leading-tight">
                        Seu delivery com <span className="text-[#9333ea]">taxa zero</span> e tecnologia de ponta.
                    </h1>
                    <p className="text-xl text-gray-600">
                        Crie seu próprio aplicativo de pedidos em menos de 5 minutos e escape das taxas abusivas dos marketplaces.
                    </p>

                    <ul className="space-y-4">
                        {[
                            'Link exclusivo para pedidos no WhatsApp',
                            'Pagamentos automáticos via PIX',
                            'Gestão de motoristas em tempo real',
                            'Inteligência Artificial para pedidos',
                        ].map((item, i) => (
                            <li key={i} className="flex items-center space-x-3 text-lg font-medium text-gray-800">
                                <span className="text-green-500 text-2xl">✓</span>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Lado Direito: Formulário */}
                <div className="bg-gray-50 p-8 rounded-3xl shadow-xl border border-gray-200">
                    <h2 className="text-2xl font-bold mb-6 text-center">Começar agora gratuitamente</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold mb-1">Nome do seu Açaí / Restaurante</label>
                            <input
                                required
                                type="text"
                                placeholder="Ex: Açaí do Bairro"
                                className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#9333ea] outline-none"
                                value={name}
                                onChange={e => {
                                    setName(e.target.value);
                                    if (!slug) setSlug(e.target.value.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''));
                                }}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold mb-1">Slug (URL do seu site)</label>
                            <div className="flex items-center space-x-2">
                                <span className="text-gray-400">xacai.com/</span>
                                <input
                                    required
                                    type="text"
                                    placeholder="acai-do-bairro"
                                    className="flex-1 p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#9333ea] outline-none"
                                    value={slug}
                                    onChange={e => setSlug(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold mb-1">Email Profissional</label>
                                <input
                                    required
                                    type="email"
                                    placeholder="voce@exemplo.com"
                                    className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#9333ea] outline-none"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1">WhatsApp</label>
                                <input
                                    required
                                    type="tel"
                                    placeholder="(11) 99999-9999"
                                    className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#9333ea] outline-none"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            disabled={loading}
                            type="submit"
                            className="w-full bg-[#9333ea] text-white font-bold py-4 rounded-xl hover:bg-[#7c3aed] transition-all shadow-lg hover:shadow-purple-200 disabled:opacity-50"
                        >
                            {loading ? 'Criando seu império...' : 'Criar meu Delivery'}
                        </button>

                        <p className="text-center text-xs text-gray-500 mt-4">
                            Ao clicar, você concorda com nossos termos de uso e política de privacidade.
                        </p>
                    </form>
                </div>
            </main>
        </div>
    );
}
