'use client';

import React, { useState } from 'react';

export default function NewRestaurantWizard() {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: '',
        slogan: '',
        primaryColor: '#8B5CF6',
        theme: 'light',
        logoUrl: '',
        bannerUrl: ''
    });
    const [loading, setLoading] = useState(false);
    const [successSlug, setSuccessSlug] = useState('');

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    const handleNext = () => setStep(s => Math.min(s + 1, 3));
    const handlePrev = () => setStep(s => Math.max(s - 1, 1));

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('admin_token');
            const res = await fetch(`${API_URL}/api/super/restaurants`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                const data = await res.json();
                setSuccessSlug(data.slug);
            } else {
                const err = await res.json();
                alert(`Erro: ${err.error}`);
            }
        } catch (e) {
            console.error(e);
            alert('Falha na conexão com o servidor');
        } finally {
            setLoading(false);
        }
    };

    if (successSlug) {
        return (
            <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-xl text-center flex flex-col items-center justify-center space-y-6">
                <div className="text-6xl">🎉</div>
                <h1 className="text-3xl font-black text-gray-800">Lojista Cadastrado!</h1>
                <p className="text-gray-600">O novo Tenant foi criado com sucesso. O Slug gerado é:</p>
                <div className="bg-purple-100 text-purple-800 font-mono text-xl px-6 py-3 rounded-lg border border-purple-200">
                    {successSlug}
                </div>
                <p className="text-sm text-gray-500">
                    Utilize este slug para acessar o painel administrativo deste restaurante ou injetar pedidos.
                </p>
                <button onClick={() => window.location.reload()} className="bg-gray-800 text-white font-bold px-6 py-3 rounded-xl hover:bg-gray-900 transition">
                    Cadastrar Novo Lojista
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-black text-gray-800 mb-8 flex items-center gap-2">
                🚀 Onboarding de Lojista
            </h1>

            {/* Stepper Header */}
            <div className="flex justify-between items-center mb-10 pb-4 border-b">
                {[1, 2, 3].map(num => (
                    <div key={num} className={`flex flex-col items-center gap-2 ${step >= num ? 'text-purple-600' : 'text-gray-400'}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg border-2 
                            ${step === num ? 'bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-600/30' :
                                step > num ? 'bg-purple-100 text-purple-600 border-purple-600' : 'bg-gray-50 border-gray-200'}`}>
                            {step > num ? '✓' : num}
                        </div>
                        <span className="text-sm font-bold tracking-wider uppercase">
                            {num === 1 ? 'Dados Base' : num === 2 ? 'Visual' : 'Revisão'}
                        </span>
                    </div>
                ))}
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 relative overflow-hidden">
                {step === 1 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Nome do Estabelecimento *</label>
                            <input
                                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg font-medium outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all"
                                placeholder="Ex: Mega Açaí Premium"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Slogan Comercial</label>
                            <input
                                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg font-medium outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all"
                                placeholder="O melhor do bairro..."
                                value={formData.slogan}
                                onChange={e => setFormData({ ...formData, slogan: e.target.value })}
                            />
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Cor Primária (Hex)</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        className="h-12 w-16 border rounded cursor-pointer"
                                        value={formData.primaryColor}
                                        onChange={e => setFormData({ ...formData, primaryColor: e.target.value })}
                                    />
                                    <input
                                        className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 text-lg font-mono uppercase outline-none focus:border-purple-500 transition-all"
                                        value={formData.primaryColor}
                                        onChange={e => setFormData({ ...formData, primaryColor: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Tema UI</label>
                                <select
                                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg font-medium outline-none focus:border-purple-500 transition-all bg-white"
                                    value={formData.theme}
                                    onChange={e => setFormData({ ...formData, theme: e.target.value })}
                                >
                                    <option value="light">Claro (Light)</option>
                                    <option value="dark">Escuro (Dark)</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">URL Logo (Square)</label>
                            <input
                                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg font-medium outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all"
                                placeholder="https://..."
                                value={formData.logoUrl}
                                onChange={e => setFormData({ ...formData, logoUrl: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">URL Banner (Topo)</label>
                            <input
                                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg font-medium outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all"
                                placeholder="https://..."
                                value={formData.bannerUrl}
                                onChange={e => setFormData({ ...formData, bannerUrl: e.target.value })}
                            />
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
                        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                            <h3 className="font-bold text-gray-800 text-lg mb-4 uppercase tracking-wider border-b pb-2">Resumo do Cadastro</h3>

                            <div className="grid grid-cols-2 gap-y-4 text-sm">
                                <span className="font-bold text-gray-500">Nome:</span>
                                <span className="font-black text-gray-900 text-right">{formData.name || '---'}</span>

                                <span className="font-bold text-gray-500">Slogan:</span>
                                <span className="text-gray-900 font-medium text-right">{formData.slogan || '---'}</span>

                                <span className="font-bold text-gray-500">Identidade:</span>
                                <div className="flex items-center justify-end gap-2">
                                    <div className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: formData.primaryColor }}></div>
                                    <span className="font-mono text-gray-900">{formData.primaryColor} • {formData.theme.toUpperCase()}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-xl text-sm font-medium flex gap-3">
                            <span className="text-xl">ℹ️</span>
                            <p>Ao confirmar, o sistema isolará os dados deste restaurante através de um novo <strong>Tenant ID</strong>. A URL de PDV será automaticamente atribuída com o Slug gerado.</p>
                        </div>
                    </div>
                )}

                {/* Footer Controls */}
                <div className="flex justify-between mt-10 pt-6 border-t">
                    <button
                        onClick={handlePrev}
                        disabled={step === 1 || loading}
                        className="px-6 py-3 font-bold text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                        Costas
                    </button>

                    {step < 3 ? (
                        <button
                            onClick={handleNext}
                            disabled={!formData.name}
                            className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-8 py-3 rounded-xl shadow-lg shadow-purple-600/30 transition disabled:opacity-50"
                        >
                            Próximo Passo ➔
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className={`font-black px-10 py-3 rounded-xl shadow-lg transition text-white ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-green-600/30'}`}
                        >
                            {loading ? 'Aguarde...' : 'Criar Lojista SaaS agora!'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
