'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Truck,
    MapPin,
    Phone,
    Navigation,
    CheckCircle,
    XCircle,
    DollarSign,
    LogOut,
    Box,
    Clock,
    User
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function DriverDashboard() {
    const router = useRouter();
    const [driver, setDriver] = useState<any>(null);
    const [orders, setOrders] = useState<any[]>([]);
    const [wallet, setWallet] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isOnline, setIsOnline] = useState(false);

    const fetchData = async () => {
        const token = localStorage.getItem('driver_token');
        if (!token) {
            router.push('/driver');
            return;
        }

        try {
            // Fetch Orders
            const ordersRes = await fetch(`${API}/api/driver/active-orders`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (ordersRes.ok) setOrders(await ordersRes.json());

            // Fetch Wallet
            const walletRes = await fetch(`${API}/api/driver/wallet`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (walletRes.ok) setWallet(await walletRes.json());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const stored = localStorage.getItem('driver_data');
        if (stored) setDriver(JSON.parse(stored));
        fetchData();

        // Polling para novos pedidos a cada 30s as fallback
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    // Atualização de GPS em Tempo Real quando Online
    useEffect(() => {
        if (!isOnline) return;

        console.log('[GPS] Iniciando rastreamento de localização...');

        const watchId = navigator.geolocation.watchPosition(
            async (pos) => {
                const { latitude, longitude, heading } = pos.coords;
                const token = localStorage.getItem('driver_token');

                try {
                    await fetch(`${API}/api/logistics/location`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            lat: latitude,
                            lng: longitude,
                            heading: heading || 0
                        })
                    });
                } catch (e) {
                    console.error('[GPS] Erro ao enviar localização:', e);
                }
            },
            (err) => console.error('[GPS] Erro de geolocalização:', err),
            {
                enableHighAccuracy: true,
                maximumAge: 5000,
                timeout: 10000
            }
        );

        return () => {
            console.log('[GPS] Parando rastreamento...');
            navigator.geolocation.clearWatch(watchId);
        };
    }, [isOnline]);

    const updateStatus = async (driverOrderId: string, status: string) => {
        const token = localStorage.getItem('driver_token');
        try {
            const res = await fetch(`${API}/api/driver/order-status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ driverOrderId, status })
            });
            if (res.ok) fetchData();
        } catch (e) {
            console.error(e);
        }
    };

    const togglePresence = async () => {
        const token = localStorage.getItem('driver_token');
        const newStatus = !isOnline;
        try {
            const res = await fetch(`${API}/api/driver/presence`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ isOnline: newStatus })
            });
            if (res.ok) {
                setIsOnline(newStatus);
                // Trigger an immediate fetch when going online
                if (newStatus) fetchData();
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('driver_token');
        localStorage.removeItem('driver_data');
        router.push('/driver');
    };

    if (loading) return <div className="p-12 text-center animate-pulse font-black text-gray-300 tracking-widest uppercase">Carregando Rota...</div>;

    return (
        <div className="min-h-screen bg-gray-100 pb-24">
            {/* Header / Wallet Summary */}
            <div className="bg-gray-900 text-white p-6 rounded-b-[2.5rem] shadow-2xl">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h1 className="text-sm font-black text-gray-400 uppercase tracking-widest leading-none">Bem-vindo, Entregador</h1>
                        <h2 className="text-2xl font-black tracking-tighter uppercase">{driver?.name || 'Carregando...'}</h2>
                    </div>
                    <button onClick={handleLogout} className="bg-red-500/20 text-red-400 p-2 rounded-xl transition hover:bg-red-500 hover:text-white">
                        <LogOut size={20} />
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Ganhos Pendentes</p>
                        <div className="text-xl font-black text-emerald-400">R$ {(wallet?.pending_settlement_cents / 100 || 0).toFixed(2).replace('.', ',')}</div>
                    </div>
                    <button
                        onClick={togglePresence}
                        className={`p-4 rounded-2xl border transition-all duration-300 backdrop-blur-md flex flex-col items-start ${isOnline ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-red-500/20 border-red-500/30'}`}
                    >
                        <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isOnline ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isOnline ? 'ONLINE' : 'OFFLINE'}
                        </p>
                        <div className="text-xl font-black flex items-center gap-2">
                            {isOnline ? <CheckCircle size={20} className="text-emerald-400" /> : <XCircle size={20} className="text-red-400" />}
                            <span className="text-sm">ALTERAR</span>
                        </div>
                    </button>
                </div>
            </div>

            {/* Active Orders List */}
            <div className="p-6 space-y-6">
                <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <Box size={16} /> Entregas Pendentes ({orders.length})
                </h3>

                {orders.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-[2.5rem] border-4 border-dashed border-gray-200">
                        <Truck size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">Aguardando novos despachos...</p>
                    </div>
                ) : (
                    orders.map((order) => (
                        <div key={order.id} className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 p-6 border-4 border-white overflow-hidden relative">
                            {/* Status Badge */}
                            <div className={`absolute top-0 right-0 px-6 py-2 rounded-bl-3xl text-[10px] font-black uppercase tracking-widest ${order.status === 'picked_up' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                                {order.status === 'picked_up' ? '🛵 EM TRÂNSITO' : '🏠 AGUARDANDO COLETA'}
                            </div>

                            <div className="mb-4 pt-4">
                                <div className="text-lg font-black text-gray-900 tracking-tighter uppercase mb-1">{order.customer_name}</div>
                                <div className="flex items-start gap-2 text-gray-500">
                                    <MapPin size={18} className="mt-0.5 text-purple-600 shrink-0" />
                                    <p className="font-bold text-sm leading-tight uppercase tracking-tight">{order.customer_address}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <a
                                    href={`tel:${order.customer_phone}`}
                                    className="flex items-center justify-center gap-2 bg-gray-50 text-gray-600 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition"
                                >
                                    <Phone size={16} /> LIGAR
                                </a>
                                <a
                                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.customer_address)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 bg-gray-50 text-purple-600 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-purple-100 transition"
                                >
                                    <Navigation size={16} /> ROTA GPS
                                </a>
                            </div>

                            <div className="flex flex-col gap-2">
                                {order.status === 'assigned' ? (
                                    <button
                                        onClick={() => updateStatus(order.id, 'picked_up')}
                                        className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-base uppercase tracking-widest shadow-lg shadow-blue-100 animate-pulse"
                                    >
                                        COLETAR NO BALCÃO
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => updateStatus(order.id, 'delivered')}
                                        className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black text-base uppercase tracking-widest shadow-lg shadow-emerald-100"
                                    >
                                        CONCLUIR ENTREGA
                                    </button>
                                )}

                                {order.status === 'assigned' && (
                                    <button
                                        onClick={() => updateStatus(order.id, 'returned')}
                                        className="w-full bg-red-50 border-2 border-red-100 text-red-500 py-3 rounded-2xl font-black text-xs uppercase tracking-widest mt-2"
                                    >
                                        RECUSAR / PROBLEMA
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Support Fixed Banner */}
            <div className="fixed bottom-6 left-6 right-6">
                <div className="bg-white/80 backdrop-blur-xl p-4 rounded-3xl border border-white shadow-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`${isOnline ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'} p-2 rounded-xl`}>
                            {isOnline ? <Truck size={20} /> : <Clock size={20} />}
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status Atual</p>
                            <p className={`text-xs font-black uppercase ${isOnline ? 'text-emerald-600' : 'text-red-600'}`}>
                                {isOnline ? 'PRONTO PARA ENTREGAR' : 'PAUSADO / DESLOGADO'}
                            </p>
                        </div>
                    </div>
                    {isOnline && (
                        <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></div>
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
