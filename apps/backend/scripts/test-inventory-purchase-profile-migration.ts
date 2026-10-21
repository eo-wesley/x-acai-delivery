import assert from 'node:assert/strict';
import { inventoryPurchaseProfilesMigration } from '../src/db/postgres/migrations/003_inventory_purchase_profiles';

const statements: string[] = [];
const fakeDb = {
    dialect: 'postgres' as const,
    async exec(sql: string) { statements.push(sql); },
    async run() { return { changes: 0 }; },
    async get() { return undefined; },
    async all() { return []; },
    async transaction<T>(work: (db: typeof fakeDb) => Promise<T>) { return work(fakeDb); }
};

async function main() {
    await inventoryPurchaseProfilesMigration.up(fakeDb);

    assert.equal(inventoryPurchaseProfilesMigration.version, '003');
    assert.equal(statements.length, 6);
    assert.ok(statements.some(sql => sql.includes('purchase_price_cents')));
    assert.ok(statements.some(sql => sql.includes('purchase_quantity')));
    assert.ok(statements.some(sql => sql.includes('yield_percent')));
    assert.ok(statements.some(sql => sql.includes('cost_evidence_state')));
    assert.ok(statements.every(sql => sql.includes('IF NOT EXISTS')));

    console.log('Migração de perfis de compra: 7 verificações aprovadas.');
}

void main();
