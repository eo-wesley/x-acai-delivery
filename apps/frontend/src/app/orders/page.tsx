'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function OrdersListPage() {
    const [phone, setPhone] = useState('');
    const [orders, setOrders] = useState([]);
    const [searched, setSearched] = useState(false);
    const [loading, setLoading] = useState(false);

    // This mimics how an user could 'login' checking phone number for guest history
    const handleCheck = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Ideally we'd have a specific `GET /api/orders/by-phone/:phone`
            // Since we didn't specify that logic explicitly in app.routes.ts, we use the Admin endpoint or assume standard behavior
            // As workaround, we mock the search here directing them to type the exact ID they saved if they don't have phone API
            alert("Em modo de demonstração, use o Link direto que apareceu após o Checkout.");
            setSearched(true);
        } catch (err) { }
        setLoading(false);
    };

    return (
        <div className="p-4">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Meus Pedidos</h2>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-center">
                <span className="text-4xl block mb-4">🧾</span>
                <p className="text-gray-600 mb-6">
                    Seu histórico de pedidos do App e do Assistente IA (PadBase) serão unificados na sua conta principal em breve!
                </p>

                <Link href="/">
                    <button className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-colors">
                        Ir para o Início
                    </button>
                </Link>
            </div>
        </div>
    );
}
