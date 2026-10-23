const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const cache = new Map();
function load(name) {
    const filename = path.resolve(__dirname, '../src/lib', name + '.ts');
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = new Module(filename);
    cache.set(filename, module);
    module.require = spec => spec.startsWith('./') ? load(spec.slice(2)) : require(spec);
    module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText, filename);
    return module.exports;
}
const { buildSimulatorProducts, selectSimulatorProducts, simulatePrice, roundPriceUpTo90 } = load('price-simulator');
const { buildMenuPrices } = load('menu-prices');
const snapshot = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/data/xacai-pricing-snapshot.json'), 'utf8'));
const before = JSON.stringify(snapshot);
const products = buildSimulatorProducts(snapshot);
assert.equal(products.length, 58);
assert.equal(new Set(products.map(p => p.sku)).size, 58);
const prices = new Map(buildMenuPrices(snapshot).map(p => [p.id, p]));
for (const source of snapshot.products) {
    const product = products.find(p => p.sku === source.sku);
    assert.equal(product.name, source.product);
    assert.equal(product.family, source.family);
    assert.deepEqual(product.state, source.state);
    assert.equal(product.released, source.released);
    assert.equal(product.referencePrice, prices.get(source.sku).price);
    assert.equal(product.priceStatus, prices.get(source.sku).status);
    if (source.cost === null) assert.equal(product.directCost, null);
}
assert.equal(products.find(p => p.sku === 'MARMITEX-700').directCost, 21.64);
assert.equal(products.find(p => p.sku === 'MARMITEX-700').referencePrice, 38.90);
assert.equal(products.find(p => p.sku === 'BARCA-P').costStatus, 'provisional');
assert.equal(products.find(p => p.sku === 'MONTE-700').costStatus, 'missing');
assert.equal(products.find(p => p.sku === 'BEB-AGUA-MINERAL-CRYSTAL-COM').costStatus, 'provisional');
for (const family of new Set(products.map(p => p.family))) {
    const { visible, selected } = selectSimulatorProducts(products, family, 'MARMITEX-700');
    assert.ok(visible.length > 0);
    assert.equal(selected.family, family);
    assert.ok(visible.every(p => p.family === family));
}
assert.equal(selectSimulatorProducts(products, 'missing', '').selected, null);
assert.equal(roundPriceUpTo90(20.95), 21.90);
assert.equal(roundPriceUpTo90(20.90), 20.90);
assert.equal(roundPriceUpTo90(21), 21.90);
assert.equal(roundPriceUpTo90(20.90001), 21.90);
for (let cents = 1; cents < 100000; cents++) {
    const rounded = roundPriceUpTo90(cents / 100);
    assert.ok(rounded >= cents / 100);
    assert.equal(Math.round(rounded * 100) % 100, 90);
}
const params = { fixedCost: 7.02, markupPercent: 80, taxPercent: 4.5, feePercent: 5 };
const result = simulatePrice(21.64, params);
assert.ok(result.ok);
assert.ok(Math.abs(result.tax - result.suggestedPrice * 0.045) < 1e-9);
assert.ok(Math.abs(result.result - (result.suggestedPrice - result.tax - result.fee - 21.64 - 7.02)) < 1e-9);
for (const product of products) {
    const value = simulatePrice(product.costStatus === 'ready' ? product.directCost : null, params);
    assert.equal(value.ok, product.costStatus === 'ready');
}
for (const badCost of [null, NaN, Infinity, -1, 0]) assert.equal(simulatePrice(badCost, params).ok, false);
for (const key of Object.keys(params)) {
    for (const badValue of [NaN, Infinity, -1]) assert.equal(simulatePrice(10, { ...params, [key]: badValue }).ok, false);
}
assert.equal(simulatePrice(10, { ...params, taxPercent: 95, feePercent: 5 }).ok, false);
assert.equal(simulatePrice(10, { ...params, taxPercent: 100, feePercent: 5 }).ok, false);
assert.equal(simulatePrice(10, { fixedCost: 0, markupPercent: 0, taxPercent: 0, feePercent: 0 }).ok, true);
assert.equal(JSON.stringify(snapshot), before, 'snapshot must not be mutated');
console.log(`PASS: 58 SKUs, ${products.filter(p => p.costStatus === 'ready').length} calculable, canonical prices/states, filters, missing/provisional costs, 99,999 rounding cases, invalid parameters and coherent deductions.`);
