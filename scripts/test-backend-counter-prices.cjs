// Pure/mocked tests: no store DB, HTTP request, real order or payment.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { test } = require('node:test');
const root = path.resolve(__dirname, '..');
const appRequire = createRequire(path.join(root, 'apps/backend/package.json'));
const ts = appRequire('typescript');
const cache = new Map();
function load(relative, mocks = {}, suffix = '') {
    const filename = path.resolve(root, relative);
    if (cache.has(filename) && !suffix) return cache.get(filename);
    const source = fs.readFileSync(filename, 'utf8');
    if (filename.endsWith('.json')) return JSON.parse(source);
    const code = ts.transpileModule(source + suffix, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    const module = { exports: {} };
    const localRequire = name => {
        if (Object.hasOwn(mocks, name)) return mocks[name];
        if (name.startsWith('.')) {
            const candidate = path.resolve(path.dirname(filename), name);
            const resolved = [candidate, candidate + '.ts', candidate + '.tsx'].find(file => fs.existsSync(file) && fs.statSync(file).isFile());
            if (resolved) return load(path.relative(root, resolved), mocks);
        }
        throw new Error(`Unexpected dependency: ${name}`);
    };
    new Function('require', 'module', 'exports', code)(localRequire, module, module.exports);
    if (!suffix) cache.set(filename, module.exports);
    return module.exports;
}
const prices = load('apps/backend/src/services/counter-prices.ts');
const options = load('apps/backend/src/services/menu-options.ts');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'apps/frontend/public/default-menu.json'), 'utf8'));
const table = JSON.parse(fs.readFileSync(path.join(root, 'apps/backend/src/data/counter-prices.json'), 'utf8'));
const promotion = load('apps/frontend/src/lib/promotion-options.ts');
const frontend = load('apps/frontend/src/app/product/[id]/page.tsx', {
    react: {}, 'react/jsx-runtime': {}, 'next/navigation': {},
    '../../../components/CartContext': {}, '../../../hooks/useTenant': {},
    '../../../lib/menu-presentation': {}, '../../../lib/water-bundles': {},
    '../../../lib/promotion-options': promotion,
}, '\nexport { buildFallbackOptionGroups, resolveProductOptionGroups };');
const pick = (group, option = group.options[0], forgedPrice = -999999) => ({
    groupId: group.id, groupName: 'untrusted group name', optionId: option.id, optionName: 'untrusted option name', price_cents: forgedPrice,
});
const minimumSelections = groups => groups.flatMap(group => Array.from({ length: group.min_select }, () => pick(group)));

test('all 28 known product fallbacks match frontend canonical IDs, prices and rules', () => {
    const frontendPrices = load('apps/frontend/src/lib/counter-prices.ts');
    assert.equal(Object.keys(table.products).length, 28);
    for (const product of catalog.filter(item => table.products[item.id])) {
        const expected = frontendPrices.applyCounterOptionGroups(product.id, frontend.buildFallbackOptionGroups(product));
        assert.deepEqual(options.buildFallbackOptionGroups(product), expected, product.name);
    }
});

test('prices applied by ID only and size/duo add-ons preserve authoritative totals', () => {
    assert.equal(prices.getCounterPrice('unknown'), undefined);
    assert.equal(prices.getCounterOptionPrice('unknown', 'Tamanho', '700ml'), undefined);
    for (const product of catalog.filter(item => table.products[item.id])) {
        const record = table.products[product.id];
        const groups = options.buildFallbackOptionGroups(product);
        if (record.size_prices_cents) {
            for (const [size, total] of Object.entries(record.size_prices_cents)) {
                assert.equal(prices.getCounterOptionPrice(product.id, 'Tamanho do Copo', `Copo de ${size}ml`) + record.price_cents, total);
            }
        }
        if (record.duo_flavor_prices_cents) {
            const group = groups.find(group => group.name === 'Escolha seus 2 Copos');
            for (const a of group.options) for (const b of group.options) {
                const calculated = record.price_cents + a.price_cents + b.price_cents;
                assert.equal(calculated, record.duo_flavor_prices_cents[prices.normalizeCounterLabel(a.name)] + record.duo_flavor_prices_cents[prices.normalizeCounterLabel(b.name)]);
            }
        }
    }
});

