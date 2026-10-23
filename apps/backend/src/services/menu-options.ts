import { applyCounterOptionGroups, getCounterPrice, normalizeCounterLabel } from './counter-prices';

export interface MenuOption {
    id: string; name: string; price_cents: number; sort_order: number; available: number | boolean;
}
export interface MenuOptionGroup {
    id: string; name: string; required: number | boolean; min_select: number; max_select: number; sort_order: number; options: MenuOption[];
}
export interface OptionProduct { id: string; name: string; category?: string | null; option_groups?: MenuOptionGroup[] }
export interface SelectedMenuOption {
    groupId: string; groupName: string; optionId: string; optionName: string; price_cents: number;
}

// Versioned fallback mirrors the verified frontend. The parity regression test
// detects any drift in IDs, prices, required choices and repetition limits.
const complements = [
    'Amendoim Torrado Granulado', 'Aveia', 'Banana', 'Bis', 'Cereal Ball Chocolate', 'Cereal Ball Mesclado',
    'Cobertura De Caramelo', 'Cobertura De Chocolate', 'Cobertura De Morango', 'Cobertura Fini Bananas',
    'Cobertura Fini Beijos', 'Cobertura Fini Dentaduras', 'Confete', 'Gotas De Chocolate', 'Granola',
    'Granulado Brigadeiro', 'Granulado Colorido', 'Kiwi', 'Leite Condensado', 'Leite Em Pó', 'Morango',
    'Ovomaltine', 'Ouro Branco', 'Paçoca',
];
type OptionValues = readonly (readonly [string, number])[];
const additional: OptionValues = [
    ...complements.slice(0, 13).map(name => [name, 400] as const),
    ...['Creme De Amendoim', 'Creme De Avelã', 'Creme De Bueno', 'Creme De Bombom', 'Creme De Leitinho', 'Creme De Morango'].map(name => [name, 600] as const),
    ['Gotas De Chocolate', 500], ['Granola', 400], ['Granulado Brigadeiro', 400], ['Granulado Colorido', 400],
    ['Kit-Kat', 600], ['Kiwi', 500], ['Leite Condensado', 400], ['Leite Em Pó', 400], ['Morango', 500],
    ['Nutella', 1000], ['Ovomaltine', 500], ['Ouro Branco', 400], ['Paçoca', 400],
];
const beverages: OptionValues = [
    ['Água Mineral Crystal com Gás 500ml', 700], ['Água Mineral Crystal Sem Gás 500ml', 600],
    ['Coca-Cola 350ml', 1000], ['Pepsi 350ml', 1000],
];
const label = (value: string) => normalizeCounterLabel(value).replace(/[^a-z0-9]/g, '');
const fallbackId = (scope: string, value: string) => `fallback-${scope}-${normalizeCounterLabel(value).replace(/[^a-z0-9]+/g, '-')}`;
const isMonte = (product: OptionProduct) => label(product.category || '').includes('monte') || /\d+\s*complementos/i.test(product.name);

export function buildFallbackOptionGroups(product: OptionProduct): MenuOptionGroup[] {
    // A different store/product is never granted X-Açaí options by its name alone.
    if (!getCounterPrice(product.id)) return [];
    const scope = product.id;
    const category = normalizeCounterLabel(product.category || '');
    const name = normalizeCounterLabel(product.name);
    const group = (key: string, title: string, required: number, min: number, max: number, order: number, values: OptionValues, optionScope = key, indexed = false): MenuOptionGroup => {
        const id = fallbackId(scope, key);
        return {
            id, name: title, required, min_select: min, max_select: max, sort_order: order,
            options: values.map(([optionName, price], index) => ({
                id: indexed ? `${id}-${index}` : fallbackId(`${scope}-${optionScope}`, optionName),
                name: optionName, price_cents: price, sort_order: index, available: 1,
            })),
        };
    };
    let groups: MenuOptionGroup[] = [];
    if (category.includes('promocao') && getCounterPrice(product.id)?.size_prices_cents) {
        groups = [
            group('tamanho', 'Tamanho do Copo', 1, 1, 1, 0, [
                ['Copo de 300ml', 0], ['Copo de 400ml', 400], ['Copo de 500ml', 800], ['Copo de 700ml', name === 'acai x-king pacoca' ? 1600 : 1500],
            ], 'tamanho', true),
            group('turbinando', 'Turbinando o Açaí', 0, 0, 5, 1, [
                ['Creme De Amendoim', 600], ['Creme De Avelã', 700], ['Creme De Bueno', 600],
                ['Creme De Leitinho', 600], ['Creme De Morango', 600], ['Kit-Kat', 600], ['Nutella', 1000],
            ], 'turbinando', true),
            group('bebida', 'Vai uma Bebida?', 0, 0, 20, 2, [beverages[1], beverages[0], beverages[2], beverages[3]], 'bebida', true),
            group('colher', 'Colher', 1, 1, 1, 3, [['Sim', 0], ['Não', 0]], 'colher', true),
        ];
    } else if (isMonte(product)) {
        const freeCount = Number(product.name.match(/(\d+)\s*complementos/i)?.[1] || 0);
        const placement = name.includes('marmitex') ? 'Dentro Da Marmitex' : name.includes('barca') ? 'Dentro Da Barca' : name.includes('roleta') ? 'Dentro Da Roleta' : 'Dentro Do Copo';
        groups = [
            group('massa', 'Vai o quê?', 1, 1, 1, 0, [['Açaí', 0], ['Cupuaçu', 500]]),
            group('onde-vai', 'Onde vai?', 1, 1, 1, 1, [[placement, 0], ['Itens Separados', 500]], 'onde'),
            group('complementos', `Complementos (escolha ${freeCount})`, 1, freeCount, freeCount, 2, complements.map(value => [value, 0])),
            group('adicionais', 'Adicionais pagos', 0, 0, 99, 3, additional),
            group('bebida', 'Vai uma Bebida?', 0, 0, 1, 10, beverages),
            group('colher', 'Colher', 1, 1, 1, /barca\s+m\b/.test(name) ? 4 : 20, [['Sim', 0], ['Não', 0]]),
        ];
    } else if (category.includes('combo') || name.includes('escolha 2')) {
        groups = [
            group('copos', 'Escolha seus 2 Copos', 1, 2, 2, 0, [
                ['Açaí X-King Paçoca', 0], ['Açaí X-Splash', 0], ['Açaí X-Tradicional', 0], ['Açaí X-Paçoleite', 0],
            ]),
            group('bebida', 'Vai uma Bebida?', 0, 0, 1, 10, beverages),
            group('colher', 'Colher', 1, 1, 1, 20, [['Sim', 0], ['Não', 0]]),
        ];
    }
    return applyCounterOptionGroups(product.id, groups);
}

