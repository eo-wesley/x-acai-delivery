import {
    BaseUnit,
    SupportedUnit,
    calculateContributionMetrics,
    priceForContributionCents,
    purchaseUnitCostCents,
    recipeDirectCostCents,
    roundCurrencyCents
} from './costing';

export interface CostingReportRow {
    menu_item_id: string;
    menu_name: string;
    price_cents: number;
    recipe_id: string | null;
    recipe_item_id: string | null;
    inventory_item_id: string | null;
    inventory_name: string | null;
    recipe_qty: number | null;
    recipe_unit: string | null;
    inventory_unit: string | null;
    inventory_cost_cents: number | null;
    purchase_price_cents: number | null;
    purchase_quantity: number | null;
    purchase_unit: string | null;
    yield_percent: number | null;
    cost_evidence_state: string | null;
}

export interface CostingProductReport {
    menuItemId: string;
    menuName: string;
    currentPriceCents: number;
    status: 'ready' | 'provisional' | 'incomplete';
    issues: string[];
    lineCount: number;
    directCostCents: number | null;
    cmvRate: number | null;
    contributionCents: number | null;
    contributionRate: number | null;
    suggestedMinimumPriceCents: number | null;
    costBasis: 'purchase-profile' | 'legacy-unit-cost' | 'mixed' | 'missing';
}

function isSupportedUnit(value: string | null): value is SupportedUnit {
    return value === 'g' || value === 'kg' || value === 'ml' || value === 'l' || value === 'un';
}

function baseUnitFor(unit: SupportedUnit): BaseUnit {
    if (unit === 'g' || unit === 'kg') return 'g';
    if (unit === 'ml' || unit === 'l') return 'ml';
    return 'un';
}

