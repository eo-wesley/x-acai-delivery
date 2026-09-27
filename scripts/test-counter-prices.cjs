// Counter-price regression tests. No database writes, order submission or payment.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { loadSource, frontend } = require('./frontend-module-loader.cjs');
const {
    COUNTER_PRICE_VERSION, applyCounterCatalog, applyCounterProduct, applyCounterOptionGroups,
    getCounterOptionPrice, migrateCounterCart, repriceCounterCartItem,
} = loadSource('src/lib/counter-prices.ts');
const { loadMenuCatalog } = loadSource('src/lib/load-menu.ts');
const priceData = JSON.parse(fs.readFileSync(path.join(frontend, 'src/data/counter-prices.json'), 'utf8'));
const originalMenu = JSON.parse(fs.readFileSync(path.join(frontend, 'public/default-menu.json'), 'utf8'));
const menu = applyCounterCatalog(originalMenu);
const find = name => menu.find(item => item.name === name);
const option = (groupName, optionName, price_cents) => ({
    groupId: `group-${groupName}`, optionId: `option-${optionName}`,
    groupName, optionName, price_cents,
});
const basketItem = (product, selected_options, overrides = {}) => ({
    cartKey: 'preserve-this-key', menuItemId: product.id, name: product.name,
    base_price_cents: 2690, price_cents: 5990, qty: 3,
    notes: 'Sem guardanapo. Interfone 42.', selected_options, ...overrides,
});

test('Docker frontend e backend recebem tabelas idênticas, 28 produtos e versão rastreável', () => {
    const backend = fs.readFileSync(path.join(frontend, '../backend/src/data/counter-prices.json'), 'utf8');
    assert.deepEqual(priceData, JSON.parse(backend));
    assert.equal(COUNTER_PRICE_VERSION, 'balcao-2026-09-26-v1');
    assert.equal(Object.keys(priceData.products).length, 28);
    for (const [id, price] of Object.entries(priceData.products)) {
        assert.ok(originalMenu.some(item => item.id === id), price.name);
        assert.ok(Number.isSafeInteger(price.price_cents) && price.price_cents >= 0);
    }
});

test('40 variações de tamanho somam base mais diferença exata, inclusive todos os 700 ml', () => {
    const cups = Object.entries(priceData.products).filter(([, price]) => price.size_prices_cents);
    assert.equal(cups.length, 10);
    for (const [id, price] of cups) {
        for (const [size, total] of Object.entries(price.size_prices_cents)) {
            assert.equal(price.price_cents + getCounterOptionPrice(id, 'Tamanho do Copo', `Copo de ${size}ml`), total);
            assert.equal(price.price_cents + getCounterOptionPrice(id, 'TAMANHO DO COPO', `Copo de ${size} ml`), total);
        }
    }
    assert.equal(find('Açaí 700ml Grátis 4 Complementos').price_cents, 3821);
    assert.equal(find('Açaí Marmitex 700ml Grátis 4 Complementos').price_cents, 3741);
    assert.equal(find('Açaí Marmitex 500ml Grátis 3 Complementos').price_cents, 2456);
});

test('64 combinações de duplas custam exatamente a soma dos dois sabores, sem desconto', () => {
    const duos = Object.entries(priceData.products).filter(([, price]) => price.duo_flavor_prices_cents);
    assert.equal(duos.length, 4);
    let combinations = 0;
    for (const [id, price] of duos) {
        const flavors = Object.entries(price.duo_flavor_prices_cents);
        assert.equal(price.price_cents, 2 * Math.min(...flavors.map(([, cents]) => cents)));
        for (const [first, firstPrice] of flavors) {
            for (const [second, secondPrice] of flavors) {
                const actual = price.price_cents
                    + getCounterOptionPrice(id, 'Escolha seus 2 Copos', first)
                    + getCounterOptionPrice(id, 'Escolha seus 2 Copos', second);
                assert.equal(actual, firstPrice + secondPrice);
                combinations += 1;
            }
        }
    }
    assert.equal(combinations, 64);
});

test('API e contingência aplicam preços sem mutar catálogo, IDs, disponibilidade e adicionais', () => {
    const cup = originalMenu.find(item => item.name === 'Açaí X-King Paçoca');
    const product = { ...cup, available: false, is_happy_hour: true, original_price_cents: 6990,
        option_groups: [{ id: 'g1', name: 'Tamanho do Copo', options: [{ id: 'o1', name: 'Copo de 700ml', price_cents: 1600 }] },
            { id: 'g2', name: 'Adicionais', options: [{ id: 'o2', name: 'Creme De Avelã', price_cents: 700 }] }] };
    const before = JSON.stringify(product);
    const result = applyCounterProduct(product);
    assert.equal(JSON.stringify(product), before);
    assert.equal(result.price_cents, 1349);
    assert.equal(result.original_price_cents, 1349);
    assert.equal(result.is_happy_hour, false);
    assert.equal(result.available, false);
    assert.equal(result.option_groups[0].options[0].price_cents, 1403);
    assert.equal(result.option_groups[0].options[0].id, 'o1');
    assert.deepEqual(result.option_groups[1], product.option_groups[1]);
    assert.deepEqual(applyCounterProduct(result), result, 'Reaplicar não duplica acréscimos.');
    for (const beverage of originalMenu.filter(item => /bebida/i.test(item.category))) {
        assert.equal(menu.find(item => item.id === beverage.id).price_cents, beverage.price_cents);
    }
});

