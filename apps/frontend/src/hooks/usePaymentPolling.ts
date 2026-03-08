'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface UsePaymentPollingOptions {
    orderId: string;
    interval?: number; // ms, default 3000
    onPaid?: () => void;
    onConfirmed?: () => void;
    onCancelled?: () => void;
    slug?: string;
}

/**
 * Polls `/api/{slug}/orders/{orderId}/payment-status` every `interval` ms.
 * Calls the appropriate callback when payment state changes.
 * Automatically stops when paid/confirmed/cancelled/failed.
 */
export function usePaymentPolling({
    orderId,
    interval = 3000,
    onPaid,
    onConfirmed,
    onCancelled,
    slug,
}: UsePaymentPollingOptions) {
    const router = useRouter();
    const pollRef = useRef<NodeJS.Timeout | null>(null);
    const activeRef = useRef(true);

    useEffect(() => {
        if (!orderId) return;
        const tenantSlug = slug || localStorage.getItem('tenant_slug') || 'default';
        activeRef.current = true;

        const doPoll = async () => {
            if (!activeRef.current) return;
            try {
                const res = await fetch(
                    `${API}/api/${tenantSlug}/orders/${orderId}/payment-status`,
                    { cache: 'no-store' }
                );
                if (!res.ok) return;
                const data = await res.json();
                const status = data.payment_status || '';
                const orderStatus = data.order_status || '';

                if (status === 'paid' || orderStatus === 'confirmed') {
                    activeRef.current = false;
                    if (pollRef.current) clearInterval(pollRef.current);
                    onPaid?.();
                    router.replace(`/order/${orderId}?paid=1`);
                } else if (orderStatus === 'confirmed') {
                    onConfirmed?.();
                    activeRef.current = false;
                    if (pollRef.current) clearInterval(pollRef.current);
                } else if (status === 'failed' || status === 'cancelled' || orderStatus === 'cancelled') {
                    onCancelled?.();
                    activeRef.current = false;
                    if (pollRef.current) clearInterval(pollRef.current);
                }
            } catch { /* silent */ }
        };

        doPoll();
        pollRef.current = setInterval(doPoll, interval);
        return () => {
            activeRef.current = false;
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [orderId, interval, slug, onPaid, onConfirmed, onCancelled, router]);
}