export function buildCostingReport(
    rows: CostingReportRow[],
    feeRate = 0.05,
    targetContributionRate = 0.35
): CostingProductReport[] {
    const grouped = new Map<string, CostingReportRow[]>();
    for (const row of rows) {
        const group = grouped.get(row.menu_item_id) ?? [];
        group.push(row);
        grouped.set(row.menu_item_id, group);
    }

    return [...grouped.values()].map((productRows): CostingProductReport => {
        const product = productRows[0];
        const issues: string[] = [];
        const costLines = [];
        let profileLineCount = 0;
        let legacyLineCount = 0;
        const recipeRows = productRows.filter(row => row.recipe_item_id !== null);

        if (!product.recipe_id) issues.push('Produto sem ficha técnica cadastrada.');
        if (product.recipe_id && recipeRows.length === 0) issues.push('Ficha técnica sem componentes.');

        for (const row of recipeRows) {
            const label = row.inventory_name || row.inventory_item_id || 'Insumo desconhecido';
            if (!isSupportedUnit(row.recipe_unit)) {
                issues.push(`${label}: unidade usada na ficha está ausente ou incompatível.`);
                continue;
            }
            if (row.recipe_qty === null || row.recipe_qty < 0) {
                issues.push(`${label}: quantidade da ficha inválida.`);
                continue;
            }

            let unitCostCents: number;
            try {
                const hasValidatedEvidence = row.cost_evidence_state === 'informed'
                    || row.cost_evidence_state === 'measured'
                    || row.cost_evidence_state === 'invoice';
                const hasCompleteProfile = row.purchase_price_cents !== null
                    && row.purchase_price_cents > 0
                    && row.purchase_quantity !== null
                    && row.purchase_quantity > 0
                    && isSupportedUnit(row.purchase_unit)
                    && row.yield_percent !== null
                    && row.yield_percent > 0
                    && row.yield_percent <= 100
                    && hasValidatedEvidence;

                let baseUnit: BaseUnit;
                if (hasCompleteProfile && isSupportedUnit(row.purchase_unit)) {
                    baseUnit = baseUnitFor(row.purchase_unit);
                    unitCostCents = purchaseUnitCostCents({
                        priceCents: row.purchase_price_cents as number,
                        quantity: row.purchase_quantity as number,
                        unit: row.purchase_unit,
                        yieldPercent: row.yield_percent as number
                    });
                    profileLineCount += 1;
                } else if (isSupportedUnit(row.inventory_unit)
                    && row.inventory_cost_cents !== null
                    && row.inventory_cost_cents > 0) {
                    // Compatibilidade provisória: custo por 1 unidade declarada no cadastro legado.
                    baseUnit = baseUnitFor(row.inventory_unit);
                    unitCostCents = purchaseUnitCostCents({
                        priceCents: row.inventory_cost_cents,
                        quantity: 1,
                        unit: row.inventory_unit
                    });
                    legacyLineCount += 1;
                    issues.push(`${label}: usando custo legado; informe preço, conteúdo e rendimento da compra.`);
                } else {
                    issues.push(`${label}: perfil de compra e custo legado ausentes.`);
                    continue;
                }

                if (baseUnitFor(row.recipe_unit) !== baseUnit) {
                    issues.push(`${label}: ${row.recipe_unit} da ficha não é compatível com ${baseUnit} do perfil de compra.`);
                    continue;
                }

                costLines.push({
                    id: row.recipe_item_id || label,
                    quantity: row.recipe_qty,
                    unit: row.recipe_unit,
                    baseUnit,
                    unitCostCents
                });
            } catch (error) {
                issues.push(`${label}: ${error instanceof Error ? error.message : 'falha no cálculo'}`);
            }
        }

        if (costLines.length !== recipeRows.length || costLines.length === 0) {
            return {
                menuItemId: product.menu_item_id,
                menuName: product.menu_name,
                currentPriceCents: product.price_cents,
                status: 'incomplete',
                issues,
                lineCount: recipeRows.length,
                directCostCents: null,
                cmvRate: null,
                contributionCents: null,
                contributionRate: null,
                suggestedMinimumPriceCents: null,
                costBasis: recipeRows.length ? 'legacy-unit-cost' : 'missing'
            };
        }

        const directCostCents = recipeDirectCostCents(costLines);
        const suggestedMinimum = priceForContributionCents(directCostCents, feeRate, targetContributionRate);
        const usesOnlyProfiles = profileLineCount === recipeRows.length;
        const costBasis: CostingProductReport['costBasis'] = usesOnlyProfiles
            ? 'purchase-profile'
            : profileLineCount > 0 && legacyLineCount > 0
                ? 'mixed'
                : 'legacy-unit-cost';

        if (!Number.isFinite(product.price_cents) || product.price_cents <= 0) {
            issues.push('Preço atual ausente ou igual a zero.');
            return {
                menuItemId: product.menu_item_id,
                menuName: product.menu_name,
                currentPriceCents: product.price_cents,
                status: 'incomplete',
                issues,
                lineCount: recipeRows.length,
                directCostCents: roundCurrencyCents(directCostCents),
                cmvRate: null,
                contributionCents: null,
                contributionRate: null,
                suggestedMinimumPriceCents: roundCurrencyCents(suggestedMinimum),
                costBasis
            };
        }

        const metrics = calculateContributionMetrics(product.price_cents, directCostCents, feeRate);

        return {
            menuItemId: product.menu_item_id,
            menuName: product.menu_name,
            currentPriceCents: product.price_cents,
            status: usesOnlyProfiles ? 'ready' : 'provisional',
            issues,
            lineCount: recipeRows.length,
            directCostCents: roundCurrencyCents(directCostCents),
            cmvRate: metrics.cmvRate,
            contributionCents: roundCurrencyCents(metrics.contributionCents),
            contributionRate: metrics.contributionRate,
            suggestedMinimumPriceCents: roundCurrencyCents(suggestedMinimum),
            costBasis
        };
    }).sort((left, right) => left.menuName.localeCompare(right.menuName, 'pt-BR'));
}
