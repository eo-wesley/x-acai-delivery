import { applyCounterCatalog } from './counter-prices';
import type { MenuPresentationItem } from './menu-presentation';

export interface CatalogMenuItem extends MenuPresentationItem {
    price_cents: number;
    image_url?: string;
}

type ReadCatalog = (url: string) => Promise<unknown>;

function asCatalog(value: unknown): CatalogMenuItem[] {
    if (!Array.isArray(value) || value.some(item => !item || typeof item.id !== 'string'
        || typeof item.name !== 'string' || !Number.isSafeInteger(item.price_cents) || item.price_cents < 0)) {
        throw new Error('Catálogo inválido');
    }
    return value;
}

async function readJson(url: string): Promise<unknown> {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Catálogo indisponível');
    return response.json();
}

// Every catalog surface uses the same counter price version. An empty live
// catalog is authoritative; the local preview is only an offline fallback.
export async function loadMenuCatalog(api: string, slug: string, read: ReadCatalog = readJson): Promise<CatalogMenuItem[]> {
    let catalog: CatalogMenuItem[];
    try {
        catalog = asCatalog(await read(`${api}/api/${encodeURIComponent(slug)}/menu`));
    } catch {
        catalog = asCatalog(await read('/default-menu.json'));
    }
    return applyCounterCatalog(catalog);
}
