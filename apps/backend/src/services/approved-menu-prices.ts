type ApprovedFamily = {
    base: number;
    sizes: Record<string, number>;
};

const normalize = (value: string) => value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const approvedFamilies: Record<string, ApprovedFamily> = {
    'acai x pacokita': { base: 1290, sizes: { '300': 1290, '400': 1590, '500': 1990, '700': 2690 } },
    'acai x chocola': { base: 1490, sizes: { '300': 1490, '400': 1890, '500': 2290, '700': 3090 } },
    'acai x tropical': { base: 1690, sizes: { '300': 1690, '400': 2090, '500': 2490, '700': 3390 } },
    'acai x creme': { base: 1790, sizes: { '300': 1790, '400': 2190, '500': 2690, '700': 3590 } },
    'acai x tella': { base: 1790, sizes: { '300': 1790, '400': 2190, '500': 2690, '700': 3690 } },
    'acai x king tella': { base: 1790, sizes: { '300': 1790, '400': 2190, '500': 2690, '700': 3690 } },
};

const approvedSingles: Array<{ pattern: RegExp; price: number }> = [
    { pattern: /acai (?:de )?700ml.*4 complementos/, price: 3890 },
    { pattern: /acai (?:700ml escolha 2|escolha 2 opcoes de 700ml)/, price: 4990 },
    { pattern: /acai (?:500ml escolha 2|escolha 2 opcoes de 500ml)/, price: 3690 },
    { pattern: /acai (?:400ml escolha 2|escolha 2 opcoes de 400ml)/, price: 2990 },
    { pattern: /acai (?:300ml escolha 2|escolha 2 opcoes de 300ml)/, price: 2390 },
];

export function approvedBasePrice(name: string): number | null {
    const key = normalize(name);
    const family = approvedFamilies[key];
    if (family) return family.base;
    return approvedSingles.find(entry => entry.pattern.test(key))?.price ?? null;
}

export function approvedSizePrice(productName: string, optionName: string): number | null {
    const family = approvedFamilies[normalize(productName)];
    if (!family) return null;
    const size = normalize(optionName).match(/\b(300|400|500|700)\s*ml\b/)?.[1];
    return size ? family.sizes[size] ?? null : null;
}

export function approvedOptionPrice(productName: string, groupName: string, optionName: string, storedPrice: number): number {
    if (!/tamanho/i.test(groupName)) return storedPrice;
    const base = approvedBasePrice(productName);
    const selected = approvedSizePrice(productName, optionName);
    return base !== null && selected !== null ? selected - base : storedPrice;
}

export function applyApprovedBasePrice<T extends { name: string; price_cents: number }>(item: T): T {
    const approved = approvedBasePrice(item.name);
    return approved === null ? item : { ...item, price_cents: approved };
}
