// Conferido no vídeo do cardápio de 24/09/2026 e no cadastro iFood importado.
// O acréscimo de 700 ml do X-King Paçoca é diferente dos demais sabores.
const promotionCups: Record<string, number> = {
    'acai x-king pacoca': 1600,
    'acai x-splash': 1500,
    'acai x-tradicional': 1500,
    'acai x-pacoleite': 1500,
    'acai x-pacokita': 1500,
    'acai x-chocola': 1500,
    'acai x-tropical': 1500,
    'acai x-creme': 1500,
    'acai x-tella': 1500,
    'acai x-king tella': 1500,
};

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export function buildPromotionOptionGroups(product: { id: string; name: string; category?: string }) {
    if (!normalize(product.category || '').includes('promocao')) return [];
    const largeCupExtra = promotionCups[normalize(product.name)];
    if (largeCupExtra === undefined) return [];

    const group = (key: string, name: string, required: number, min: number, max: number, order: number, values: readonly (readonly [string, number])[]) => {
        const groupId = `fallback-${product.id}-${key}`;
        return {
            id: groupId, name, required, min_select: min, max_select: max, sort_order: order,
            options: values.map(([optionName, price], index) => ({
                id: `${groupId}-${index}`, name: optionName, price_cents: price, sort_order: index, available: 1,
            })),
        };
    };

    return [
        group('tamanho', 'Tamanho do Copo', 1, 1, 1, 0, [
            ['Copo de 300ml', 0], ['Copo de 400ml', 400],
            ['Copo de 500ml', 800], ['Copo de 700ml', largeCupExtra],
        ]),
        group('turbinando', 'Turbinando o Açaí', 0, 0, 5, 1, [
            ['Creme De Amendoim', 600], ['Creme De Avelã', 700],
            ['Creme De Bueno', 600], ['Creme De Leitinho', 600],
            ['Creme De Morango', 600], ['Kit-Kat', 600], ['Nutella', 1000],
        ]),
        group('bebida', 'Vai uma Bebida?', 0, 0, 20, 2, [
            ['Água Mineral Crystal Sem Gás 500ml', 600],
            ['Água Mineral Crystal com Gás 500ml', 700],
            ['Coca-Cola 350ml', 1000], ['Pepsi 350ml', 1000],
        ]),
        group('colher', 'Colher', 1, 1, 1, 3, [['Sim', 0], ['Não', 0]]),
    ];
}
