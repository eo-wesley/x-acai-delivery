import type { Migration } from '../migrator';

export const inventoryPurchaseProfilesMigration: Migration = {
    version: '003',
    name: 'inventory_purchase_profiles',
    async up(db) {
        const statements = [
            `ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS purchase_price_cents INTEGER`,
            `ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS purchase_quantity REAL`,
            `ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS purchase_unit TEXT`,
            `ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS yield_percent REAL DEFAULT 100`,
            `ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS cost_evidence_state TEXT DEFAULT 'unvalidated'`,
            `ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS cost_updated_at TIMESTAMPTZ`,
        ];

        for (const sql of statements) await db.exec(sql);
    },
};