test('canonical validation discards forged prices/names, accepts supported repetitions', () => {
    for (const product of catalog.filter(item => table.products[item.id])) {
        const groups = options.buildFallbackOptionGroups(product);
        const selected = minimumSelections(groups);
        const canonical = options.resolveSelectedOptions(groups, selected);
        for (const option of canonical) {
            const group = groups.find(group => group.id === option.groupId);
            const expected = group.options.find(item => item.id === option.optionId);
            assert.equal(option.price_cents, expected.price_cents);
            assert.equal(option.optionName, expected.name);
            assert.equal(option.groupName, group.name);
        }
        if (groups.some(group => group.required)) assert.throws(() => options.resolveSelectedOptions(groups, []), options.MenuSelectionError);
        const single = groups.find(group => group.max_select === 1);
        if (single) assert.throws(() => options.resolveSelectedOptions(groups, [...selected.filter(item => item.groupId !== single.id), pick(single), pick(single)]), options.MenuSelectionError);
        const repeated = groups.find(group => group.max_select > 1 && group.max_select !== 99);
        if (repeated) {
            const withoutGroup = selected.filter(item => item.groupId !== repeated.id);
            const atLimit = [...withoutGroup, ...Array.from({ length: repeated.max_select }, () => pick(repeated))];
            assert.doesNotThrow(() => options.resolveSelectedOptions(groups, atLimit));
            assert.throws(() => options.resolveSelectedOptions(groups, [...atLimit, pick(repeated)]), options.MenuSelectionError);
        }
    }
});

test('rejects nonexistent/wrong-group/unavailable options without accepting client fallback data', () => {
    const product = catalog.find(item => table.products[item.id]?.size_prices_cents);
    const groups = options.buildFallbackOptionGroups(product);
    const selected = minimumSelections(groups);
    assert.throws(() => options.resolveSelectedOptions(groups, [...selected, { ...pick(groups[0]), optionId: 'fake' }]), options.MenuSelectionError);
    assert.throws(() => options.resolveSelectedOptions(groups, [{ ...selected[0], groupId: groups[1].id }, ...selected.slice(1)]), options.MenuSelectionError);
    const unavailable = structuredClone(groups);
    unavailable[0].options[0].available = 0;
    assert.throws(() => options.resolveSelectedOptions(unavailable, selected), options.MenuSelectionError);
    assert.deepEqual(options.buildFallbackOptionGroups({ ...product, id: 'other-store-product' }), []);
});

test('DB group supplementation and prices match frontend without replacing existing IDs', async () => {
    const product = catalog.find(item => /300.*complementos/i.test(item.name));
    assert.ok(product);
    const all = options.buildFallbackOptionGroups(product);
    const imported = all.filter(group => !/Vai o quê|Colher/.test(group.name)).map(group => ({ ...group, id: 'db-' + group.id }));
    const input = { ...product, option_groups: imported };
    assert.deepEqual(options.resolveProductOptionGroups(input), frontend.resolveProductOptionGroups(input));
    const db = { async all(sql, params) {
        if (sql.includes('FROM option_groups')) return imported.map(({ options: unused, ...group }) => group);
        return imported.find(group => group.id === params[0]).options;
    } };
    assert.deepEqual(await options.loadProductOptionGroups(db, product), options.resolveProductOptionGroups(input));
    const unknown = { ...product, id: 'other-store-product', option_groups: imported };
    assert.deepEqual(options.resolveProductOptionGroups(unknown), imported);
});

