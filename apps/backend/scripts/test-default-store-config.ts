import assert from 'node:assert/strict';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { Client } from 'pg';
import type { IDatabase } from '../src/db/db.types';
import { schemaStatements } from '../src/db/schema';
import { ensureMinimalSeed } from '../src/db/seeds/minimal.seed';
import { DEFAULT_STORE_CONFIG, backfillDefaultStoreConfig } from '../src/db/seeds/default-store-config';
import { defaultStoreConfigMigration } from '../src/db/postgres/migrations/006_default_store_config';
import { runPostgresMigrations } from '../src/db/postgres/migrator';

async function verify(db: IDatabase) {
    const row = () => db.get<any>('SELECT * FROM restaurants WHERE id = ?', ['default_tenant']);
    async function reset(patch: Record<string, unknown> = {}) {
        await db.run('DELETE FROM menu_items');
        await db.run('DELETE FROM restaurants');
        const fixture = { id: 'default_tenant', name: 'Loja teste', slug: 'default', phone: '11999999999',
            status: 'paused', store_status: 'closed', delivery_fee_cents: 777, ...patch };
        const keys = Object.keys(fixture);
        await db.run(`INSERT INTO restaurants (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`, Object.values(fixture));
    }
    const migrate = () => db.transaction(tx => defaultStoreConfigMigration.up(tx));

    await reset();
    await migrate();
    const filled = await row();
    for (const [key, value] of Object.entries(DEFAULT_STORE_CONFIG)) {
        if (typeof value === 'number') assert.ok(Math.abs(Number(filled[key]) - value) < 0.00001, key);
        else assert.equal(filled[key], value, key);
    }
    assert.equal(filled.status, 'paused');
    assert.equal(filled.store_status, 'closed');
    assert.equal(filled.delivery_fee_cents, 777);
    assert.equal((await db.get<any>('SELECT COUNT(*) AS total FROM menu_items'))!.total.toString(), '0');
    assert.equal(await db.transaction(backfillDefaultStoreConfig), 0);
    assert.deepEqual(await row(), filled);

    const custom = { phone: '11000000001', whatsapp: '11000000002', facebook_pixel_id: 'custom',
        address: 'Rua de outra loja, 50', city: 'Outra cidade', delivery_origin_lat: 0, delivery_origin_lng: 0 };
    await reset(custom);
    const before = await row();
    await migrate();
    assert.deepEqual(await row(), before);

    // Do not use the approved coordinates for a store with another address,
    // or complete half a coordinate pair with an unrelated location.
    for (const patch of [
        { address: 'Outro endereço', city: 'São Paulo' },
        { city: 'Outra cidade' },
        { delivery_origin_lat: 10 },
        { delivery_origin_lng: -10 },
        { delivery_origin_lat: 0, delivery_origin_lng: 0 },
    ]) {
        await reset(patch);
        const original = await row();
        await migrate();
        const result = await row();
        for (const key of ['address', 'city', 'delivery_origin_lat', 'delivery_origin_lng']) {
            assert.equal(result[key], original[key], key);
        }
    }

    await reset({ address: ' ', city: ' ', whatsapp: ' ', phone: ' ', facebook_pixel_id: ' ' });
    await migrate();
    assert.equal((await row()).address, DEFAULT_STORE_CONFIG.address);
    assert.equal((await row()).facebook_pixel_id, DEFAULT_STORE_CONFIG.facebook_pixel_id);

    for (const patch of [{ id: 'other_tenant' }, { slug: 'other-store' }]) {
        await reset(patch);
        const original = await db.all('SELECT * FROM restaurants');
        await migrate();
        assert.deepEqual(await db.all('SELECT * FROM restaurants'), original);
    }

    await db.run('DELETE FROM restaurants');
    await migrate();
    assert.equal((await db.all('SELECT * FROM restaurants')).length, 0);

    // Exercise both INSERT and UPDATE of the real seed. The second invocation
    // used to fail on PostgreSQL because the pixel value was a quoted identifier.
    await ensureMinimalSeed(db);
    const seeded = await row();
    await ensureMinimalSeed(db);
    assert.deepEqual(await row(), seeded);
    assert.equal((await db.get<any>('SELECT COUNT(*) AS total FROM menu_items'))!.total.toString(), '1');

    if (db.dialect === 'postgres') {
        await reset();
        await runPostgresMigrations(db, [defaultStoreConfigMigration]);
        await runPostgresMigrations(db, [defaultStoreConfigMigration]);
        assert.equal((await db.all('SELECT * FROM schema_migrations')).length, 1);
        assert.equal((await row()).address, DEFAULT_STORE_CONFIG.address);
    }
    console.log(`Configuração da loja (${db.dialect}): inserção, reexecução, migração, isolamento e preservação aprovados.`);
}

async function main() {
    const sqlite = await open({ filename: ':memory:', driver: sqlite3.Database });
    const db: IDatabase = {
        dialect: 'sqlite',
        exec: sql => sqlite.exec(sql),
        all: (sql, params = []) => sqlite.all(sql, params),
        get: (sql, params = []) => sqlite.get(sql, params),
        run: async (sql, params = []) => {
            const result = await sqlite.run(sql, params);
            return { lastID: result.lastID ?? null, changes: result.changes ?? 0 };
        },
        transaction: async fn => {
            await sqlite.exec('BEGIN');
            try { const result = await fn(db); await sqlite.exec('COMMIT'); return result; }
            catch (error) { await sqlite.exec('ROLLBACK'); throw error; }
        },
    };
    try {
        for (const sql of schemaStatements.slice(0, 2)) await db.exec(sql);
        await verify(db);
    } finally { await sqlite.close(); }

    // Never reads DATABASE_URL or .env. CI supplies an isolated Postgres service.
    // All relations are TEMP and disappear when this one connection closes.
    if (!process.env.TEST_POSTGRES_URL) return;
    const client = new Client({ connectionString: process.env.TEST_POSTGRES_URL });
    await client.connect();
    const query = (sql: string, params: any[] = []) => {
        let i = 0;
        return client.query(sql.replace(/\?/g, () => `$${++i}`), params);
    };
    const pg: IDatabase = {
        dialect: 'postgres',
        exec: async sql => { await query(sql); },
        all: async (sql, params) => (await query(sql, params)).rows,
        get: async (sql, params) => (await query(sql, params)).rows[0],
        run: async (sql, params) => ({ lastID: null, changes: (await query(sql, params)).rowCount ?? 0 }),
        transaction: async fn => {
            await query('BEGIN');
            try { const result = await fn(pg); await query('COMMIT'); return result; }
            catch (error) { await query('ROLLBACK'); throw error; }
        },
    };
    try {
        for (const sql of schemaStatements.slice(0, 2)) {
            await pg.exec(sql.replace('CREATE TABLE IF NOT EXISTS', 'CREATE TEMP TABLE').replace(/DATETIME/g, 'TIMESTAMPTZ'));
        }
        await pg.exec('CREATE TEMP TABLE schema_migrations (version TEXT PRIMARY KEY, name TEXT NOT NULL, applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)');
        await verify(pg);
    } finally { await client.end(); }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
