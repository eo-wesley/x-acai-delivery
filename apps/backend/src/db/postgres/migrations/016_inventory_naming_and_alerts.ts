import type { Migration } from '../migrator';

/**
 * Keeps the owner's inventory terminology canonical and prevents an item from
 * being duplicated when an equivalent name was entered manually.
 */
export const inventoryNamingAndAlertsMigration: Migration = {
    version: '016',
    name: 'normalize_inventory_names_and_expense_category',
    async up(db) {
        const target = await db.get<{ id: string; current_qty: number }>(
            'SELECT id, current_qty FROM inventory_items WHERE restaurant_id = ? AND name = ?',
            ['default_tenant', 'AMENDOIM TORRADO GRANULADO'],
        );
        const duplicates = await db.all<{ id: string; current_qty: number }>(
            'SELECT id, current_qty FROM inventory_items WHERE restaurant_id = ? AND name = ? AND active = 1',
            ['default_tenant', 'AMENDOIM'],
        );

        if (target && duplicates.length > 0) {
            const transferredQty = duplicates.reduce((sum, item) => sum + Number(item.current_qty || 0), 0);
            await db.run(
                'UPDATE inventory_items SET current_qty = ?, active = 1 WHERE id = ? AND restaurant_id = ?',
                [Number(target.current_qty || 0) + transferredQty, target.id, 'default_tenant'],
            );
            for (const duplicate of duplicates) {
                await db.run(
                    'UPDATE inventory_items SET current_qty = 0, active = 0 WHERE id = ? AND restaurant_id = ?',
                    [duplicate.id, 'default_tenant'],
                );
            }
        }

        // This is a small operating expense, not a recipe ingredient.
        await db.run(
            `UPDATE inventory_items
             SET name = ?, category = ?, active = 1
             WHERE restaurant_id = ? AND (name = ? OR name = ?)`,
            ['BISNAGUINHA PARA KETCHUP', 'DESPESAS VARIADAS', 'default_tenant', 'BISNAGUINHA PARA CREMES', 'BISNAGUINHA PARA KETCHUP'],
        );
    },
};
