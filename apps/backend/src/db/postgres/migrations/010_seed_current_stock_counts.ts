import type { Migration } from '../migrator';

type StockItem = { name: string; qty: number; unit: 'g' | 'un' };

// Physical count supplied by the owner on 2026-10-27. Quantities are the
// observed usable balance; package counts remain in the source note.
const stock: StockItem[] = [
    { name: 'CONFETE', qty: 162, unit: 'g' },
    { name: 'OVOMALTINE', qty: 134, unit: 'g' },
    { name: 'AMENDOIM', qty: 370, unit: 'g' },
    { name: 'CEREAL BALL MESCLADO', qty: 281, unit: 'g' },
    { name: 'GRANULADO', qty: 413, unit: 'g' },
    { name: 'AVEIA', qty: 502, unit: 'g' },
    { name: 'GRANOLA', qty: 412, unit: 'g' },
    { name: 'GOTAS DE CHOCOLATE', qty: 1068, unit: 'g' },
    { name: 'GRANULADO COLORIDO', qty: 1236, unit: 'g' },
    { name: 'CEREAL BALL CHOCOLATE', qty: 654, unit: 'g' },
    { name: 'LEITE EM PÓ', qty: 917, unit: 'g' },
    { name: 'PACOCA', qty: 674, unit: 'g' },
    { name: 'CREME DE MORANGO', qty: 66, unit: 'g' },
    { name: 'CREME DE BUENO', qty: 280, unit: 'g' },
    { name: 'CREME DE AMENDOIM', qty: 813, unit: 'g' },
    { name: 'CREME DE LEITINHO', qty: 572, unit: 'g' },
    { name: 'CREME DE AVELÃ', qty: 511, unit: 'g' },
    { name: 'COBERTURA FINI BEIJOS', qty: 470, unit: 'g' },
    { name: 'COBERTURA FINI DENTADURAS', qty: 106, unit: 'g' },
    { name: 'COBERTURA DE MORANGO', qty: 412, unit: 'g' },
    { name: 'COBERTURA DE CHOCOLATE', qty: 1353, unit: 'g' },
    { name: 'COBERTURA DE CARAMELO', qty: 608, unit: 'g' },
    { name: 'LEITE CONDENSADO', qty: 9875, unit: 'g' },
    { name: 'NUTELLA', qty: 748, unit: 'g' },
    { name: 'OURO BRANCO', qty: 11, unit: 'un' },
    { name: 'KIT-KAT', qty: 1, unit: 'un' },
    { name: 'BIS CHOCOLATE AO LEITE', qty: 8, unit: 'un' },
    { name: 'COCA-COLA', qty: 10, unit: 'un' },
    { name: 'PEPSI', qty: 5, unit: 'un' },
    { name: 'ÁGUA COM GÁS', qty: 7, unit: 'un' },
    { name: 'ÁGUA SEM GÁS', qty: 16, unit: 'un' },
    { name: 'POTE 1000ML', qty: 13, unit: 'un' },
    { name: 'COPO 700ML', qty: 28, unit: 'un' },
    { name: 'COPO 400ML', qty: 36, unit: 'un' },
    { name: 'COPO 300ML', qty: 16, unit: 'un' },
    { name: 'COPO 500ML', qty: 36, unit: 'un' },
    { name: 'EMBALAGEM ROLETA G-550', qty: 20, unit: 'un' },
];

export const currentStockCountsMigration: Migration = {
    version: '010',
    name: 'seed_current_stock_counts_2026_10_27',
    async up(db) {
        for (const item of stock) {
            const existing = await db.get<{ id: string }>(
                'SELECT id FROM inventory_items WHERE restaurant_id = ? AND name = ?',
                ['default_tenant', item.name],
            );
            if (existing) {
                await db.run(
                    'UPDATE inventory_items SET current_qty = ?, unit = ?, active = 1 WHERE id = ? AND restaurant_id = ?',
                    [item.qty, item.unit, existing.id, 'default_tenant'],
                );
            } else {
                const id = `stock-inventory-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
                await db.run(
                    `INSERT INTO inventory_items (
                        id, restaurant_id, name, unit, current_qty, min_qty, min_stock,
                        cost_cents, yield_percent, cost_evidence_state, active
                    ) VALUES (?, ?, ?, ?, ?, 0, 0, 0, 100, 'unvalidated', 1)`,
                    [id, 'default_tenant', item.name, item.unit, item.qty],
                );
            }
        }
    },
};