test('sacola antiga migra 700 ml preservando quantidades, escolhas, observações e chave', () => {
    const cup = find('Açaí X-King Paçoca');
    const item = basketItem(cup, [
        option('Tamanho do Copo', 'Copo de 700ml', 1600),
        option('Turbinando o Açaí', 'Creme De Avelã', 700),
        option('Vai uma Bebida?', 'Coca-Cola 350ml', 1000),
        option('Colher', 'Não', 0),
    ]);
    const original = JSON.stringify(item);
    const migrated = migrateCounterCart({ items: [item], coupon: { code: 'ANTIGO', discountCents: 200 } });
    assert.equal(JSON.stringify(item), original);
    assert.equal(migrated.items[0].base_price_cents, 1349);
    assert.equal(migrated.items[0].price_cents, 4452);
    assert.equal(migrated.items[0].qty, 3);
    assert.equal(migrated.items[0].notes, item.notes);
    assert.equal(migrated.items[0].cartKey, item.cartKey);
    assert.deepEqual(migrated.items[0].selected_options.map(value => value.optionId), item.selected_options.map(value => value.optionId));
    assert.equal(migrated.coupon, null);
    assert.equal(migrated.priceUpdated, true);
    assert.equal(migrated.priceVersion, COUNTER_PRICE_VERSION);
    assert.equal(migrated.items[0].price_cents * migrated.items[0].qty, 13356);
});

test('migração recalcula duplas antigas e conserva sabores repetidos, adicionais e bebidas', () => {
    const duo = find('Açaí 700ml Escolha 2 opções');
    const old = basketItem(duo, [
        option('Escolha seus 2 Copos', 'Açaí X-Splash', 0),
        option('Escolha seus 2 Copos', 'Açaí X-Splash', 0),
        option('Vai uma Bebida?', 'Água Mineral Crystal Sem Gás 500ml', 600),
        option('Colher', 'Sim', 0),
    ], { base_price_cents: 7890, price_cents: 8490 });
    const result = repriceCounterCartItem(old);
    assert.equal(result.base_price_cents, 5504);
    assert.equal(result.price_cents, 6380);
    assert.deepEqual(result.selected_options.map(row => row.price_cents), [138, 138, 600, 0]);
    assert.equal(result.selected_options.length, 4);
});

test('sacola sem mudança financeira mantém cupom; item desconhecido é preservado', () => {
    const cup = find('Açaí X-Tradicional');
    const current = basketItem(cup, [], { base_price_cents: cup.price_cents, price_cents: cup.price_cents });
    const unknown = basketItem({ id: 'unregistered', name: 'Outro produto' }, undefined);
    const coupon = { code: 'ATUAL', discountCents: 300 };
    const migrated = migrateCounterCart({ items: [current, unknown], coupon, priceVersion: 'older' });
    assert.equal(migrated.priceUpdated, false);
    assert.deepEqual(migrated.coupon, coupon);
    assert.strictEqual(migrated.items[1], unknown);
    assert.equal(getCounterOptionPrice(cup.id, 'Adicionais', 'Copo de 700ml'), undefined);
    assert.equal(getCounterOptionPrice('unknown', 'Tamanho', '700ml'), undefined);
    assert.deepEqual(migrateCounterCart({ items: [] }).items, []);
});

test('catálogo usa os mesmos preços tanto online quanto no fallback e não reativa lista vazia', async () => {
    const expected = menu.map(item => [item.id, item.price_cents]);
    const onlineCalls = [];
    const online = await loadMenuCatalog('', 'default', async url => { onlineCalls.push(url); return originalMenu; });
    assert.deepEqual(online.map(item => [item.id, item.price_cents]), expected);
    assert.deepEqual(onlineCalls, ['/api/default/menu']);
    const offlineCalls = [];
    const offline = await loadMenuCatalog('', 'default', async url => {
        offlineCalls.push(url);
        if (url !== '/default-menu.json') throw new Error('offline');
        return originalMenu;
    });
    assert.deepEqual(offline.map(item => [item.id, item.price_cents]), expected);
    assert.deepEqual(offlineCalls, ['/api/default/menu', '/default-menu.json']);
    const emptyCalls = [];
    assert.deepEqual(await loadMenuCatalog('', 'default', async url => { emptyCalls.push(url); return []; }), []);
    assert.deepEqual(emptyCalls, ['/api/default/menu']);
    await assert.rejects(() => loadMenuCatalog('', 'default', async () => ({ error: 'inválido' })), /Catálogo inválido/);
});
