import type { Migration } from '../migrator';

export const orderIdempotencyMigration: Migration = {
    version: '004',
    name: 'order_idempotency',
    async up(db) {
        await db.exec('ALTER TABLE orders ADD COLUMN IF NOT EXISTS idempotency_key TEXT');
        await db.exec('ALTER TABLE orders ADD COLUMN IF NOT EXISTS request_fingerprint TEXT');
        await db.exec(`
            CREATE UNIQUE INDEX IF NOT EXISTS orders_restaurant_idempotency_uidx
            ON orders (restaurant_id, idempotency_key)
            WHERE idempotency_key IS NOT NULL
        `);
    },
};
