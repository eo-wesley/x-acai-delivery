import assert from 'node:assert/strict';
import {
    allocateFixedCostPerOrderCents,
    breakEvenOrders,
    calculateContributionMetrics,
    priceForContributionCents,
    priceFromMarkupCents,
    purchaseUnitCostCents,
    roundCurrencyCents,
    selectWorstMix
} from '../src/domain/pricing/costing';

function closeTo(actual: number, expected: number, tolerance = 0.01): void {
    assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} não ficou próximo de ${expected}`);
}

const acaiCostPerGram = purchaseUnitCostCents({
    priceCents: 15_200,
    quantity: 9_000,
    unit: 'g'
});
closeTo(acaiCostPerGram, 1.6888888889);
assert.equal(roundCurrencyCents(acaiCostPerGram * 550), 929);

const currentPolicyPrice = priceForContributionCents(2_171, 0.05, 0.35);
assert.equal(roundCurrencyCents(currentPolicyPrice), 3_618);

const monteSeu700 = calculateContributionMetrics(3_890, 2_171, 0.05);
assert.equal(roundCurrencyCents(monteSeu700.feeCents), 195);
assert.equal(roundCurrencyCents(monteSeu700.contributionCents), 1_525);
closeTo(monteSeu700.cmvRate, 0.5581, 0.0001);
closeTo(monteSeu700.contributionRate, 0.3919, 0.0001);

const appLessonPrice = priceFromMarkupCents(885, 0.8, 0.19);
assert.equal(roundCurrencyCents(appLessonPrice), 1_967);

const worstMix = selectWorstMix([
    { id: 'granulado', costCents: 120 },
    { id: 'leite-em-po', costCents: 148 },
    { id: 'creme-premium', costCents: 168 },
    { id: 'banana', costCents: 80 }
], 3);
assert.deepEqual(worstMix.selected.map(item => item.id), ['creme-premium', 'leite-em-po', 'granulado']);
assert.equal(worstMix.totalCostCents, 436);

assert.equal(allocateFixedCostPerOrderCents(500_000, 1_000), 500);
assert.equal(breakEvenOrders(500_000, 1_525), 328);

console.log('Motor de custeio X-Açaí: 12 verificações aprovadas.');
