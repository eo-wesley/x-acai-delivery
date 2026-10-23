import counterPriceData from '../data/counter-prices.json';

interface CounterPrice {
    name: string;
    price_cents: number;
    size_prices_cents?: Record<string, number>;
    duo_flavor_prices_cents?: Record<string, number>;
}

const counterPrices = counterPriceData as { version: string; products: Record<string, CounterPrice> };
export const COUNTER_PRICE_VERSION = counterPrices.version;
export const normalizeCounterLabel = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');

export function getCounterPrice(productId: string): CounterPrice | undefined {
    return counterPrices.products[productId];
}

export function getCounterOptionPrice(productId: string, groupName: string, optionName: string): number | undefined {
    const price = getCounterPrice(productId);
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

export function applyCounterOptionGroups<T extends { name: string; options: { name: string; price_cents: number }[] }>(productId: string, groups: T[]): T[] {
    return groups.map(group => ({
        ...group,
        options: group.options.map(option => ({
            ...option,
            price_cents: getCounterOptionPrice(productId, group.name, option.name) ?? option.price_cents,
        })),
    }));
}
