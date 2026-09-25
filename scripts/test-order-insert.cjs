// Executa o repositório real apenas em SQLite :memory:, sem API, pagamento ou banco da loja.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { DatabaseSync } = require('node:sqlite');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');
const frontendRequire = createRequire(path.join(root, 'apps/frontend/package.json'));
const ts = frontendRequire('typescript');

function loadBackendSource(relativePath, mocks = {}) {
    const source = fs.readFileSync(path.join(root, 'apps/backend/src', relativePath), 'utf8');
    const code = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    const module = { exports: {} };
    new Function('require', 'module', 'exports', code)(name => {
        if (Object.hasOwn(mocks, name)) return mocks[name];
        if (name === 'crypto') return require('node:crypto');
        throw new Error(`Dependência não isolada no teste: ${name}`);
    }, module, module.exports);
    return module.exports;
}

const { schemaStatements } = loadBackendSource('db/schema.ts');
const selectedOptions = [
    { groupId: 'mass', groupName: 'Vai o quê?', optionId: 'cupuacu', optionName: 'Cupuaçu', price_cents: 500 },
    { groupId: 'complements', groupName: 'Complementos', optionId: 'banana', optionName: 'Banana', price_cents: 0 },
    { groupId: 'addons', groupName: 'Adicionais pagos', optionId: 'milk', optionName: 'Leite em pó', price_cents: 300 },
    { groupId: 'addons', groupName: 'Adicionais pagos', optionId: 'milk', optionName: 'Leite em pó', price_cents: 300 },
    { groupId: 'drink', groupName: 'Vai uma Bebida?', optionId: 'water', optionName: 'Água', price_cents: 400 },
    { groupId: 'spoon', groupName: 'Colher', optionId: 'yes', optionName: 'Sim', price_cents: 0 },
];

function createFixture(t) {
    const sqlite = new DatabaseSync(':memory:');
    t.after(() => sqlite.close());
    for (const table of ['orders', 'order_events']) {
        const statement = schemaStatements.find(sql => sql.startsWith(`CREATE TABLE IF NOT EXISTS ${table} (`));
        assert.ok(statement, `Schema real de ${table}`);
        sqlite.exec(statement);
    }
    const db = {
        async run(sql, params = []) { return sqlite.prepare(sql).run(...params); },
        async get(sql, params = []) { return sqlite.prepare(sql).get(...params); },
    };
    const crmCalls = [];
    const inventoryCalls = [];
    const { OrdersRepo } = loadBackendSource('db/repositories/orders.repo.ts', {
        '../db.client': { getDb: async () => db },
        './customers.repo': { customersRepo: {
            async upsertCustomer(tenantId, customer) {
                crmCalls.push({ tenantId, customer });
                return 'customer-test';
            },
            async registerOrderStats(tenantId, customerId, totalCents) {
                crmCalls.push({ tenantId, customerId, totalCents });
            },
        } },
        './recipes.repo': { recipesRepo: {
            async getRecipeForMenuItem() {
                return { items: [{ inventory_item_id: 'base-test', qty: 0.3 }] };
            },
        } },
        './inventory.repo': { inventoryRepo: {
            async recordMovement(...args) { inventoryCalls.push(args); },
        } },
    });
    const input = {
        customerId: 'browser-customer', restaurantId: 'tenant-test',
        customerName: 'Cliente de teste', customerPhone: '11900000000',
        items: [{ menuItemId: 'cup-test', qty: 2, notes: 'Teste isolado', unitPriceCents: 4590, selected_options: selectedOptions }],
        subtotalCents: 9180, deliveryFeeCents: 0, totalCents: 9180,
        addressText: 'Retirada no Balcão (Loja)', notes: 'Não enviar', paymentMethod: 'cash',
        taxId: '00000000000',
    };
    return { sqlite, repo: new OrdersRepo(), input, crmCalls, inventoryCalls };
}

for (const delivery of [false, true]) {
    test(`createOrder grava ${delivery ? 'entrega com endereço validado' : 'retirada'} e preserva opções`, async t => {
        const { sqlite, repo, input, crmCalls, inventoryCalls } = createFixture(t);
        if (delivery) {
            input.deliveryFeeCents = 700;
            input.totalCents += 700;
            input.addressText = 'Rua de Teste, 100 - Bairro de Teste';
            input.deliveryAddress = {
                cep: '04500000', street: 'Rua de Teste', number: '100', complement: 'Apto 2',
                neighborhood: 'Bairro de Teste', city: 'São Paulo', state: 'SP',
                latitude: -23.6, longitude: -46.65, distanceKm: 4.2, feeCents: 700,
            };
        }
        const result = await repo.createOrder(input);
        const row = sqlite.prepare('SELECT * FROM orders WHERE id = ?').get(result.id);
        assert.equal(result.customer_id, 'customer-test');
        assert.equal(row.restaurant_id, 'tenant-test');
        assert.equal(row.customer_id, 'customer-test');
        assert.equal(row.status, 'pending_payment');
        assert.equal(row.payment_method, 'cash');
        assert.equal(row.subtotal_cents, input.subtotalCents);
        assert.equal(row.delivery_fee_cents, input.deliveryFeeCents);
        assert.equal(row.total_cents, input.totalCents);
        assert.equal(row.address_text, input.addressText);
        assert.equal(row.notes, input.notes);
        assert.equal(row.tax_id, input.taxId);
        assert.deepEqual(JSON.parse(row.items), input.items);
        assert.deepEqual(JSON.parse(row.items)[0].selected_options, selectedOptions);
        assert.equal(row.delivery_address_verified, Number(delivery));
        const fields = {
            delivery_cep: 'cep', delivery_street: 'street', delivery_number: 'number',
            delivery_complement: 'complement', delivery_neighborhood: 'neighborhood',
            delivery_city: 'city', delivery_state: 'state', delivery_lat: 'latitude',
            delivery_lng: 'longitude', delivery_distance_km: 'distanceKm',
        };
        for (const [column, key] of Object.entries(fields)) {
            assert.equal(row[column], delivery ? input.deliveryAddress[key] : null, column);
        }
        const event = sqlite.prepare('SELECT * FROM order_events WHERE order_id = ?').get(result.id);
        assert.equal(event.type, 'order_created');
        assert.equal(JSON.parse(event.payload).initialStatus, 'pending_payment');
        assert.equal(crmCalls.length, 2);
        assert.equal(crmCalls[1].totalCents, input.totalCents);
        assert.equal(inventoryCalls.length, 1);
        assert.equal(inventoryCalls[0][3], 0.6);
        assert.equal(inventoryCalls[0][5], result.id);
    });
}
