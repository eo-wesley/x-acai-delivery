import type { Migration } from '../migrator';

export const mergeAmendoimDuplicatesMigration: Migration = {
    version: '014',
    name: 'merge_amendoim_duplicate_inventory_items',
    async up(db) {
        const source = await db.get<{ id: string; current_qty: number }>(
            'SELECT id, current_qty FROM inventory_items WHERE restaurant_id = ? AND name = ?',
            ['default_tenant', 'AMENDOIM'],
        );
        const target = await db.get<{ id: string; current_qty: number }>(
            'SELECT id, current_qty FROM inventory_items WHERE restaurant_id = ? AND name = ?',
            ['default_tenant', 'AMENDOIM TORRADO GRANULADO'],
        );

        if (source && target) {
            await db.run(
                'UPDATE inventory_items SET current_qty = ?, active = 1 WHERE id = ? AND restaurant_id = ?',
                [(target.current_qty || 0) + (source.current_qty || 0), target.id, 'default_tenant'],
            );
            await db.run(
                'UPDATE inventory_items SET current_qty = 0, active = 0 WHERE id = ? AND restaurant_id = ?',
                [source.id, 'default_tenant'],
            );
        } else if (source && !target) {
            await db.run(
                'UPDATE inventory_items SET name = ?, active = 1 WHERE id = ? AND restaurant_id = ?',
                ['AMENDOIM TORRADO GRANULADO', source.id, 'default_tenant'],
            );
        }
    },
};