test('PricingService uses counter base without Happy Hour; unknown IDs keep existing pricing', async () => {
    const { PricingService } = load('apps/backend/src/services/pricing.service.ts', {
        '../db/db.client': { getDb: async () => ({ get: async () => ({ pricing_rules: JSON.stringify({ happy_hour: { enabled: false }, surge: { enabled: false } }) }) }) },
        './forecasting.service': {},
    });
    const product = catalog.find(item => table.products[item.id]);
    const known = await PricingService.calculateItemPrice('default_tenant', product);
    assert.deepEqual(known, { finalPriceCents: table.products[product.id].price_cents, isHappyHour: false });
    assert.deepEqual(await PricingService.calculateItemPrice('another-tenant', { id: 'unknown', price_cents: 1234, category: null }), { finalPriceCents: 1234, isHappyHour: false });
});

test('order pricing rejects unavailable IDs/quantities and ignores browser option prices', async () => {
    const product = catalog.find(item => table.products[item.id]?.size_prices_cents);
    const groups = options.buildFallbackOptionGroups(product);
    const calls = [];
    const db = { async all() { return []; } };
    const schema = new Proxy({}, { get: () => () => schema });
    const router = { get() {}, post() {} };
    const mockProducts = { [product.id]: product, hidden: { ...product, hidden: true }, unavailable: { ...product, available: false } };
    const { priceOrderItems } = load('apps/backend/src/routes/orders.router.ts', {
        express: { Router: () => router }, zod: { z: schema },
        '../db/db.client': { getDb: async () => db },
        '../db/repositories/orders.repo': {}, '../payments/pix.service': {},
        '../payments/mercadopago.service': {}, '../middlewares/tenant.middleware': {},
        '../core/eventBus': {}, '../db/repositories/loyalty.repo': {},
        '../services/delivery-quote.service': {},
        '../db/repositories/menu.repo': { menuRepo: { async getMenuItemById(tenant, id) { calls.push({ tenant, id }); return mockProducts[id]; } } },
    }, '\nexport { priceOrderItems };');
    const item = { menuItemId: product.id, qty: 2, notes: 'Preserve instructions', selected_options: minimumSelections(groups) };
    item.selected_options[0] = pick(groups[0], groups[0].options[3], 0);
    const [result] = await priceOrderItems('default_tenant', [item]);
    assert.equal(result.unitPriceCents, table.products[product.id].size_prices_cents['700']);
    assert.equal(result.qty, 2);
    assert.equal(result.notes, item.notes);
    assert.deepEqual(calls[0], { tenant: 'default_tenant', id: product.id });
    for (const id of ['missing', 'hidden', 'unavailable']) await assert.rejects(priceOrderItems('default_tenant', [{ ...item, menuItemId: id }]), options.MenuSelectionError);
    for (const qty of [0, -1, 0.5, Number.MAX_SAFE_INTEGER + 1]) await assert.rejects(priceOrderItems('default_tenant', [{ ...item, qty }]), options.MenuSelectionError);
    await assert.rejects(priceOrderItems('default_tenant', [{ ...item, selected_options: [] }]), options.MenuSelectionError);
});

test('legacy menu changes only approved IDs, preserving unknown products unchanged', async () => {
    const handlers = new Map();
    const product = catalog.find(item => table.products[item.id]);
    const unknown = { id: 'other-product', name: 'Another product', price_cents: 2345, category: 'other' };
    load('apps/backend/src/routes/menu.router.ts', {
        express: { Router: () => ({ get(route, ...args) { handlers.set(route, args.at(-1)); } }) },
        '../db/repositories/menu.repo': {}, '../middlewares/tenant.middleware': {},
        '../db/db.client': {},
        '../services/cache/menu.cache': { menuCacheService: { async getMenu() { return [product, unknown]; } } },
        '../services/pricing.service': { PricingService: { async calculateItemPrice(tenant, item) {
            assert.equal(item.id, product.id, 'unknown legacy products must not enter dynamic pricing');
            return { finalPriceCents: table.products[item.id].price_cents, isHappyHour: false };
        } } },
    });
    let output;
    await handlers.get('/menu')({ query: {} }, { json(result) { output = result; } });
    assert.equal(output[0].price_cents, table.products[product.id].price_cents);
    assert.equal(output[1], unknown);
});
