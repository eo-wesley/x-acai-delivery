'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PaymentPollingResponse, usePaymentPolling } from '../../../hooks/usePaymentPolling';
import { readTenantSlugFromBrowser } from '../../../hooks/useTenant';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const REDIRECT_DELAY_MS = 2200;

interface PixSessionData {
    orderId: string;
    qrCode: string;
    qrBase64: string;
    expiresAt?: string;
    totalCents?: number;
    items?: Array<{ name: string; qty: number }>;
    slug?: string;
}

function fmtCents(cents: number) {
    return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
}

function getWaitingLabel(status: string) {
    if (status === 'waiting_pix') return 'Pagamento Pix iniciado. Estamos aguardando a confirmacao do banco.';
    if (status === 'pending') return 'Pedido criado. Falta apenas a confirmacao do pagamento para seguir.';
    return 'Aguardando a confirmacao automatica do pagamento.';
}

function PixQRBlock({
    qrCode,
    qrBase64,
    expiresAt,
    refreshing,
    onRefresh,
}: {
    qrCode: string;
    qrBase64: string;
    expiresAt?: string;
    refreshing: boolean;
    onRefresh: () => void;
}) {
    const [copied, setCopied] = useState(false);
    const [expired, setExpired] = useState(false);
    const [remaining, setRemaining] = useState('');

    useEffect(() => {
        setExpired(false);
        setRemaining('');

        if (!expiresAt) return;

        const tick = () => {
            const diff = new Date(expiresAt).getTime() - Date.now();

            if (diff <= 0) {
                setExpired(true);
                setRemaining('00:00');
                return false;
            }

            const minutes = Math.floor(diff / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            setRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
            return true;
        };

        tick();
        const intervalId = setInterval(() => {
            const shouldContinue = tick();
            if (!shouldContinue) {
                clearInterval(intervalId);
            }
        }, 1000);

        return () => clearInterval(intervalId);
    }, [expiresAt]);

    const copyQr = async () => {
        try {
            await navigator.clipboard.writeText(qrCode);
            setCopied(true);
        } catch {
            const textarea = document.createElement('textarea');
            textarea.value = qrCode;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            setCopied(true);
        }

        setTimeout(() => setCopied(false), 2500);
    };

    return (
        <div className="space-y-5">
            <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-4 shadow-inner">
                <div className="mx-auto flex w-full max-w-[320px] flex-col items-center rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                    {qrBase64 ? (
                        <img
                            src={`data:image/png;base64,${qrBase64}`}
                            alt="QR Code Pix"
                            className="h-[min(78vw,320px)] w-[min(78vw,320px)] max-h-80 max-w-80 rounded-2xl object-contain"
                            loading="eager"
                        />
                    ) : (
                        <div className="flex h-[min(78vw,320px)] w-[min(78vw,320px)] max-h-80 max-w-80 flex-col items-center justify-center rounded-2xl bg-slate-100 px-5 text-center">
                            <span className="text-5xl">PIX</span>
                            <p className="mt-3 text-sm font-medium text-slate-500">
                                O banco pode usar o codigo abaixo caso o QR nao apareca.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p className="font-black uppercase tracking-wide">Validade do codigo</p>
                <p className="mt-1 font-medium">
                    {remaining ? `Expira em ${remaining}.` : 'A validade do Pix esta sendo atualizada.'}
                </p>
            </div>

            <button
                type="button"
                onClick={copyQr}
                className={`flex w-full items-center justify-center rounded-2xl px-4 py-4 text-base font-black transition active:scale-[0.99] ${
                    copied ? 'bg-emerald-500 text-white' : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
            >
                {copied ? 'Codigo Pix copiado' : 'Copiar codigo Pix'}
            </button>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Pix copia e cola</p>
                <p className="mt-3 break-all font-mono text-xs leading-6 text-slate-700 select-all">
                    {qrCode}
                </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
                <button
                    type="button"
                    onClick={onRefresh}
                    disabled={refreshing}
                    className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {refreshing ? 'Atualizando...' : expired ? 'Atualizar pagamento' : 'Atualizar QR e status'}
                </button>
                <Link
                    href="/"
                    className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                    Voltar ao cardapio
                </Link>
            </div>
        </div>
    );
}

async function fetchPixOrder(orderId: string, tenantSlug: string) {
    const tenantResponse = await fetch(`${API}/api/${tenantSlug}/orders/${orderId}`, { cache: 'no-store' });
    if (tenantResponse.ok) {
        return tenantResponse.json();
    }

    const fallbackResponse = await fetch(`${API}/api/orders/${orderId}`, { cache: 'no-store' });
    if (!fallbackResponse.ok) {
        throw new Error('QR Pix nao encontrado para este pedido.');
    }

    return fallbackResponse.json();
}

export default function PixPaymentPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    const [pixData, setPixData] = useState<PixSessionData | null>(null);
    const [phase, setPhase] = useState<'loading' | 'ready' | 'success' | 'error'>('loading');
    const [paymentStatus, setPaymentStatus] = useState('pending_payment');
    const [error, setError] = useState('');
    const [tenantSlug, setTenantSlug] = useState('default');
    const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
    const [reloadNonce, setReloadNonce] = useState(0);

    useEffect(() => {
        let cancelled = false;

        const loadPixData = async () => {
            setPhase('loading');
            setError('');

            try {
                const stored = sessionStorage.getItem(`pix_${id}`);
                let resolvedSlug = readTenantSlugFromBrowser();

                if (stored) {
                    const parsed = JSON.parse(stored) as PixSessionData;
                    resolvedSlug = readTenantSlugFromBrowser({ preferredSlug: parsed.slug || resolvedSlug });

                    if (!cancelled) {
                        const nextPixData = { ...parsed, slug: resolvedSlug };
                        setPixData(nextPixData);
                        setTenantSlug(resolvedSlug);
                        setPhase('ready');
                    }

                    try {
                        localStorage.setItem('tenant_slug', resolvedSlug);
                        sessionStorage.setItem(`pix_${id}`, JSON.stringify({ ...parsed, slug: resolvedSlug }));
                    } catch {
                        // Ignore storage limitations.
                    }

                    return;
                }

                const order = await fetchPixOrder(id, resolvedSlug);

                if (!(order.payment_qr_code || order.pix_qr_code)) {
                    throw new Error('QR Pix nao encontrado para este pedido.');
                }

                const nextPixData: PixSessionData = {
                    orderId: id,
                    qrCode: order.payment_qr_code || order.pix_qr_code || '',
                    qrBase64: order.payment_qr_base64 || order.pix_qr_base64 || '',
                    expiresAt: order.pix_expires_at || undefined,
                    totalCents: order.total_cents,
                    items: Array.isArray(order.items)
                        ? order.items.map((item: any) => ({
                              name: item.name || item.menuItemId || 'Item',
                              qty: item.qty || 1,
                          }))
                        : undefined,
                    slug: resolvedSlug,
                };

                if (!cancelled) {
                    setPixData(nextPixData);
                    setTenantSlug(resolvedSlug);
                    setPhase('ready');
                }

                try {
                    localStorage.setItem('tenant_slug', resolvedSlug);
                    sessionStorage.setItem(`pix_${id}`, JSON.stringify(nextPixData));
                } catch {
                    // Ignore storage limitations.
                }
            } catch (loadError: any) {
                if (!cancelled) {
                    setError(loadError?.message || 'Falha ao carregar os dados do pagamento.');
                    setPhase('error');
                }
            }
        };

        void loadPixData();

        return () => {
            cancelled = true;
        };
    }, [id, reloadNonce]);

    usePaymentPolling({
        orderId: id,
        enabled: phase === 'ready',
        interval: 3000,
        slug: tenantSlug,
        onStatusChange: (data: PaymentPollingResponse) => {
            setLastCheckedAt(new Date());
            setPaymentStatus(data.payment_status || data.order_status || 'pending_payment');

            if (!data.pix_qr_code && !data.pix_qr_base64) return;

            setPixData(current => {
                if (!current) return current;

                return {
                    ...current,
                    qrCode: data.pix_qr_code || current.qrCode,
                    qrBase64: data.pix_qr_base64 || current.qrBase64,
                };
            });
        },
        onPaid: (data: PaymentPollingResponse) => {
            setLastCheckedAt(new Date());
            setPaymentStatus(data.payment_status || 'paid');
            setPhase('success');

            try {
                sessionStorage.removeItem(`pix_${id}`);
            } catch {
                // Ignore storage limitations.
            }
        },
        onCancelled: (data: PaymentPollingResponse) => {
            setPaymentStatus(data.payment_status || data.order_status || 'cancelled');
            setError('O pagamento foi cancelado ou nao pode ser confirmado. Tente novamente.');
            setPhase('error');
        },
    });

    useEffect(() => {
        if (phase !== 'success') return;

        const redirectTimer = setTimeout(() => {
            router.replace(`/order/${id}?paid=1`);
        }, REDIRECT_DELAY_MS);

        return () => clearTimeout(redirectTimer);
    }, [id, phase, router]);

    const handleRefresh = () => {
        setReloadNonce(current => current + 1);
    };

    if (phase === 'loading') {
        return (
            <div className="min-h-screen bg-[#f5f7fb] px-4 py-8">
                <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center rounded-[32px] bg-white px-6 text-center shadow-sm">
                    <div className="h-14 w-14 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
                    <h1 className="mt-6 text-xl font-black text-slate-900">Preparando seu Pix</h1>
                    <p className="mt-2 text-sm text-slate-500">
                        Estamos carregando o QR Code e o status mais recente do pagamento.
                    </p>
                </div>
            </div>
        );
    }

    if (phase === 'success') {
        return (
            <div className="min-h-screen bg-[radial-gradient(circle_at_top,#dcfce7,white_55%)] px-4 py-8">
                <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center rounded-[32px] bg-white px-6 py-10 text-center shadow-sm">
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 text-3xl font-black text-emerald-600">OK</div>
                    <h1 className="mt-6 text-3xl font-black tracking-tight text-slate-900">
                        Pagamento confirmado
                    </h1>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                        Seu Pix foi aprovado e o pedido ja pode seguir para a loja.
                    </p>
                    {pixData?.totalCents ? (
                        <div className="mt-6 rounded-2xl bg-emerald-50 px-5 py-4 text-emerald-900">
                            <p className="text-xs font-black uppercase tracking-[0.18em]">Valor aprovado</p>
                            <p className="mt-2 text-2xl font-black">{fmtCents(pixData.totalCents)}</p>
                        </div>
                    ) : null}
                    <p className="mt-6 text-sm font-medium text-slate-500">
                        Redirecionando para o acompanhamento do pedido...
                    </p>
                    <Link
                        href={`/order/${id}?paid=1`}
                        className="mt-5 w-full rounded-2xl bg-emerald-600 px-4 py-4 text-base font-black text-white transition hover:bg-emerald-700"
                    >
                        Ver pedido agora
                    </Link>
                </div>
            </div>
        );
    }

    if (phase === 'error' || !pixData) {
        return (
            <div className="min-h-screen bg-[#f5f7fb] px-4 py-8">
                <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center rounded-[32px] bg-white px-6 text-center shadow-sm">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-rose-100 text-4xl text-rose-500">
                        !
                    </div>
                    <h1 className="mt-6 text-2xl font-black text-slate-900">Nao foi possivel abrir o Pix</h1>
                    <p className="mt-3 text-sm leading-6 text-slate-500">
                        {error || 'Tivemos um problema ao carregar os dados do pagamento.'}
                    </p>
                    <div className="mt-6 flex w-full flex-col gap-3">
                        <button
                            type="button"
                            onClick={handleRefresh}
                            className="w-full rounded-2xl bg-slate-900 px-4 py-4 text-base font-black text-white transition hover:bg-slate-800"
                        >
                            Tentar novamente
                        </button>
                        <Link
                            href={`/order/${id}`}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base font-bold text-slate-700 transition hover:bg-slate-50"
                        >
                            Ir para o pedido
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f5f7fb] px-4 py-5">
            <div className="mx-auto max-w-md pb-10">
                <div className="overflow-hidden rounded-[32px] bg-white shadow-sm">
                    <div className="bg-[linear-gradient(135deg,#0f172a,#14532d)] px-5 pb-8 pt-6 text-white">
                        <div className="flex items-center justify-between gap-3">
                            <Link href={`/order/${id}`} className="text-sm font-bold text-emerald-100">
                                Voltar ao pedido
                            </Link>
                            <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-100">
                                Pix
                            </span>
                        </div>

                        <h1 className="mt-5 text-[32px] font-black leading-none tracking-tight">
                            Pague seu pedido com Pix
                        </h1>
                        <p className="mt-3 max-w-sm text-sm leading-6 text-emerald-50/85">
                            Escaneie o QR Code ou copie o codigo. A confirmacao acontece automaticamente a cada 3 segundos.
                        </p>

                        {pixData.totalCents ? (
                            <div className="mt-6 inline-flex rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm">
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-100/80">
                                        Total desta compra
                                    </p>
                                    <p className="mt-1 text-3xl font-black">{fmtCents(pixData.totalCents)}</p>
                                </div>
                            </div>
                        ) : null}
                    </div>

                    <div className="space-y-5 px-5 py-6">
                        <div className="rounded-[28px] border border-emerald-100 bg-emerald-50 p-4 text-emerald-950">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                                        Status do pagamento
                                    </p>
                                    <p className="mt-2 text-base font-black">
                                        {paymentStatus === 'paid' ? 'Pagamento confirmado' : 'Aguardando confirmacao'}
                                    </p>
                                    <p className="mt-1 text-sm leading-6 text-emerald-900/80">
                                        {getWaitingLabel(paymentStatus)}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 pt-1">
                                    {[0, 1, 2].map(index => (
                                        <span
                                            key={index}
                                            className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-bounce"
                                            style={{ animationDelay: `${index * 0.18}s` }}
                                        />
                                    ))}
                                </div>
                            </div>
                            <p className="mt-3 text-xs font-medium text-emerald-800/80">
                                {lastCheckedAt
                                    ? `Ultima checagem automatica: ${lastCheckedAt.toLocaleTimeString('pt-BR', {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                          second: '2-digit',
                                      })}`
                                    : 'Primeira verificacao em andamento...'}
                            </p>
                        </div>

                        <PixQRBlock
                            qrCode={pixData.qrCode}
                            qrBase64={pixData.qrBase64}
                            expiresAt={pixData.expiresAt}
                            refreshing={phase === 'loading'}
                            onRefresh={handleRefresh}
                        />

                        <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                            <h2 className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                                Como pagar
                            </h2>
                            <ol className="mt-4 space-y-3 text-sm text-slate-700">
                                <li className="flex items-start gap-3">
                                    <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-black text-slate-700 shadow-sm">
                                        1
                                    </span>
                                    Abra o app do seu banco e entre na area Pix.
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-black text-slate-700 shadow-sm">
                                        2
                                    </span>
                                    Escaneie o QR Code maior acima ou use o botao de copiar codigo.
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-black text-slate-700 shadow-sm">
                                        3
                                    </span>
                                    Depois de pagar, aguarde nesta tela. A confirmacao acontece sem precisar atualizar a pagina.
                                </li>
                            </ol>
                        </div>

                        <div className="rounded-[28px] border border-slate-200 bg-white p-5">
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                                Informacoes do pedido
                            </p>
                            <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
                                <span>Numero do pedido</span>
                                <span className="font-black text-slate-900">#{id.slice(0, 8).toUpperCase()}</span>
                            </div>
                            {pixData.items?.length ? (
                                <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm text-slate-600">
                                    {pixData.items.map((item, index) => (
                                        <div key={`${item.name}-${index}`} className="flex items-center justify-between gap-3">
                                            <span className="truncate">
                                                {item.qty}x {item.name}
                                            </span>
                                            <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                                Item
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
