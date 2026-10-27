import type { Migration } from '../migrator';

type ReceiptItem = {
    name: string;
    priceCents: number;
    quantity: number;
    unit: 'g' | 'un';
};

const receiptItems: ReceiptItem[] = [
    { name: 'CEREAL BALL MESCLADO', priceCents: 2099, quantity: 500, unit: 'g' },
    { name: 'CEREAL BALL CHOCOLATE', priceCents: 2099, quantity: 500, unit: 'g' },
    { name: 'CREME DE MORANGO', priceCents: 4349, quantity: 1000, unit: 'g' },
    { name: 'GOTAS DE CHOCOLATE', priceCents: 3499, quantity: 1000, unit: 'g' },
    { name: 'OVOMALTINE', priceCents: 3989, quantity: 750, unit: 'g' },
    { name: 'CONFETE', priceCents: 1699, quantity: 500, unit: 'g' },
    { name: 'BISNAGUINHA PARA CREMES', priceCents: 2879, quantity: 1, unit: 'un' },
];

export const receiptCostProfilesMigration: Migration = {
    version: '009',
    name: 'update_cost_profiles_from_2026_10_27_receipt',
    async up(db) {
        for (const item of receiptItems) {
            const existing = await db.get<{ id: string }>(
                'SELECT id FROM inventory_items WHERE restaurant_id = ? AND name = ?',
                ['default_tenant', item.name],
            );
            const id = existing?.id || `receipt-inventory-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
            const unitCostCents = Math.max(1, Math.round(item.priceCents / item.quantity));

            if (existing) {
                await db.run(
                    `UPDATE inventory_items SET
                        unit = ?, cost_cents = ?, purchase_price_cents = ?, purchase_quantity = ?,
                        purchase_unit = ?, yield_percent = 100, cost_evidence_state = 'invoice',
                        cost_updated_at = CURRENT_TIMESTAMP, active = 1
                     WHERE id = ? AND restaurant_id = ?`,
                    [item.unit, unitCostCents, item.priceCents, item.quantity, item.unit, id, 'default_tenant'],
                );
            } else {
                await db.run(
                    `INSERT INTO inventory_items (
                        id, restaurant_id, name, unit, current_qty, min_qty, min_stock,
                        cost_cents, purchase_price_cents, purchase_quantity, purchase_unit,
                        yield_percent, cost_evidence_state, cost_updated_at, active
                    ) VALUES (?, ?, ?, ?, 0, 0, 0, ?, ?, ?, ?, 100, 'invoice', CURRENT_TIMESTAMP, 1)`,
                    [id, 'default_tenant', item.name, item.unit, unitCostCents, item.priceCents, item.quantity, item.unit],
                );
            }
        }
    },
};
