export type BaseUnit = 'g' | 'ml' | 'un';
export type SupportedUnit = BaseUnit | 'kg' | 'l';

const UNIT_TO_BASE: Record<SupportedUnit, { baseUnit: BaseUnit; multiplier: number }> = {
    g: { baseUnit: 'g', multiplier: 1 },
    kg: { baseUnit: 'g', multiplier: 1000 },
    ml: { baseUnit: 'ml', multiplier: 1 },
    l: { baseUnit: 'ml', multiplier: 1000 },
    un: { baseUnit: 'un', multiplier: 1 }
};

export interface PurchaseCostInput {
    priceCents: number;
    quantity: number;
    unit: SupportedUnit;
    /** Percentual aproveitável da compra. Ex.: 97 significa 3% de perda. */
    yieldPercent?: number;
}

export interface RecipeCostLine {
    id: string;
    quantity: number;
    unit: SupportedUnit;
    baseUnit: BaseUnit;
    unitCostCents: number;
}

export interface MixOption {
    id: string;
    costCents: number;
}

export interface ContributionMetrics {
    priceCents: number;
    directCostCents: number;
    feeCents: number;
    contributionCents: number;
    cmvRate: number;
    contributionRate: number;
}

function assertFiniteNonNegative(value: number, label: string): void {
    if (!Number.isFinite(value) || value < 0) {
        throw new Error(`${label} deve ser um número finito maior ou igual a zero.`);
    }
}

function assertRate(rate: number, label: string): void {
    if (!Number.isFinite(rate) || rate < 0 || rate >= 1) {
        throw new Error(`${label} deve estar entre 0 e 1.`);
    }
}

export function toBaseQuantity(quantity: number, unit: SupportedUnit): {
    quantity: number;
    baseUnit: BaseUnit;
} {
    assertFiniteNonNegative(quantity, 'Quantidade');
    const definition = UNIT_TO_BASE[unit];
    return {
        quantity: quantity * definition.multiplier,
        baseUnit: definition.baseUnit
    };
}

/** Retorna centavos por grama, mililitro ou unidade aproveitável. */
export function purchaseUnitCostCents(input: PurchaseCostInput): number {
    assertFiniteNonNegative(input.priceCents, 'Preço da compra');
    const converted = toBaseQuantity(input.quantity, input.unit);
    const yieldPercent = input.yieldPercent ?? 100;

    if (!Number.isFinite(yieldPercent) || yieldPercent <= 0 || yieldPercent > 100) {
        throw new Error('Rendimento deve ser maior que zero e menor ou igual a 100%.');
    }

    const usableQuantity = converted.quantity * (yieldPercent / 100);
    if (usableQuantity <= 0) {
        throw new Error('A quantidade aproveitável da compra deve ser maior que zero.');
    }

    return input.priceCents / usableQuantity;
}

export function recipeLineCostCents(line: RecipeCostLine): number {
    assertFiniteNonNegative(line.unitCostCents, 'Custo unitário');
    const converted = toBaseQuantity(line.quantity, line.unit);
    if (converted.baseUnit !== line.baseUnit) {
        throw new Error(`Unidade incompatível na linha ${line.id}: ${line.unit} não converte para ${line.baseUnit}.`);
    }
    return converted.quantity * line.unitCostCents;
}

export function recipeDirectCostCents(lines: RecipeCostLine[]): number {
    return lines.reduce((total, line) => total + recipeLineCostCents(line), 0);
}

/** Seleciona a combinação permitida mais cara e preserva a evidência das escolhas. */
export function selectWorstMix(options: MixOption[], allowedChoices: number): {
    selected: MixOption[];
    totalCostCents: number;
} {
    if (!Number.isInteger(allowedChoices) || allowedChoices < 0) {
        throw new Error('Quantidade de escolhas permitidas deve ser um inteiro maior ou igual a zero.');
    }
    if (allowedChoices > options.length) {
        throw new Error('Quantidade de escolhas permitidas excede as opções disponíveis.');
    }
    options.forEach(option => assertFiniteNonNegative(option.costCents, `Custo da opção ${option.id}`));

    const selected = [...options]
        .sort((left, right) => right.costCents - left.costCents || left.id.localeCompare(right.id))
        .slice(0, allowedChoices);

    return {
        selected,
        totalCostCents: selected.reduce((total, option) => total + option.costCents, 0)
    };
}

/** Política X-Açaí: preço que reserva taxa e margem de contribuição como percentuais da venda. */
export function priceForContributionCents(
    directCostCents: number,
    feeRate: number,
    targetContributionRate: number
): number {
    assertFiniteNonNegative(directCostCents, 'Custo direto');
    assertRate(feeRate, 'Taxa');
    assertRate(targetContributionRate, 'Margem de contribuição');
    const denominator = 1 - feeRate - targetContributionRate;
    if (denominator <= 0) {
        throw new Error('A soma da taxa e da margem de contribuição deve ser menor que 100%.');
    }
    return directCostCents / denominator;
}

/** Fórmula observada no aplicativo da aula: custo total com markup, depois taxas. */
export function priceFromMarkupCents(totalCostCents: number, markupRate: number, feeRate: number): number {
    assertFiniteNonNegative(totalCostCents, 'Custo total');
    assertFiniteNonNegative(markupRate, 'Markup');
    assertRate(feeRate, 'Taxa');
    return totalCostCents * (1 + markupRate) / (1 - feeRate);
}

export function calculateContributionMetrics(
    priceCents: number,
    directCostCents: number,
    feeRate: number
): ContributionMetrics {
    if (!Number.isFinite(priceCents) || priceCents <= 0) {
        throw new Error('Preço de venda deve ser maior que zero.');
    }
    assertFiniteNonNegative(directCostCents, 'Custo direto');
    assertRate(feeRate, 'Taxa');

    const feeCents = priceCents * feeRate;
    const contributionCents = priceCents - feeCents - directCostCents;
    return {
        priceCents,
        directCostCents,
        feeCents,
        contributionCents,
        cmvRate: directCostCents / priceCents,
        contributionRate: contributionCents / priceCents
    };
}

export function allocateFixedCostPerOrderCents(monthlyFixedCostCents: number, monthlyOrders: number): number {
    assertFiniteNonNegative(monthlyFixedCostCents, 'Custo fixo mensal');
    if (!Number.isFinite(monthlyOrders) || monthlyOrders <= 0) {
        throw new Error('Pedidos mensais deve ser maior que zero.');
    }
    return monthlyFixedCostCents / monthlyOrders;
}

export function breakEvenOrders(monthlyFixedCostCents: number, averageContributionCents: number): number {
    assertFiniteNonNegative(monthlyFixedCostCents, 'Custo fixo mensal');
    if (!Number.isFinite(averageContributionCents) || averageContributionCents <= 0) {
        throw new Error('Contribuição média deve ser maior que zero.');
    }
    return Math.ceil(monthlyFixedCostCents / averageContributionCents);
}

export function roundCurrencyCents(value: number): number {
    if (!Number.isFinite(value)) throw new Error('Valor monetário inválido.');
    return Math.round(value);
}
