import type { Migration } from '../migrator';

export const deliveryVerificationMigration: Migration = {
    version: '002',
    name: 'delivery_address_verification',
    async up(db) {
        const statements = [
            `ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS delivery_included_km REAL DEFAULT 3`,
            `ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS delivery_fee_per_km_cents INTEGER DEFAULT 150`,
            `ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS delivery_max_distance_km REAL DEFAULT 8`,
            `ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS delivery_origin_lat REAL`,
            `ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS delivery_origin_lng REAL`,
            `ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_cep TEXT`,
            `ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_street TEXT`,
            `ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_number TEXT`,
            `ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_complement TEXT`,
            `ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_neighborhood TEXT`,
            `ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_city TEXT`,
            `ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_state TEXT`,
            `ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_lat REAL`,
            `ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_lng REAL`,
            `ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_distance_km REAL`,
            `ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address_verified INTEGER DEFAULT 0`,
        ];

        for (const sql of statements) await db.exec(sql);
    },
};
