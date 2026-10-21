export type MenuPriceStatus = 'approved' | 'proposed' | 'legacy';
export type MenuPriceRow = {
    id: string; name: string; size: string; category: string;
    legacyPrice: number | null; approvedPrice: number | null;
    proposedPrice: number | null; price: number | null; status: MenuPriceStatus;
};
type Decision = { price?: number; proposedPrice?: number; status: string };
type PriceSnapshot = {
    products: { sku: string; product: string; size: string | null; family: string; appPrice: number | null }[];
    portions: { id: string; complement: string; addonPrice: number | null }[];
    fixedCupPricing: { batches: Record<string, { items: { product: string; sizeMl: number; recommendedPrice: number; status: string }[] }> };
    pricingScope: { approvedPrices: Record<string, Decision>; proposedPrices: Record<string, Decision | string> };
};

export const priceStatusLabels = { approved: 'Aprovado', proposed: 'Recomendado', legacy: 'Antigo · revisar' };
export const priceMoney = (value: number | null) => value === null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export function buildMenuPrices(snapshot: PriceSnapshot): MenuPriceRow[] {
    const fixed = Object.values(snapshot.fixedCupPricing.batches).flatMap(batch => batch.items);
    const rows: MenuPriceRow[] = snapshot.products.map(product => {
        const size = Number(product.size?.match(/\d+/)?.[0]);
        const fixedItem = fixed.find(item => item.product === product.product && item.sizeMl === size);
        const decisionKey = product.sku === 'MONTE-700' ? 'M700' : product.sku.startsWith('COMBO-') ? `DUO${size}` : '';
        const decision = snapshot.pricingScope.approvedPrices[decisionKey];
        const approvedPrice = fixedItem && /aprovad/i.test(fixedItem.status) ? fixedItem.recommendedPrice : decision && /aprovad/i.test(decision.status) ? decision.price ?? null : null;
        const recommendation = product.sku === 'MARMITEX-700' ? snapshot.pricingScope.proposedPrices.MX700 : null;
        const proposedPrice = recommendation && typeof recommendation === 'object' ? recommendation.proposedPrice ?? null : null;
        return {
            id: product.sku, name: product.sku.startsWith('COMBO-') ? 'Dupla X-Açaí · 2 copos' : product.sku.startsWith('MONTE-') ? `Monte Seu · ${size === 700 ? 4 : 3} complementos` : product.product,
            size: product.size || 'Unidade', category: product.family,
            legacyPrice: product.appPrice, approvedPrice, proposedPrice,
            price: approvedPrice ?? proposedPrice ?? product.appPrice,
            status: approvedPrice !== null ? 'approved' : proposedPrice !== null ? 'proposed' : 'legacy'
        };
    });
    return rows.concat(snapshot.portions.map(portion => ({
        id: `ADICIONAL-${portion.id}`, name: portion.complement, size: 'Porção extra', category: 'Adicionais',
        legacyPrice: portion.addonPrice, approvedPrice: null, proposedPrice: null,
        price: portion.addonPrice, status: 'legacy' as const
    })));
}

export function parseMenuPrice(value: string): number | null {
    if (!/^\d+(?:[.,]\d{1,2})?$/.test(value.trim())) return null;
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) && parsed > 0 && parsed <= 9999 ? Math.round(parsed * 100) / 100 : null;
}

export function menuPricesCsv(rows: MenuPriceRow[], drafts: Record<string, string> = {}): string {
    const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const decimal = (value: number | null) => value === null ? '' : value.toFixed(2).replace('.', ',');
    return '\uFEFF' + [
        ['Código', 'Categoria', 'Produto', 'Tamanho', 'Preço antigo de referência', 'Preço aprovado', 'Preço recomendado', 'Preço em revisão', 'Estado'],
        ...rows.map(row => {
            const draft = Object.hasOwn(drafts, row.id);
            return [row.id, row.category, row.name, row.size, decimal(row.legacyPrice), decimal(row.approvedPrice), decimal(row.proposedPrice), decimal(draft ? parseMenuPrice(drafts[row.id]) : row.price), draft ? 'Rascunho editado' : priceStatusLabels[row.status]];
        })
    ].map(line => line.map(escape).join(';')).join('\r\n');
}
