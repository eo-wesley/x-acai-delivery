import counterPriceData from '../data/counter-prices.json';

// Materialized copy of backend/src/data/counter-prices.json. A parity test keeps
// both isolated Docker builds on the same price version.
interface CounterPrice {
    name: string;
    price_cents: number;
    size_prices_cents?: Record<string, number>;
    duo_flavor_prices_cents?: Record<string, number>;
}

const counterPrices = counterPriceData as { version: string; products: Record<string, CounterPrice> };
export const COUNTER_PRICE_VERSION = counterPrices.version;

export function normalizeCounterLabel(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

export function getCounterOptionPrice(productId: string, groupName: string, optionName: string): number | undefined {
    const price = counterPrices.products[productId];
    if (!price) return undefined;
    const group = normalizeCounterLabel(groupName);
    if (price.size_prices_cents && group.includes('tamanho')) {
        const size = optionName.match(/\b(300|400|500|700)\s*ml\b/i)?.[1];
        const total = size ? price.size_prices_cents[size] : undefined;
        return total === undefined ? undefined : total - price.price_cents;
    }
    if (price.duo_flavor_prices_cents && /copo|sabor|opç|opcao|opcoes/.test(group)) {
        const flavor = price.duo_flavor_prices_cents[normalizeCounterLabel(optionName)];
        if (flavor !== undefined) return flavor - price.price_cents / 2;
    }
    return undefined;
}

interface PriceOption { name: string; price_cents: number }
interface PriceGroup { name: string; options: PriceOption[] }

export function applyCounterOptionGroups<T extends PriceGroup>(productId: string, groups: T[]): T[] {
    // The live iFood snapshot is authoritative for the public catalog.
    return groups;
}

export function applyCounterProduct<T extends { id: string; price_cents: number; option_groups?: PriceGroup[] }>(product: T): T {
    return product;
}

export function applyCounterCatalog<T extends { id: string; price_cents: number; option_groups?: PriceGroup[] }>(products: T[]): T[] {
    return products;
}

interface SavedOption { groupName: string; optionName: string; price_cents: number }
interface SavedItem {
    menuItemId: string;
    base_price_cents: number;
    price_cents: number;
    selected_options?: SavedOption[];
}

export function repriceCounterCartItem<T extends SavedItem>(item: T): T {
    const price = counterPrices.products[item.menuItemId];
    // Preserve unknown products and every note, quantity and choice. This is a
    // price migration, not permission to remove an existing customer's item.
    if (!price) return item;
    const options = item.selected_options?.map(option => ({
        ...option,
        price_cents: getCounterOptionPrice(item.menuItemId, option.groupName, option.optionName) ?? option.price_cents,
    }));
    return {
        ...item,
        base_price_cents: price.price_cents,
        price_cents: price.price_cents + (options || []).reduce((sum, option) => sum + option.price_cents, 0),
        ...(options ? { selected_options: options } : {}),
    };
}

export function migrateCounterCart<T extends SavedItem, C>(saved: { items: T[]; coupon?: C | null; priceVersion?: string }) {
    const items = saved.items.map(repriceCounterCartItem);
    const pricesChanged = items.some((item, index) => item.price_cents !== saved.items[index].price_cents);
    return {
        items,
        coupon: pricesChanged ? null : saved.coupon ?? null,
        priceVersion: COUNTER_PRICE_VERSION,
        priceUpdated: pricesChanged,
    };
}
