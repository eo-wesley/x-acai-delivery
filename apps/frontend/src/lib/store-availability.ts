export interface StoreInfo {
    name: string;
    store_status: string;
    can_accept_orders?: boolean | number;
    temp_close_reason?: string;
    description?: string;
    prep_time_minutes?: number;
    delivery_fee_cents?: number;
    min_order_cents?: number;
    banner_url?: string;
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
    font_family?: string;
}

export function canStoreAcceptOrders(store: StoreInfo | null): boolean {
    return store?.store_status === 'open'
        && (store.can_accept_orders === true || store.can_accept_orders === 1);
}

export function storeUnavailableMessage(store: StoreInfo | null): string {
    if (!store) return 'Prévia do cardápio — serviço de pedidos indisponível. Você pode conferir os preços e montar a sacola, mas nenhum pedido será enviado.';
    if (store.temp_close_reason) return store.temp_close_reason;
    if (store.store_status === 'closed') return 'Loja fechada. Você pode consultar o cardápio e montar a sacola para mais tarde.';
    if (store.store_status === 'paused') return 'Pedidos pausados. O cardápio continua disponível para consulta.';
    if (store.store_status === 'busy') return 'A loja está no limite de pedidos. Tente novamente em instantes.';
    return 'Recebimento de pedidos indisponível. O cardápio continua disponível para consulta.';
}

type FetchStore = (url: string, init: RequestInit) => Promise<Pick<Response, 'ok' | 'json'>>;

// No fallback may imply that a store is open. Only a successful live response
// with an explicit acceptance flag can unlock order submission.
export async function loadStoreInfo(api: string, slug: string, read: FetchStore = fetch): Promise<StoreInfo | null> {
    try {
        const response = await read(`${api}/api/${encodeURIComponent(slug)}/store`, {
            cache: 'no-store', signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) return null;
        const value: unknown = await response.json();
        if (!value || typeof value !== 'object' || !('store_status' in value)
            || !['open', 'closed', 'paused', 'busy'].includes(String(value.store_status))) return null;
        return value as StoreInfo;
    } catch {
        return null;
    }
}
