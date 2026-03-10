'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface TrackingData {
    status: string;
    driver_location?: {
        lat: number;
        lng: number;
        heading: number;
    };
    eta?: number;
    last_update?: string;
}

export default function TrackingPage() {
    const params = useParams();
    const token = params.token as string;
    const [data, setData] = useState<TrackingData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTracking = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/logistics/track/${token}`);
                const json = await res.json();
                setData(json);
            } catch (error) {
                console.error('Error fetching tracking:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTracking();

        // SSE Real-time Updates
        const sseUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/logistics/track/${token}/stream`;
        const eventSource = new EventSource(sseUrl);

        eventSource.onmessage = (event) => {
            try {
                if (event.data === ': keepalive') return;
                const update = JSON.parse(event.data);

                if (update.type === 'location') {
                    setData(prev => prev ? ({
                        ...prev,
                        driver_location: {
                            lat: update.latitude,
                            lng: update.longitude,
                            heading: update.heading
                        },
                        last_update: new Date().toISOString()
                    }) : null);
                } else if (update.type === 'status') {
                    setData(prev => prev ? ({ ...prev, status: update.status }) : null);
                }
            } catch (e) {
                console.error('SSE data parse error:', e);
            }
        };

        eventSource.onerror = (err) => {
            console.error('SSE Connection error:', err);
            eventSource.close();
        };

        return () => {
            eventSource.close();
        };
    }, [token]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-purple-50">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <header className="bg-purple-800 text-white p-6 rounded-b-3xl shadow-lg">
                <h1 className="text-2xl font-bold">Acompanhe seu Açaí 🍇</h1>
                <p className="opacity-90">{data?.status === 'delivering' ? 'Seu pedido está a caminho!' : 'Estamos preparando seu açaí...'}</p>
            </header>

            {/* Map Placeholder / Driver Card */}
            <main className="p-4 -mt-4">
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
                    <div className="h-48 bg-gray-200 relative flex items-center justify-center overflow-hidden">
                        {/* Mock Map Background */}
                        <div className="absolute inset-0 opacity-30 bg-[url('https://www.google.com/maps/d/u/0/thumbnail?mid=1m2_4n7Xp8_fP-Hl_3hN-m5lQYvM')] bg-cover"></div>

                        {data?.driver_location ? (
                            <div className="relative z-10 text-center">
                                <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center shadow-lg border-4 border-white mx-auto animate-bounce">
                                    <span className="text-2xl">🏍️</span>
                                </div>
                                <div className="mt-2 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-sm font-bold text-purple-900 shadow-sm">
                                    Chega em {data.eta} min
                                </div>
                            </div>
                        ) : (
                            <div className="z-10 text-center text-gray-400">
                                <div className="text-4xl mb-2">🥣</div>
                                <p>Cozinha preparando seu mix...</p>
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-gray-100 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Status</p>
                            <p className="font-bold text-lg text-purple-900 capitalize">{data?.status || 'Processando'}</p>
                        </div>
                        {data?.last_update && (
                            <div className="text-right">
                                <p className="text-xs text-gray-500">Última atualização</p>
                                <p className="text-sm font-medium">{new Date(data.last_update).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Timeline */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h2 className="font-bold text-gray-800 mb-6">Etapas do Pedido</h2>
                    <div className="space-y-8 relative">
                        {/* Line */}
                        <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gray-200"></div>

                        {[
                            { label: 'Pedido Recebido', status: 'received', time: 'Há 10 min', active: true },
                            { label: 'Em Preparação', status: 'preparing', time: 'Há 5 min', active: true },
                            { label: 'Saiu para Entrega', status: 'delivering', time: '--', active: data?.status === 'delivering' },
                            { label: 'Entregue', status: 'delivered', time: '--', active: data?.status === 'delivered' }
                        ].map((step, idx) => (
                            <div key={idx} className="flex items-start relative z-10">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step.active ? 'bg-purple-600 text-white shadow-lg' : 'bg-gray-200 text-gray-500'}`}>
                                    {step.active ? '✓' : idx + 1}
                                </div>
                                <div className="ml-4">
                                    <p className={`font-bold ${step.active ? 'text-purple-900' : 'text-gray-400'}`}>{step.label}</p>
                                    <p className="text-xs text-gray-500">{step.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {/* Support Call to Action */}
            <div className="fixed bottom-6 left-4 right-4 bg-purple-900 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between">
                <div>
                    <p className="font-bold">Algum problema?</p>
                    <p className="text-xs opacity-80">Fale com o suporte agora</p>
                </div>
                <button className="bg-green-500 hover:bg-green-600 p-2 px-4 rounded-xl font-bold transition-all transform active:scale-95">
                    WhatsApp
                </button>
            </div>
        </div>
    );
}
