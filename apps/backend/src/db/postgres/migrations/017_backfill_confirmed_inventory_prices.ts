import type { Migration } from '../migrator';

type ConfirmedCost = {
    name: string;
    priceCents: number;
    quantity: number;
    unit: 'g' | 'un';
};

// Values already confirmed in the X-Açaí pricing history. Selling prices are
// intentionally not used as purchase costs.
const confirmedCosts: ConfirmedCost[] = [
    { name: 'CREME DE BUENO', priceCents: 4200, quantity: 1000, unit: 'g' },
    { name: 'GRANULADO', priceCents: 3000, quantity: 1000, unit: 'g' },
    { name: 'GRANULADO COLORIDO', priceCents: 3000, quantity: 1000, unit: 'g' },
    { name: 'PEPSI', priceCents: 340, quantity: 1, unit: 'un' },
    { name: 'ÁGUA COM GÁS', priceCents: 250, quantity: 1, unit: 'un' },
    { name: 'COPO 300ML', priceCents: 18, quantity: 1, unit: 'un' },
];

export const backfillConfirmedInventoryPricesMigration: Migration = {
    version: '017',
    name: 'backfill_confirmed_inventory_purchase_prices',
    async up(db) {
        for (const item of confirmedCosts) {
            await db.run(
                `UPDATE inventory_items SET
                    unit = ?, cost_cents = ?, purchase_price_cents = ?, purchase_quantity = ?,
                    purchase_unit = ?, yield_percent = 100, cost_evidence_state = 'informed',
                    cost_updated_at = CURRENT_TIMESTAMP, active = 1
                 WHERE restaurant_id = ? AND name = ?`,
                [
                    item.unit,
                    Math.max(1, Math.round(item.priceCents / item.quantity)),
                    item.priceCents,
                    item.quantity,
                    item.unit,
                    'default_tenant',
                    item.name,
                ],
            );
        }
    },
};
