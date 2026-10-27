import type { Migration } from '../migrator';

export const updateBananaPurchaseMigration: Migration = {
    version: '015',
    name: 'update_banana_purchase_1840g_2026_10_27',
    async up(db) {
        await db.run(
            `UPDATE inventory_items SET
                current_qty = 1840,
                unit = 'g',
                cost_cents = 1,
                purchase_price_cents = 1200,
                purchase_quantity = 1840,
                purchase_unit = 'g',
                yield_percent = 100,
                cost_evidence_state = 'invoice',
                cost_updated_at = CURRENT_TIMESTAMP,
                active = 1
             WHERE restaurant_id = ? AND name = ?`,
            ['default_tenant', 'BANANA'],
        );
    },
};
