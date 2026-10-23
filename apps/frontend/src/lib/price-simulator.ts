import { buildMenuPrices, type MenuPriceStatus } from './menu-prices';

type Snapshot = Omit<Parameters<typeof buildMenuPrices>[0], 'products'> & {
    products: Array<Parameters<typeof buildMenuPrices>[0]['products'][number] & {
        cost: number | null; costQuality: string; released: boolean;
        state: { code: string; label: string; action: string; lot: number };
    }>;
};

export type SimulatorProduct = {
    sku: string; name: string; family: string; size: string;
    directCost: number | null; costQuality: string; costStatus: 'ready' | 'provisional' | 'missing';
    referencePrice: number | null; priceStatus: MenuPriceStatus;
    priceSource: string; released: boolean; state: Snapshot['products'][number]['state'];
};

export function buildSimulatorProducts(snapshot: Snapshot): SimulatorProduct[] {
    const prices = new Map(buildMenuPrices(snapshot).map(row => [row.id, row]));
    return snapshot.products.map(product => {
        const price = prices.get(product.sku)!;
        const hasCost = product.cost !== null && Number.isFinite(product.cost) && product.cost > 0;
        const confirmed = /confirmado|recalculado|comprovado/i.test(product.costQuality)
            && !/provisório|estimado|sem custo|teórico/i.test(product.costQuality);
        return {
            sku: product.sku, name: product.product, family: product.family, size: product.size || 'Unidade',
            directCost: hasCost ? product.cost : null, costQuality: product.costQuality,
            costStatus: !hasCost ? 'missing' : confirmed ? 'ready' : 'provisional',
            referencePrice: price.price, priceStatus: price.status,
            priceSource: price.status === 'approved' ? 'Decisão aprovada na base de preços'
                : price.status === 'proposed' ? 'Recomendação pendente de aprovação' : 'Preço antigo do snapshot',
            released: product.released, state: product.state,
        };
    });
}

export function selectSimulatorProducts(products: SimulatorProduct[], family: string, sku: string) {
    const visible = family ? products.filter(product => product.family === family) : products;
    return { visible, selected: visible.find(product => product.sku === sku) ?? visible[0] ?? null };
}

export type SimulatorParameters = { fixedCost: number; markupPercent: number; taxPercent: number; feePercent: number };

// Integer cents prevent a commercial ending of .90 from undercutting the minimum.
export function roundPriceUpTo90(minimum: number): number {
    if (!Number.isFinite(minimum) || minimum < 0) throw new RangeError('Preço mínimo inválido');
    const cents = Math.ceil(minimum * 100);
    if (!Number.isSafeInteger(cents)) throw new RangeError('Preço fora do limite de cálculo');
    return (Math.ceil((cents - 90) / 100) * 100 + 90) / 100;
}

export function simulatePrice(cost: number | null, params: SimulatorParameters) {
    if (cost === null || !Number.isFinite(cost) || cost <= 0) return { ok: false as const, error: 'Custo confiável pendente.' };
    if (Object.values(params).some(value => !Number.isFinite(value) || value < 0)) {
        return { ok: false as const, error: 'Informe parâmetros válidos, maiores ou iguais a zero.' };
    }
    const deductions = (params.taxPercent + params.feePercent) / 100;
    if (deductions >= 1) return { ok: false as const, error: 'Imposto e taxa somados devem ser menores que 100%.' };
    const minimumPrice = (cost + params.fixedCost) * (1 + params.markupPercent / 100) / (1 - deductions);
    if (!Number.isFinite(minimumPrice) || minimumPrice > 1e9) return { ok: false as const, error: 'Preço fora do limite de cálculo.' };
    const suggestedPrice = roundPriceUpTo90(minimumPrice);
    const tax = suggestedPrice * params.taxPercent / 100;
    const fee = suggestedPrice * params.feePercent / 100;
    const contribution = suggestedPrice - tax - fee - cost;
    const result = contribution - params.fixedCost;
    return { ok: true as const, minimumPrice, suggestedPrice, tax, fee, contribution, result,
        resultPercent: result / suggestedPrice * 100, cmvPercent: cost / suggestedPrice * 100 };
}
