// Tests composition against the current catalog, without sending orders or payments.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { loadSource: loadFrontendSource, frontend } = require('./frontend-module-loader.cjs');
const loadSource = (relativePath, mocks = {}) => loadFrontendSource(relativePath, '', mocks);

const cart = loadSource('src/components/CartContext.tsx');
const { getWaterBundle, buildBundleCartItems } = loadSource('src/lib/water-bundles.ts', { '../components/CartContext': cart });
const menu = JSON.parse(fs.readFileSync(path.join(frontend, 'public/default-menu.json'), 'utf8'));
const cup = menu.find(product => product.name === 'Açaí 500ml Grátis 3 Complementos');
const duo = menu.find(product => product.name === 'Açaí 300ml Escolha 2 opções');
const water = menu.find(product => product.name === 'Água Mineral Sem Gás 500ml');
const changeItem = (id, change) => menu.map(product => product.id === id ? { ...product, ...change } : product);
const total = items => items.reduce((sum, item) => sum + item.price_cents * item.qty, 0);

test('catalog produces R$43,90 and R$58,90 from real products and correct URLs', () => {
    for (const [product, mode, expected, waterQty] of [[cup, 'water', 4390, 1], [duo, 'two-waters', 5890, 2]]) {
        const bundle = getWaterBundle(menu, product.id, mode);
        assert.ok(bundle);
        assert.strictEqual(bundle.baseProduct, product);
        assert.strictEqual(bundle.waterProduct, water);
        assert.equal(bundle.waterQty, waterQty);
        assert.equal(bundle.price_cents, expected);
        assert.equal(bundle.href, `/product/${product.id}?bundle=${mode}`);
        const items = buildBundleCartItems(bundle, [], 1, '');
        assert.equal(items.length, 2);
        assert.deepEqual(items.map(item => item.menuItemId), [product.id, water.id]);
        assert.equal(items[1].qty, waterQty);
        assert.equal(total(items), expected);
        assert.ok(items[0].notes.includes(bundle.title));
        assert.ok(items[0].notes.includes(water.name));
        assert.deepEqual(items[1].selected_options, []);
    }
});

test('only the 500 ml Monte cup and the 300 ml duo accept their respective modes', () => {
    for (const product of menu) {
        assert.equal(Boolean(getWaterBundle(menu, product.id, 'water')), product.id === cup.id, product.name);
        assert.equal(Boolean(getWaterBundle(menu, product.id, 'two-waters')), product.id === duo.id, product.name);
    }
    for (const mode of [null, '', 'Water', 'two-water', 'water&discount=100', 'unknown']) {
        assert.equal(getWaterBundle(menu, cup.id, mode), null);
    }
    assert.equal(getWaterBundle(menu, 'not-a-catalog-id', 'water'), null);
    assert.equal(getWaterBundle([], cup.id, 'water'), null);
});

test('accents, case and spacing are normalized; category, format and sizes remain mandatory', () => {
    const variations = menu.map(product => ({ ...product, name: product.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replaceAll(' ', '  '), category: product.category.toUpperCase() }));
    assert.ok(getWaterBundle(variations, cup.id, 'water'));
    assert.ok(getWaterBundle(variations, duo.id, 'two-waters'));
    assert.ok(getWaterBundle(changeItem(cup.id, { name: 'Copo de 500 ml' }), cup.id, 'water'));
    assert.ok(getWaterBundle(changeItem(duo.id, { name: 'Dupla X-Açaí — 2 copos de 300 ml' }), duo.id, 'two-waters'));
    assert.equal(getWaterBundle(changeItem(cup.id, { category: 'Bebidas' }), cup.id, 'water'), null);
    for (const replacement of [{ category: 'Outros' }, { name: 'Água Mineral com Gás 500ml' }, { name: 'Água Mineral Sem Gás 1500ml' }]) {
        assert.equal(getWaterBundle(changeItem(water.id, replacement), cup.id, 'water'), null);
    }
    assert.equal(getWaterBundle(menu.filter(product => product.id !== water.id), cup.id, 'water'), null);
});

test('disabled, hidden and out-of-stock components remove the offer', () => {
    for (const id of [cup.id, water.id]) {
        for (const change of [{ available: false }, { available: 0 }, { hidden: true }, { hidden: 1 }, { out_of_stock: true }, { out_of_stock: 1 }]) {
            assert.equal(getWaterBundle(changeItem(id, change), cup.id, 'water'), null, JSON.stringify({ id, change }));
        }
    }
    assert.equal(getWaterBundle(changeItem(duo.id, { out_of_stock: 1 }), duo.id, 'two-waters'), null);
});

