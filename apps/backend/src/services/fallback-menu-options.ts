import { approvedOptionPrice } from './approved-menu-prices';

type SelectedFallback = { groupId: string; groupName: string; optionId: string; optionName: string };
type CanonicalFallback = SelectedFallback & { price_cents: number };

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const slug = (value: string) => normalize(value).replace(/ /g, '-');

const groups: Record<string, { name: string; options: ReadonlyArray<readonly [string, number]> }> = {
    turbinando: { name: 'Turbinando o Açaí', options: [
        ['Creme De Amendoim', 600], ['Creme De Avelã', 700], ['Creme De Bueno', 600],
        ['Creme De Leitinho', 600], ['Creme De Morango', 600], ['Kit-Kat', 600], ['Nutella', 1000],
    ] },
    bebida: { name: 'Vai uma Bebida?', options: [
        ['Água Mineral Crystal Sem Gás 500ml', 600], ['Água Mineral Crystal com Gás 500ml', 700],
        ['Coca-Cola 350ml', 1000], ['Pepsi 350ml', 1000],
    ] },
    colher: { name: 'Colher', options: [['Sim', 0], ['Não', 0]] },
    massa: { name: 'Vai o quê?', options: [['Açaí', 0], ['Cupuaçu', 500]] },
    copos: { name: 'Escolha seus 2 Copos', options: [
        ['Açaí X-King Paçoca', 0], ['Açaí X-Splash', 0], ['Açaí X-Tradicional', 0], ['Açaí X-Paçoleite', 0],
    ] },
};

const complements = [
    'Amendoim Torrado Granulado', 'Aveia', 'Banana', 'Bis', 'Cereal Ball Chocolate',
    'Cereal Ball Mesclado', 'Cobertura De Caramelo', 'Cobertura De Chocolate', 'Cobertura De Morango',
    'Cobertura Fini Bananas', 'Cobertura Fini Beijos', 'Cobertura Fini Dentaduras', 'Confete',
    'Gotas De Chocolate', 'Granola', 'Granulado Brigadeiro', 'Granulado Colorido', 'Kiwi',
    'Leite Condensado', 'Leite Em Pó', 'Morango', 'Ovomaltine', 'Ouro Branco', 'Paçoca',
] as const;

const additionals: ReadonlyArray<readonly [string, number]> = [
    ...complements.map(name => [name, ['Gotas De Chocolate', 'Kiwi', 'Morango', 'Ovomaltine'].includes(name) ? 500 : 400] as const),
    ['Creme De Amendoim', 600], ['Creme De Avelã', 600], ['Creme De Bueno', 600], ['Creme De Bombom', 600],
    ['Creme De Leitinho', 600], ['Creme De Morango', 600], ['Kit-Kat', 600], ['Nutella', 1000],
];

function placementOptions(productName: string): ReadonlyArray<readonly [string, number]> {
    const name = normalize(productName);
    const placement = name.includes('marmitex') ? 'Dentro Da Marmitex'
        : name.includes('barca') ? 'Dentro Da Barca'
            : name.includes('roleta') ? 'Dentro Da Roleta' : 'Dentro Do Copo';
    return [[placement, 0], ['Itens Separados', 500]];
}

export function resolveFallbackOption(product: { id: string; name: string }, selected: SelectedFallback): CanonicalFallback | null {
    const prefix = `fallback-${product.id}-`;
    if (!selected.groupId.startsWith(prefix) || !selected.optionId.startsWith(selected.groupId)) return null;
    const key = selected.groupId.slice(prefix.length);

    let groupName: string;
    let options: ReadonlyArray<readonly [string, number]>;
    if (key === 'tamanho') {
        groupName = 'Tamanho do Copo';
        options = [['Copo de 300ml', 0], ['Copo de 400ml', 0], ['Copo de 500ml', 0], ['Copo de 700ml', 0]];
    } else if (key === 'complementos') {
        groupName = 'Complementos';
        options = complements.map(name => [name, 0] as const);
    } else if (key === 'adicionais') {
        groupName = 'Adicionais pagos';
        options = additionals;
    } else if (key === 'onde-vai') {
        groupName = 'Onde vai?';
        options = placementOptions(product.name);
    } else {
        const group = groups[key];
        if (!group) return null;
        groupName = group.name;
        options = group.options;
    }

    const index = options.findIndex(([name]) => normalize(name) === normalize(selected.optionName));
    if (index < 0) return null;
    const [optionName, storedPrice] = options[index];
    if (selected.optionId !== `${selected.groupId}-${index}` && selected.optionId !== `${selected.groupId}-${slug(optionName)}`) return null;

    return {
        groupId: selected.groupId,
        groupName,
        optionId: selected.optionId,
        optionName,
        price_cents: approvedOptionPrice(product.name, groupName, optionName, storedPrice),
    };
}
