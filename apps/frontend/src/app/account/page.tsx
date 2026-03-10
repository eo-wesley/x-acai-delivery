'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    User,
    MapPin,
    ShoppingBag,
    Star,
    LogOut,
    ArrowRight,
    ChevronRight,
    Home,
    Briefcase,
    Share2,
    Crown
} from 'lucide-react';
import { useCart } from '../../components/CartContext';
import FidelityStamps from '../../components/FidelityStamps';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function CustomerAccount() {
    const router = useRouter();
    const { addToCart } = useCart();
    const [customer, setCustomer] = useState<any>(null);
    const [addresses, setAddresses] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [slug, setSlug] = useState('default');

    useEffect(() => {
        const storedSlug = localStorage.getItem('last_slug') || 'default';
        setSlug(storedSlug);

        const fetchData = async () => {
            const token = localStorage.getItem('customer_token');
            if (!token) {
                router.push('/login');
                return;
            }

            try {
                const customerData = JSON.parse(localStorage.getItem('customer_data') || '{}');
                const headers = { Authorization: `Bearer ${token}` };

                const [meRes, addrRes, ordRes] = await Promise.all([
                    fetch(`${API}/api/${storedSlug}/loyalty/me?phone=${customerData.phone}`, { headers }),
                    fetch(`${API}/api/${storedSlug}/customer/addresses`, { headers }),
                    fetch(`${API}/api/${storedSlug}/customer/orders`, { headers })
                ]);

                if (meRes.ok) setCustomer(await meRes.json());
                else if (meRes.status === 401) handleLogout();

                if (addrRes.ok) setAddresses(await addrRes.json());
                if (ordRes.ok) setOrders(await ordRes.json());
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleCheckReferral = async (code: string) => {
        if (!code.trim() || !customer?.customerId) return;
        try {
            const res = await fetch(`${API}/api/${slug}/loyalty/referral/check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ referralCode: code.toUpperCase(), customerId: customer.customerId })
            });
            const data = await res.json();
            if (res.ok) alert(data.message);
            else alert(data.error || 'Erro ao validar código');
        } catch (e) {
            alert('Erro de conexão');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('customer_token');
        localStorage.removeItem('customer_data');
        router.push('/login');
    };

    const handleRepeatOrder = (order: any) => {
        try {
            const items = JSON.parse(order.items);
            items.forEach((item: any) => {
                addToCart({
                    cartKey: item.cartKey || `${item.menuItemId}|${(item.selected_options || []).map((o: any) => o.optionId).sort().join(',')}`,
                    menuItemId: item.menuItemId,
                    name: item.name,
                    base_price_cents: item.base_price_cents || item.price_cents,
                    price_cents: item.price_cents,
                    qty: item.qty,
                    notes: item.notes,
                    selected_options: item.selected_options || []
                });
            });
            router.push('/cart');
        } catch (e) {
            console.error('Erro ao repetir pedido', e);
        }
    };

    if (loading) return <div className="p-12 text-center animate-pulse font-black text-gray-300 tracking-widest uppercase">Carregando Perfil...</div>;

    const tierColors: Record<string, string> = {
        'BRONZE': 'from-orange-800 to-orange-400',
        'PRATA': 'from-gray-400 to-gray-100',
        'OURO': 'from-yellow-600 to-yellow-200',
    };

    const currentTier = customer?.tier?.name?.toUpperCase() || 'BRONZE';

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Header Profile Section */}
            <div className="bg-white p-6 pt-12 rounded-b-[3rem] shadow-xl shadow-gray-200/50">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 bg-purple-600 rounded-3xl flex items-center justify-center text-white shadow-lg shadow-purple-200">
                        <User size={32} />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-black text-gray-900 tracking-tighter uppercase leading-none">{customer?.name}</h1>
                        <p className="text-gray-400 font-bold text-xs mt-1 uppercase tracking-widest">{customer?.phone}</p>
                    </div>
                    <button onClick={handleLogout} className="p-3 text-gray-400 hover:text-red-500 transition">
                        <LogOut size={24} />
                    </button>
                </div>

                {/* 🏆 Phase 63: Premium Tier Card (Glassmorphism) */}
                <div className={`bg-gradient-to-br ${tierColors[currentTier] || 'from-gray-800 to-gray-900'} p-1 rounded-[2.2rem] shadow-2xl relative overflow-hidden group mb-6`}>
                    <div className="bg-white/10 backdrop-blur-2xl rounded-[2rem] p-6 text-white border border-white/20 relative z-10">
                        <div className="absolute top-[-20px] right-[-20px] w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>

                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">X-Açaí Privilege</p>
                                <div className="flex items-center gap-2">
                                    {customer?.isVip ? (
                                        <Crown className="text-yellow-300 fill-yellow-300 drop-shadow-[0_0_8px_rgba(253,224,71,0.5)]" size={20} />
                                    ) : (
                                        <Star className="text-white fill-white" size={20} />
                                    )}
                                    <span className="text-2xl font-black tracking-tighter uppercase drop-shadow-md">
                                        {customer?.isVip ? 'MEMBRO VIP' : `NÍVEL ${currentTier}`}
                                    </span>
                                </div>
                                {customer?.isVip && customer?.vipExpiresAt && (
                                    <p className="text-[9px] text-white/50 font-bold uppercase mt-1">Status Ativo até {new Date(customer.vipExpiresAt).toLocaleDateString()}</p>
                                )}
                            </div>
                            <div className="text-emerald-300 font-black text-[10px] bg-white/10 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-md uppercase tracking-widest">
                                Ativo
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-white/10">
                            <div>
                                <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Saldo Carteira</p>
                                <div className="text-2xl font-black text-white leading-none">
                                    R$ {(customer?.walletBalance / 100 || 0).toFixed(2).replace('.', ',')}
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Indique</p>
                                <div className="flex items-center justify-end gap-2 text-white">
                                    <span className="text-xl font-black tracking-widest">{customer?.referralCode}</span>
                                    <button onClick={() => {
                                        navigator.clipboard.writeText(customer?.referralCode);
                                        alert('Código copiado!');
                                    }} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                                        <Share2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 🎫 Phase 63: Fidelity Stamps */}
                <FidelityStamps points={customer?.points || 0} />
            </div>

            <div className="p-6 space-y-8">
                {/* Referred Section */}
                <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest ml-1">
                        <Share2 size={16} /> Ganhe R$ 5,00 de Crédito
                    </div>
                    <p className="text-xs text-gray-500 font-bold px-1">Se você foi indicado por um amigo, insira o código dele abaixo para ganhar descontos!</p>
                    <div className="flex gap-2">
                        <input
                            id="referralInput"
                            type="text"
                            placeholder="CÓDIGO DE INDICAÇÃO"
                            className="flex-1 border border-gray-200 rounded-2xl p-4 outline-none focus:border-purple-500 text-sm uppercase font-black tracking-widest"
                            onKeyDown={e => e.key === 'Enter' && handleCheckReferral((e.target as HTMLInputElement).value)}
                        />
                        <button
                            onClick={() => {
                                const input = document.getElementById('referralInput') as HTMLInputElement;
                                handleCheckReferral(input.value);
                            }}
                            className="bg-gray-900 text-white font-black px-6 rounded-2xl text-xs uppercase tracking-widest shadow-lg shadow-gray-200 active:scale-95 transition"
                        >
                            ENVIAR
                        </button>
                    </div>
                </section>

                <section className="space-y-4">
                    <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest ml-1">
                        <MapPin size={16} /> Meus Endereços
                    </div>
                    <div className="space-y-3">
                        {addresses.map((addr: any) => (
                            <div key={addr.id} className="bg-white p-4 rounded-2xl flex items-center justify-between border border-gray-100 shadow-sm transition active:scale-95">
                                <div className="flex items-center gap-3">
                                    <div className="bg-gray-50 p-3 rounded-xl text-purple-600">
                                        {addr.label === 'Casa' ? <Home size={20} /> : addr.label === 'Trabalho' ? <Briefcase size={20} /> : <MapPin size={20} />}
                                    </div>
                                    <div>
                                        <p className="font-black text-gray-800 text-sm uppercase leading-none mb-1">{addr.label}</p>
                                        <p className="text-xs text-gray-500 font-bold truncate max-w-[200px]">{addr.street}, {addr.number}</p>
                                    </div>
                                </div>
                                <ChevronRight className="text-gray-300" size={20} />
                            </div>
                        ))}
                    </div>
                </section>

                <section className="space-y-4">
                    <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest ml-1">
                        <ShoppingBag size={16} /> Histórico Recente
                    </div>
                    <div className="space-y-3">
                        {orders.length === 0 ? (
                            <div className="bg-white p-8 rounded-3xl text-center border border-gray-100">
                                <ShoppingBag className="mx-auto text-gray-200 mb-2" size={32} />
                                <p className="text-gray-400 font-bold text-xs uppercase">Nenhum pedido ainda</p>
                            </div>
                        ) : (
                            orders.map((order: any) => (
                                <div key={order.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">#{order.id.slice(-6).toUpperCase()}</p>
                                            <p className="text-xs text-gray-500 font-bold">{new Date(order.created_at).toLocaleDateString()}</p>
                                        </div>
                                        <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${order.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                                            {order.status === 'completed' ? 'CONCLUÍDO' : 'EM ANDAMENTO'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm font-black text-gray-800">
                                            R$ {(order.total_cents / 100).toFixed(2).replace('.', ',')}
                                        </div>
                                        <button
                                            onClick={() => handleRepeatOrder(order)}
                                            className="flex items-center gap-1 text-purple-600 font-black text-[10px] uppercase tracking-widest hover:bg-purple-50 px-3 py-2 rounded-xl transition"
                                        >
                                            PEDIR NOVAMENTE <ArrowRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
