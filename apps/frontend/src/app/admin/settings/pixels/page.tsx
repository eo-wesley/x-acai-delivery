'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PixelsSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const router = useRouter();

    const [pixels, setPixels] = useState({
        facebook_pixel_id: '',
        google_analytics_id: '',
        tiktok_pixel_id: '',
    });

    useEffect(() => {
        const token = localStorage.getItem('admin_token');
        if (!token) {
            router.push('/admin/login');
            return;
        }
        
        // Fetch existing profile including pixels
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/admin/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
            if (data && !data.error) {
                setPixels({
                    facebook_pixel_id: data.facebook_pixel_id || '',
                    google_analytics_id: data.google_analytics_id || '',
                    tiktok_pixel_id: data.tiktok_pixel_id || '',
                });
            }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [router]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');

        const token = localStorage.getItem('admin_token');
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/admin/profile`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(pixels)
            });

            const data = await res.json();
            if (data.success) {
                setMessage('Pixels salvos com sucesso!');
                setTimeout(() => setMessage(''), 3000);
            } else {
                setMessage('Erro ao salvar as configurações.');
            }
        } catch (error) {
            setMessage('Erro de conexão ao salvar.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-gray-500">Carregando configurações...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-gray-900">Pixels & Integrações</h1>
                    <p className="text-gray-500 mt-1">Conecte sua loja às ferramentas de marketing e acompanhe as vendas.</p>
                </div>
            </div>

            {message && (
                <div className={`p-4 rounded-xl ${message.includes('Erro') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'} font-medium flex items-center justify-between`}>
                    {message}
                    <button onClick={() => setMessage('')} className="opacity-50 hover:opacity-100">✕</button>
                </div>
            )}

            <form onSubmit={handleSave} className="space-y-6">
                
                {/* Facebook Pixel */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 items-start">
                    <div className="w-16 h-16 bg-[#E8F0FE] rounded-2xl flex items-center justify-center shrink-0">
                        <span className="text-3xl text-[#1877F2] font-black">f</span>
                    </div>
                    <div className="flex-1 space-y-4">
                        <div>
                            <h3 className="text-lg font-black text-gray-900">Facebook Pixel</h3>
                            <p className="text-sm text-gray-500 mt-1">Acompanhe eventos de visualização de conteúdo e compras (Purchase) da sua loja para otimizar campanhas do Meta Ads.</p>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">ID do Pixel</label>
                            <input
                                type="text"
                                placeholder="Ex: 123456789012345"
                                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-50 transition"
                                value={pixels.facebook_pixel_id}
                                onChange={e => setPixels(p => ({ ...p, facebook_pixel_id: e.target.value }))}
                            />
                        </div>
                    </div>
                </div>

                {/* Google Analytics */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 items-start">
                    <div className="w-16 h-16 bg-[#FFF8E1] rounded-2xl flex items-center justify-center shrink-0">
                        <span className="text-3xl">📊</span>
                    </div>
                    <div className="flex-1 space-y-4">
                        <div>
                            <h3 className="text-lg font-black text-gray-900">Google Analytics (G4)</h3>
                            <p className="text-sm text-gray-500 mt-1">Analise o tráfego da loja, funil de conversão e comportamento dos clientes através da tag gtag.js.</p>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">ID da Métrica (G-XXXXX)</label>
                            <input
                                type="text"
                                placeholder="Ex: G-12345ABCDE"
                                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-50 transition"
                                value={pixels.google_analytics_id}
                                onChange={e => setPixels(p => ({ ...p, google_analytics_id: e.target.value }))}
                            />
                        </div>
                    </div>
                </div>

                {/* TikTok Pixel */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 items-start">
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center shrink-0">
                        <span className="text-3xl text-black font-black">♪</span>
                    </div>
                    <div className="flex-1 space-y-4">
                        <div>
                            <h3 className="text-lg font-black text-gray-900">TikTok Pixel</h3>
                            <p className="text-sm text-gray-500 mt-1">Monitore o retorno sobre anúncios do TikTok e envie os dados de compra (Purchase) sincronizados com o catálogo.</p>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">ID do Pixel</label>
                            <input
                                type="text"
                                placeholder="Ex: C8ABCD12345EFG"
                                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-gray-900 focus:ring-4 focus:ring-gray-100 transition"
                                value={pixels.tiktok_pixel_id}
                                onChange={e => setPixels(p => ({ ...p, tiktok_pixel_id: e.target.value }))}
                            />
                        </div>
                    </div>
                </div>

                <div className="pt-6 border-t border-gray-200 flex justify-end">
                    <button
                        type="submit"
                        disabled={saving}
                        className={`bg-purple-600 hover:bg-purple-700 text-white font-black py-4 px-10 rounded-2xl shadow-lg shadow-purple-200 transition active:scale-95 ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {saving ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </div>
            </form>
        </div>
    );
}
