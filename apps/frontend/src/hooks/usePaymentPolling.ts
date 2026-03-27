'use client';

import { useEffect, useRef } from 'react';
import { readTenantSlugFromBrowser } from './useTenant';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface PaymentPollingResponse {
    payment_status?: string;
    order_status?: string;
    paid_at?: string;
    pix_qr_code?: string;
    pix_qr_base64?: string;
}

interface UsePaymentPollingOptions {
    orderId: string;
    interval?: number; // ms, default 3000
    enabled?: boolean;
    onPaid?: (data: PaymentPollingResponse) => void;
    onConfirmed?: (data: PaymentPollingResponse) => void;
    onCancelled?: (data: PaymentPollingResponse) => void;
    onStatusChange?: (data: PaymentPollingResponse) => void;
    slug?: string;
}

/**
 * Polls `/api/{slug}/orders/{orderId}/payment-status` every `interval` ms.
 * Calls the appropriate callback when payment state changes.
 * Uses recursive timeouts so requests never overlap on slow connections.
 */
export function usePaymentPolling({
    orderId,
    interval = 3000,
    enabled = true,
    onPaid,
    onConfirmed,
    onCancelled,
    onStatusChange,
    slug,
}: UsePaymentPollingOptions) {
    const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const activeRef = useRef(true);
    const inFlightRef = useRef(false);
    const finishedRef = useRef(false);
    const onPaidRef = useRef(onPaid);
    const onConfirmedRef = useRef(onConfirmed);
    const onCancelledRef = useRef(onCancelled);
    const onStatusChangeRef = useRef(onStatusChange);

    useEffect(() => {
        onPaidRef.current = onPaid;
        onConfirmedRef.current = onConfirmed;
        onCancelledRef.current = onCancelled;
        onStatusChangeRef.current = onStatusChange;
    }, [onPaid, onConfirmed, onCancelled, onStatusChange]);

    useEffect(() => {
        if (!orderId || !enabled) return;

        const tenantSlug = readTenantSlugFromBrowser({ preferredSlug: slug });
        activeRef.current = true;
        finishedRef.current = false;
        inFlightRef.current = false;

        const scheduleNextPoll = () => {
            if (!activeRef.current || finishedRef.current) return;
            pollRef.current = setTimeout(doPoll, interval);
        };

        const doPoll = async () => {
            if (!activeRef.current || finishedRef.current || inFlightRef.current) return;

            inFlightRef.current = true;

            try {
                const res = await fetch(
                    `${API}/api/${tenantSlug}/orders/${orderId}/payment-status`,
                    { cache: 'no-store' }
                );
                if (!res.ok) return;

                const data = await res.json() as PaymentPollingResponse;
                onStatusChangeRef.current?.(data);

                const status = data.payment_status || '';
                const orderStatus = data.order_status || '';

                if (status === 'paid') {
                    finishedRef.current = true;
                    onPaidRef.current?.(data);
                } else if (orderStatus === 'confirmed') {
                    finishedRef.current = true;
                    if (onConfirmedRef.current) {
                        onConfirmedRef.current(data);
                    } else {
                        onPaidRef.current?.(data);
                    }
                } else if (status === 'failed' || status === 'cancelled' || orderStatus === 'cancelled') {
                    finishedRef.current = true;
                    onCancelledRef.current?.(data);
                }
            } catch {
                // Keep polling silently to avoid interrupting checkout UX.
            } finally {
                inFlightRef.current = false;
                scheduleNextPoll();
            }
        };

        doPoll();

        return () => {
            activeRef.current = false;
            finishedRef.current = true;
            if (pollRef.current) clearTimeout(pollRef.current);
        };
    }, [orderId, interval, enabled, slug]);
}
