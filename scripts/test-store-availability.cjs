const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { loadSource, frontend, appRequire } = require('./frontend-module-loader.cjs');
const availability = loadSource('src/lib/store-availability.ts');
const { canStoreAcceptOrders, loadStoreInfo, storeUnavailableMessage } = availability;
const React = appRequire('react');

const nodes = tree => !tree || typeof tree !== 'object' ? []
    : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)];
const openStore = { name: 'X-Açaí', store_status: 'open', can_accept_orders: 1 };

test('somente status aberto e permissão explícita boolean/SQLite liberam pedidos', () => {
    assert.equal(canStoreAcceptOrders(openStore), true);
    assert.equal(canStoreAcceptOrders({ ...openStore, can_accept_orders: true }), true);
    for (const flag of [false, 0, null, undefined, 'true', '1']) {
        assert.equal(canStoreAcceptOrders({ ...openStore, can_accept_orders: flag }), false);
    }
    for (const status of ['closed', 'paused', 'busy', undefined, 'unknown']) {
        assert.equal(canStoreAcceptOrders({ ...openStore, store_status: status }), false);
    }
    assert.equal(canStoreAcceptOrders(null), false);
    assert.match(storeUnavailableMessage(null), /Prévia.*nenhum pedido será enviado/);
});

test('HTTP falho, rede, JSON inválido ou erro de corpo nunca presumem loja aberta', async () => {
    for (const read of [
        async () => { throw new Error('offline'); },
        async () => ({ ok: false, json: async () => openStore }),
        async () => ({ ok: true, json: async () => { throw new Error('invalid json'); } }),
        async () => ({ ok: true, json: async () => ({ error: 'Service Suspended' }) }),
        async () => ({ ok: true, json: async () => ({ store_status: 'unknown' }) }),
    ]) assert.equal(await loadStoreInfo('', 'default', read), null);
    let request;
    assert.deepEqual(await loadStoreInfo('', 'default', async (url, init) => {
        request = { url, init };
        return { ok: true, json: async () => openStore };
    }), openStore);
    assert.equal(request.url, '/api/default/store');
    assert.equal(request.init.cache, 'no-store');
    assert.ok(request.init.signal instanceof AbortSignal);
});

function checkout({ store = null, currentStore = null, checking = false } = {}) {
    const item = { menuItemId: 'test', name: 'Açaí', qty: 1, price_cents: 1238, base_price_cents: 1238 };
    const form = { name: 'Teste isolado', phone: '11999999999', cep: '', street: '', number: '', neighborhood: '',
        city: '', state: '', complement: '', notes: '', paymentMethod: 'cash', changeFor: '', taxId: '' };
    const state = ['pickup', form, false, false, { verified: false, feeCents: 0, distanceKm: 0, estimatedMinutes: 0 },
        '', null, store, 'default', checking, '', false, ''];
    let index = 0;
    const changes = [];
    const calls = [];
    const { default: CheckoutPage } = loadSource('src/app/checkout/page.tsx', '', {
        react: { ...React, useEffect: () => {}, useCallback: fn => fn,
            useState: () => { const current = index++; return [state[current], value => changes.push([current, value])]; } },
        'next/navigation': { useRouter: () => ({ push: () => { throw new Error('Não deve navegar para um pedido'); } }) },
        '../../hooks/useTenant': { useTenant: () => ({ slug: 'default', ready: true }), getApiBase: () => '' },
        '../../components/CartContext': { useCart: () => ({ items: [item], subtotalCents: 1238, coupon: null,
            clearCart: () => { throw new Error('Não deve apagar a sacola'); } }) },
        '../../lib/store-availability': { ...availability,
            loadStoreInfo: async () => { calls.push('preflight'); return currentStore; } },
    });
    return { tree: CheckoutPage(), calls, changes };
}

test('checkout offline, fechado ou verificando bloqueia botão e handler sem enviar pedido', async () => {
    const originalFetch = global.fetch;
    let posted = false;
    global.fetch = async () => { posted = true; throw new Error('Não pode chamar pedidos'); };
    try {
        for (const config of [{}, { checking: true }, { store: { ...openStore, store_status: 'closed' } }]) {
            const { tree, calls } = checkout(config);
            const all = nodes(tree);
            assert.equal(all.find(node => node.type === 'button' && node.props.type === 'submit').props.disabled, true);
            assert.ok(all.some(node => node.props?.role === 'status'));
            await all.find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
            assert.equal(calls.length, 0);
        }
        assert.equal(posted, false);
    } finally { global.fetch = originalFetch; }
});

test('status antes aberto é revalidado; queda do backend bloqueia POST e conserva sacola', async () => {
    const originalFetch = global.fetch;
    let posted = false;
    global.fetch = async () => { posted = true; throw new Error('Não pode chamar pedidos'); };
    try {
        const { tree, calls, changes } = checkout({ store: openStore, currentStore: null });
        const all = nodes(tree);
        assert.equal(all.find(node => node.type === 'button' && node.props.type === 'submit').props.disabled, false);
        await all.find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
        assert.deepEqual(calls, ['preflight']);
        assert.equal(posted, false);
        assert.ok(changes.some(([index, value]) => index === 5 && /nenhum pedido será enviado/.test(value)));
    } finally { global.fetch = originalFetch; }
});

test('home offline identifica prévia, mas mantém acesso aos produtos para conferir preços', () => {
    const menu = JSON.parse(fs.readFileSync(path.join(frontend, 'public/default-menu.json'), 'utf8'));
    const state = [menu, null, 'default', null, '', 0];
    let index = 0;
    const { default: Home } = loadSource('src/app/page.tsx', '', {
        react: { ...React, useEffect: () => {}, useCallback: fn => fn,
            useState: () => [state[index++], () => {}] },
        '../hooks/useTenant': { useTenant: () => ({ slug: 'default', ready: true }), getApiBase: () => '' },
        '../components/CartContext': { useCart: () => ({ cartCount: 0 }) },
    });
    const all = nodes(Home());
    assert.ok(all.some(node => node.props?.role === 'status'));
    const links = all.filter(node => node.props?.href?.startsWith('/product/'));
    assert.ok(links.length > 0);
    assert.ok(links.every(node => node.props['aria-disabled'] !== true));
});