export function resolveProductOptionGroups(product: OptionProduct): MenuOptionGroup[] {
    const groups = product.option_groups;
    if (!groups?.length) return buildFallbackOptionGroups(product);
    if (!getCounterPrice(product.id) || !isMonte(product)) return applyCounterOptionGroups(product.id, groups);
    const hasMass = groups.some(group => {
        const name = label(group.name);
        return name.includes('massa') || name.includes('base') || name === 'vaioque'
            || (group.options.some(option => label(option.name) === 'acai') && group.options.some(option => label(option.name) === 'cupuacu'));
    });
    const hasSpoon = groups.some(group => /colher|talher/.test(label(group.name)));
    if (hasMass && hasSpoon) return applyCounterOptionGroups(product.id, groups);
    const fallback = buildFallbackOptionGroups(product);
    const beverage = groups.find(group => label(group.name).includes('bebida'));
    const spoonOrder = /barca\s+m\b/i.test(product.name) && beverage
        ? (beverage.sort_order ?? 0) - 0.5 : Math.max(...groups.map(group => group.sort_order ?? 0)) + 1;
    return applyCounterOptionGroups(product.id, [
        ...(!hasMass ? [{ ...fallback[0], sort_order: Math.min(...groups.map(group => group.sort_order ?? 0)) - 1 }] : []),
        ...groups,
        ...(!hasSpoon ? [{ ...fallback[fallback.length - 1], sort_order: spoonOrder }] : []),
    ]);
}

export class MenuSelectionError extends Error {
    readonly statusCode = 422;
}

export function resolveSelectedOptions(groups: MenuOptionGroup[], selected: SelectedMenuOption[] = []): SelectedMenuOption[] {
    const counts = new Map<string, number>();
    const resolved = selected.map(selection => {
        const group = groups.find(candidate => candidate.id === selection.groupId);
        const option = group?.options.find(candidate => candidate.id === selection.optionId && (candidate.available === 1 || candidate.available === true));
        if (!group || !option) throw new MenuSelectionError('Uma opção não está mais disponível. Abra o produto e escolha novamente.');
        if (!Number.isSafeInteger(option.price_cents) || option.price_cents < 0) throw new MenuSelectionError('Preço da opção inválido no cadastro.');
        counts.set(group.id, (counts.get(group.id) || 0) + 1);
        // Prices and names supplied by the browser are deliberately discarded.
        return { groupId: group.id, groupName: group.name, optionId: option.id, optionName: option.name, price_cents: option.price_cents };
    });
    for (const group of groups) {
        const count = counts.get(group.id) || 0;
        const required = group.required === 1 || group.required === true;
        const min = Math.max(Number(group.min_select || 0), required ? 1 : 0);
        const max = Number(group.max_select || 0);
        // The UI permits repeated options in every multi-selection group.
        // 99 is its explicit unlimited marker, not a limit of 99 portions.
        if (count < min || (max > 0 && max !== 99 && count > max)) {
            throw new MenuSelectionError(`Revise as escolhas de ${group.name}.`);
        }
    }
    return resolved;
}

export async function loadProductOptionGroups(db: { all: (sql: string, params: unknown[]) => Promise<any[]> }, product: OptionProduct): Promise<MenuOptionGroup[]> {
    const groups = await db.all('SELECT * FROM option_groups WHERE menu_item_id = ? ORDER BY sort_order ASC', [product.id]);
    const enriched = await Promise.all(groups.map(async group => ({
        ...group,
        options: await db.all('SELECT * FROM option_items WHERE option_group_id = ? AND available = 1 ORDER BY sort_order ASC', [group.id]),
    })));
    return resolveProductOptionGroups({ ...product, option_groups: enriched });
}
