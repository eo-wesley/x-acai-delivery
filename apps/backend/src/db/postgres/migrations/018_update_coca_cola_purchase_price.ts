import type { Migration } from '../migrator';

export const updateCocaColaPurchasePriceMigration: Migration = {
    version: '018',
    name: 'update_coca_cola_purchase_price_449',
    async up(db) {
        await db.run(
            `UPDATE inventory_items SET
                unit = 'un', cost_cents = 449, purchase_price_cents = 449,
                purchase_quantity = 1, purchase_unit = 'un', yield_percent = 100,
                cost_evidence_state = 'informed', cost_updated_at = CURRENT_TIMESTAMP,
                active = 1
             WHERE restaurant_id = ? AND name = ?`,
            ['default_tenant', 'COCA-COLA'],
        );
    },
};
