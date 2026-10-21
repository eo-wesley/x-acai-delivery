import assert from 'node:assert/strict';
import { buildCostingReport, CostingReportRow } from '../src/domain/pricing/costing-report';

const rows: CostingReportRow[] = [
    {
        menu_item_id: 'm700', menu_name: 'Monte Seu 700', price_cents: 3890,
        recipe_id: 'r1', recipe_item_id: 'ri1', inventory_item_id: 'acai', inventory_name: 'Açaí',
        recipe_qty: 550, recipe_unit: 'g', inventory_unit: 'kg', inventory_cost_cents: 1689,
        purchase_price_cents: 15200, purchase_quantity: 9000, purchase_unit: 'g', yield_percent: 100,
        cost_evidence_state: 'measured'
    },
    {
        menu_item_id: 'm700', menu_name: 'Monte Seu 700', price_cents: 3890,
        recipe_id: 'r1', recipe_item_id: 'ri2', inventory_item_id: 'kit', inventory_name: 'Kit embalagem',
        recipe_qty: 1, recipe_unit: 'un', inventory_unit: 'un', inventory_cost_cents: 126,
        purchase_price_cents: 126, purchase_quantity: 1, purchase_unit: 'un', yield_percent: 100,
        cost_evidence_state: 'informed'
    },
    {
        menu_item_id: 'legado', menu_name: 'Produto legado', price_cents: 1000,
        recipe_id: 'r2', recipe_item_id: 'ri3', inventory_item_id: 'insumo-legado', inventory_name: 'Insumo legado',
        recipe_qty: 100, recipe_unit: 'g', inventory_unit: 'kg', inventory_cost_cents: 2000,
        purchase_price_cents: 2000, purchase_quantity: 1, purchase_unit: 'kg', yield_percent: 100,
        cost_evidence_state: 'unvalidated'
    },
    {
        menu_item_id: 'preco-zero', menu_name: 'Produto sem preço', price_cents: 0,
        recipe_id: 'r3', recipe_item_id: 'ri4', inventory_item_id: 'embalagem', inventory_name: 'Embalagem',
        recipe_qty: 1, recipe_unit: 'un', inventory_unit: 'un', inventory_cost_cents: 100,
        purchase_price_cents: 100, purchase_quantity: 1, purchase_unit: 'un', yield_percent: 100,
        cost_evidence_state: 'invoice'
    },
    {
        menu_item_id: 'unidade-incompativel', menu_name: 'Produto com unidade incompatível', price_cents: 1000,
        recipe_id: 'r4', recipe_item_id: 'ri5', inventory_item_id: 'solido', inventory_name: 'Insumo sólido',
        recipe_qty: 10, recipe_unit: 'ml', inventory_unit: 'g', inventory_cost_cents: 100,
        purchase_price_cents: 100, purchase_quantity: 100, purchase_unit: 'g', yield_percent: 100,
        cost_evidence_state: 'measured'
    },
    {
        menu_item_id: 'sem-ficha', menu_name: 'Produto sem ficha', price_cents: 1000,
        recipe_id: null, recipe_item_id: null, inventory_item_id: null, inventory_name: null,
        recipe_qty: null, recipe_unit: null, inventory_unit: null, inventory_cost_cents: null,
        purchase_price_cents: null, purchase_quantity: null, purchase_unit: null, yield_percent: null,
        cost_evidence_state: null
    },
    {
        menu_item_id: 'custo-zero', menu_name: 'Produto com custo zerado', price_cents: 1000,
        recipe_id: 'r5', recipe_item_id: 'ri6', inventory_item_id: 'zerado', inventory_name: 'Insumo zerado',
        recipe_qty: 10, recipe_unit: 'g', inventory_unit: 'g', inventory_cost_cents: 0,
        purchase_price_cents: null, purchase_quantity: null, purchase_unit: null, yield_percent: null,
        cost_evidence_state: 'unvalidated'
    }
];

const report = buildCostingReport(rows);
assert.equal(report.length, 6);

const monteSeu = report.find(item => item.menuItemId === 'm700');
assert.ok(monteSeu);
assert.equal(monteSeu.status, 'ready');
assert.equal(monteSeu.directCostCents, 1055);
assert.equal(monteSeu.suggestedMinimumPriceCents, 1758);
assert.equal(monteSeu.costBasis, 'purchase-profile');

const legacy = report.find(item => item.menuItemId === 'legado');
assert.ok(legacy);
assert.equal(legacy.status, 'provisional');
assert.equal(legacy.costBasis, 'legacy-unit-cost');
assert.match(legacy.issues[0], /custo legado/i);

const zeroPrice = report.find(item => item.menuItemId === 'preco-zero');
assert.ok(zeroPrice);
assert.equal(zeroPrice.status, 'incomplete');
assert.equal(zeroPrice.directCostCents, 100);
assert.equal(zeroPrice.suggestedMinimumPriceCents, 167);
assert.match(zeroPrice.issues[0], /preço atual/i);

const incompatible = report.find(item => item.menuItemId === 'unidade-incompativel');
assert.ok(incompatible);
assert.equal(incompatible.status, 'incomplete');
assert.match(incompatible.issues[0], /não é compatível/i);

const incomplete = report.find(item => item.menuItemId === 'sem-ficha');
assert.ok(incomplete);
assert.equal(incomplete.status, 'incomplete');
assert.match(incomplete.issues[0], /sem ficha técnica/i);

const zeroCost = report.find(item => item.menuItemId === 'custo-zero');
assert.ok(zeroCost);
assert.equal(zeroCost.status, 'incomplete');
assert.match(zeroCost.issues[0], /ausentes/i);

console.log('Relatório de precificação X-Açaí: 24 verificações aprovadas.');