test('new catalog prices are recalculated, zero is preserved, invalid prices are rejected', () => {
    assert.equal(getWaterBundle(changeItem(water.id, { price_cents: 725 }), cup.id, 'water').price_cents, 4515);
    assert.equal(getWaterBundle(changeItem(water.id, { price_cents: 725 }), duo.id, 'two-waters').price_cents, 6140);
    assert.equal(getWaterBundle(changeItem(cup.id, { price_cents: 4000 }), cup.id, 'water').price_cents, 4600);
    assert.equal(getWaterBundle(changeItem(water.id, { price_cents: 0 }), cup.id, 'water').price_cents, cup.price_cents);
    for (const id of [cup.id, water.id]) {
        for (const price_cents of [-1, 6.5, NaN, Infinity, undefined, null, '600', Number.MAX_SAFE_INTEGER]) {
            assert.equal(getWaterBundle(changeItem(id, { price_cents }), cup.id, 'water'), null);
        }
    }
});

test('two packages multiply both real lines, preserve options and notes, never charge water twice', () => {
    const options = [
        { groupId: 'mass', groupName: 'Vai o quê?', optionId: 'cupuacu', optionName: 'Cupuaçu', price_cents: 500 },
        { groupId: 'spoon', groupName: 'Colher', optionId: 'no-spoon', optionName: 'Não', price_cents: 0 },
        { groupId: 'drink', groupName: 'Vai uma Bebida?', optionId: 'water-modifier', optionName: water.name, price_cents: water.price_cents },
    ];
    const original = JSON.stringify(options);
    for (const [product, mode, expected, waterQty] of [[cup, 'water', 9780, 2], [duo, 'two-waters', 12780, 4]]) {
        const bundle = getWaterBundle(menu, product.id, mode);
        const items = buildBundleCartItems(bundle, options, 2, '  Sem banana  ');
        assert.equal(items[0].qty, 2);
        assert.equal(items[1].qty, waterQty);
        assert.equal(items[0].base_price_cents, product.price_cents);
        assert.equal(items[0].price_cents, product.price_cents + 500);
        assert.deepEqual(items[0].selected_options, options.slice(0, 2));
        assert.ok(items[0].notes.endsWith('\nSem banana'));
        assert.equal(total(items), expected);
        assert.notEqual(items[0].cartKey, buildBundleCartItems(bundle, options, 2, 'Sem leite')[0].cartKey);
        // The checkout payload contains existing IDs, and the backend's base + options calculation agrees.
        const payload = items.map(item => ({ menuItemId: item.menuItemId, qty: item.qty, notes: item.notes || '', selected_options: item.selected_options || [] }));
        assert.ok(payload.every(item => menu.some(product => product.id === item.menuItemId)));
        assert.equal(payload.reduce((sum, item) => sum + (menu.find(product => product.id === item.menuItemId).price_cents + item.selected_options.reduce((amount, option) => amount + option.price_cents, 0)) * item.qty, 0), expected);
    }
    assert.equal(JSON.stringify(options), original);
});

test('cart keys keep legacy compatibility while preserving different instructions', () => {
    assert.equal(cart.buildCartKey(cup.id, []), `${cup.id}|`);
    assert.equal(cart.buildCartKey(cup.id, [], '  '), cart.buildCartKey(cup.id, []));
    assert.equal(cart.buildCartKey(cup.id, [], ' Sem banana '), cart.buildCartKey(cup.id, [], 'Sem banana'));
    assert.notEqual(cart.buildCartKey(cup.id, [], 'Sem banana'), cart.buildCartKey(cup.id, [], 'Sem leite'));
});

test('invalid quantities, invalid options and components changed after selection cannot enter the cart', () => {
    const bundle = getWaterBundle(menu, cup.id, 'water');
    for (const qty of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER]) {
        assert.deepEqual(buildBundleCartItems(bundle, [], qty, ''), []);
    }
    assert.deepEqual(buildBundleCartItems({ ...bundle, waterProduct: { ...water, available: false } }, [], 1, ''), []);
    assert.deepEqual(buildBundleCartItems(bundle, [{ groupId: 'extra', groupName: 'Extras', optionId: 'extra', optionName: 'Extra', price_cents: -1 }], 1, ''), []);
});
