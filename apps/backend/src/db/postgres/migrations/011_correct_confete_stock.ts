import type { Migration } from '../migrator';

export const correctConfeteStockMigration: Migration = {
    version: '011',
    name: 'correct_confete_stock_three_packages',
    async up(db) {
        await db.run(
            'UPDATE inventory_items SET current_qty = 486, unit = \'g\', active = 1 WHERE restaurant_id = ? AND name = ?',
            ['default_tenant', 'CONFETE'],
        );
    },
};
