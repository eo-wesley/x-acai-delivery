// Exercises the real quote calculation with an in-memory DB and network/route mocks.
// All addresses and responses below are synthetic; this script never contacts a provider.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { test } = require('node:test');
const root = path.resolve(__dirname, '..');
const appRequire = createRequire(path.join(root, 'apps/frontend/package.json'));
const ts = appRequire('typescript');
const code = ts.transpileModule(fs.readFileSync(path.join(root, 'apps/backend/src/services/delivery-quote.service.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const input = {
    cep: '00000000', street: 'Rua de Teste', number: '123', neighborhood: 'Bairro de Teste',
    city: 'Cidade de Teste', state: 'SP',
};
const store = {
    address: 'Rua da Loja Fictícia, 10', city: 'Cidade de Teste',
    delivery_fee_cents: 500, delivery_included_km: 3, delivery_fee_per_km_cents: 150,
    delivery_max_distance_km: 8, prep_time_minutes: 30,
};
const destination = { lat: '-23.55', lon: '-46.64' };
const storePoint = { lat: '-23.56', lon: '-46.65' };

function fixture(restaurant, { destinationResponse = [destination], originResponse = [storePoint] } = {}) {
    const calls = { geocodes: [], routes: [], queries: [] };
    const mocks = {
        '../db/db.client': {
            getDb: async () => ({
                get: async (sql, parameters) => {
                    calls.queries.push({ sql, parameters });
                    return restaurant;
                },
            }),
        },
        './route.service': {
            RouteService: class {
                async getRoute(from, to) {
                    calls.routes.push({ from, to });
                    return { distance: 4500, duration: 600, geometry: 'mock' };
                }
            },
        },
    };
    const fakeFetch = async url => {
        let response;
        if (url === 'https://viacep.com.br/ws/00000000/json/') {
            response = { logradouro: input.street, bairro: input.neighborhood, localidade: input.city, uf: input.state };
        } else {
            const parsed = new URL(url);
            assert.equal(parsed.origin, 'https://geocoder.invalid');
            const query = parsed.searchParams.get('q');
            calls.geocodes.push(query);
            const destinationQuery = `${input.street}, ${input.number}, ${input.neighborhood}, ${input.city}, ${input.state}, Brazil`;
            if (query === destinationQuery) response = destinationResponse;
            else {
                assert.equal(query, `${store.address}, ${store.city}, Brazil`);
                response = originResponse;
            }
        }
        return { ok: true, json: async () => response };
    };
    const module = { exports: {} };
    new Function('require', 'module', 'exports', 'fetch', 'process', code)(
        name => name in mocks ? mocks[name] : appRequire(name), module, module.exports, fakeFetch,
        { env: { DELIVERY_GEOCODER_URL: 'https://geocoder.invalid/search' } },
    );
    return { calculate: () => module.exports.deliveryQuoteService.calculate('test-store', input), calls };
}

test('NULL na origem geocodifica a loja e calcula a taxa pela rota correta', async () => {
    const { calculate, calls } = fixture({ ...store, delivery_origin_lat: null, delivery_origin_lng: null });
    const quote = await calculate();
    assert.deepEqual(calls.routes, [{ from: [-23.56, -46.65], to: [-23.55, -46.64] }]);
    assert.equal(calls.geocodes.length, 2);
    assert.deepEqual(calls.queries[0].parameters, ['test-store']);
    assert.equal(quote.distanceKm, 4.5);
    assert.equal(quote.feeCents, 725);
    assert.equal(quote.estimatedMinutes, 42);
    assert.equal(quote.latitude, -23.55);
    assert.equal(quote.longitude, -46.64);
});

test('coordenadas ausentes, vazias ou fora dos limites usam o endereço da loja', async () => {
    for (const [latitude, longitude] of [
        [undefined, undefined], ['', ''], ['  ', '\t'], [91, 0], [0, -181],
        [NaN, -46.65], [-23.56, Infinity], [true, false], [[], []], [null, -46.65],
    ]) {
        const { calculate, calls } = fixture({ ...store, delivery_origin_lat: latitude, delivery_origin_lng: longitude });
        await calculate();
        assert.deepEqual(calls.routes[0].from, [-23.56, -46.65]);
        assert.equal(calls.geocodes.length, 2);
    }
});

test('coordenadas fornecidas válidas, inclusive zero, são usadas sem geocodificar a loja', async () => {
    for (const [latitude, longitude] of [[-23.56, -46.65], [' -23.56 ', '-46.65'], [0, 0], ['0', '0'], [0, -46.65], [-23.56, 0]]) {
        const { calculate, calls } = fixture({ delivery_origin_lat: latitude, delivery_origin_lng: longitude });
        await calculate();
        assert.deepEqual(calls.routes[0].from, [Number(latitude), Number(longitude)]);
        assert.equal(calls.geocodes.length, 1);
    }
});

test('resultado geocodificado vazio, incompleto ou fora dos limites impede a rota', async () => {
    const invalid = [
        [], null, {}, [{}], [{ lat: null, lon: null }], [{ lat: '', lon: ' ' }],
        [{ lat: '91', lon: '0' }], [{ lat: '0', lon: '-181' }],
        [{ lat: 'NaN', lon: '0' }], [{ lat: '0', lon: 'Infinity' }],
    ];
    for (const response of invalid) {
        for (const options of [{ destinationResponse: response }, { originResponse: response }]) {
            const { calculate, calls } = fixture({ ...store, delivery_origin_lat: null, delivery_origin_lng: null }, options);
            await assert.rejects(calculate(), error => error.name === 'DeliveryQuoteError' && error.statusCode === 422);
            assert.equal(calls.routes.length, 0);
        }
    }
});

test('zero explícito retornado pelo geocodificador continua sendo coordenada válida', async () => {
    const { calculate, calls } = fixture({ ...store }, {
        destinationResponse: [{ lat: '0', lon: '0' }], originResponse: [{ lat: 0, lon: 0 }],
    });
    const quote = await calculate();
    assert.deepEqual(calls.routes, [{ from: [0, 0], to: [0, 0] }]);
    assert.equal(quote.latitude, 0);
    assert.equal(quote.longitude, 0);
});

test('sem endereço e sem coordenadas válidas a loja não libera cotação', async () => {
    for (const restaurant of [{}, { address: ' ', delivery_origin_lat: null, delivery_origin_lng: null }, { delivery_origin_lat: '', delivery_origin_lng: '' }]) {
        const { calculate, calls } = fixture(restaurant);
        await assert.rejects(calculate(), error => error.statusCode === 503 && /localização da loja/.test(error.message));
        assert.equal(calls.routes.length, 0);
    }
});
