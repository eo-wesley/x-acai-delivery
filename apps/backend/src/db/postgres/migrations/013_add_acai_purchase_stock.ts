import type { Migration } from '../migrator';

export const addAcaiPurchaseStockMigration: Migration = {
    version: '013',
    name: 'add_three_acai_10l_boxes_2026_10_27',
    async up(db) {
        // Existing canonical profile: one 10 L box is represented as 9,000 g.
        await db.run(
            'UPDATE inventory_items SET current_qty = 27000, unit = \'g\', active = 1 WHERE restaurant_id = ? AND name = ?',
            ['default_tenant', 'AÇAÍ'],
        );
    },
};
