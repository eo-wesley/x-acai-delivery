'use client';

import { useState, useEffect } from 'react';
import { getApiBase } from '../hooks/useTenant';

export default function NotificationToast() {
    const [lastOrderId, setLastOrderId] = useState<string | null>(null);
    const [notification, setNotification] = useState<{ id: string, message: string } | null>(null);

    useEffect(() => {
        const checkNewOrders = async () => {
            try {
                const token = localStorage.getItem('admin_token');
                if (!token) return;

                const API = getApiBase();
                const res = await fetch(`${API}/api/admin/orders?limit=1`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const orders = await res.json();

                if (orders && orders.length > 0) {
                    const newest = orders[0];
                    if (lastOrderId && newest.id !== lastOrderId) {
                        // New order detected!
                        setNotification({
                            id: newest.id,
                            message: `🔔 Novo Pedido #${newest.id.slice(-4)} de ${newest.customer_name || 'Cliente'}!`
                        });
                        // Auto hide after 5s
                        setTimeout(() => setNotification(null), 5000);

                        // Notification sound (optional/simulated)
                        console.log("DING! Novo pedido.");
                    }
                    setLastOrderId(newest.id);
                }
            } catch (err) {
                // Silent error for notifications
            }
        };

        const interval = setInterval(checkNewOrders, 10000); // Check every 10s
        checkNewOrders(); // Initial check

        return () => clearInterval(interval);
    }, [lastOrderId]);

    if (!notification) return null;

    return (
        <div className="fixed top-4 right-4 z-[9999] animate-bounce-in">
            <div className="bg-white border-l-4 border-purple-600 shadow-2xl rounded-lg p-4 flex items-center gap-4 min-w-[300px]">
                <div className="bg-purple-100 p-2 rounded-full text-purple-600 text-xl">
                    🥡
                </div>
                <div className="flex-1">
                    <div className="font-black text-gray-800 text-sm">NOTIFICAÇÃO EM TEMPO REAL</div>
                    <p className="text-gray-600 text-sm">{notification.message}</p>
                </div>
                <button
                    onClick={() => setNotification(null)}
                    className="text-gray-400 hover:text-gray-600 font-bold"
                >
                    ✕
                </button>
            </div>
            <style jsx>{`
        .animate-bounce-in {
          animation: bounceIn 0.5s ease-out;
        }
        @keyframes bounceIn {
          0% { transform: translateX(100%); opacity: 0; }
          60% { transform: translateX(-10px); }
          100% { transform: translateX(0); opacity: 1; }
        }
      `}</style>
        </div>
    );
}
