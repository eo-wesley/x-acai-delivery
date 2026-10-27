import type { Migration } from '../migrator';

type SeedItem = {
    name: string;
    priceCents: number;
    quantity: number;
    unit: 'g' | 'un';
    evidence: 'invoice' | 'informed';
};

// Canonical costs transcribed from outputs/acai_90_dias/tratados/precos_insumos_vigentes.csv.
// Values remain purchase profiles; current stock is intentionally zero until a real count is entered.
const seedItems: SeedItem[] = ([
    ['KIT-KAT', 400, 1, 'un', 'informed'], ['GUARDANAPO PEROLA 29.5X30', 500, 100, 'un', 'invoice'],
    ['SACO 20X30', 4000, 500, 'un', 'informed'], ['SACO 40X60', 4000, 200, 'un', 'informed'],
    ['AÇAÍ', 15152, 9000, 'g', 'invoice'], ['ÁGUA MINERAL CRYSTAL SEM GÁS 500ML', 199, 1, 'un', 'invoice'],
    ['AVEIA', 685, 1000, 'g', 'invoice'], ['BANANA', 398, 1000, 'g', 'invoice'],
    ['BARCA P ORIENTAL GO-935', 1350, 5, 'un', 'invoice'], ['BIS CHOCOLATE AO LEITE', 699, 100.8, 'g', 'invoice'],
    ['COBERTURA DE CARAMELO', 1299, 1000, 'g', 'invoice'], ['COBERTURA DE CHOCOLATE', 1790, 1000, 'g', 'invoice'],
    ['COBERTURA DE MORANGO', 1290, 1000, 'g', 'invoice'], ['COBERTURA FINI BEIJOS', 2690, 1000, 'g', 'invoice'],
    ['COPO 400ML', 1500, 50, 'un', 'invoice'], ['COPO 500ML', 1900, 50, 'un', 'invoice'],
    ['COPO 700ML', 1700, 25, 'un', 'invoice'], ['CREME DE AMENDOIM', 2259, 1000, 'g', 'invoice'],
    ['CREME DE AVELÃ', 17500, 4000, 'g', 'informed'], ['CREME DE LEITINHO', 4189, 1000, 'g', 'invoice'],
    ['CREME DE MORANGO', 4100, 1000, 'g', 'informed'], ['GRANOLA', 1575, 1000, 'g', 'invoice'],
    ['LEITE CONDENSADO', 599, 395, 'g', 'invoice'], ['LEITE EM PÓ', 3600, 1000, 'g', 'invoice'],
    ['MORANGO', 4000, 1000, 'g', 'informed'], ['NUTELLA', 4379, 650, 'g', 'invoice'],
    ['OVOMALTINE', 4159, 750, 'g', 'invoice'], ['PACOCA', 2490, 1170, 'g', 'invoice'],
    ['POTE 1000ML', 2700, 25, 'un', 'invoice'], ['OURO BRANCO', 5799, 50, 'un', 'informed'],
    ['AMENDOIM TORRADO GRANULADO', 1899, 1000, 'g', 'informed'], ['CEREAL BALL CHOCOLATE', 1949, 500, 'g', 'informed'],
    ['CEREAL BALL MESCLADO', 1949, 500, 'g', 'informed'], ['EMBALAGEM ROLETA G-550', 3650, 10, 'un', 'invoice'],
].map(([name, priceCents, quantity, unit, evidence]) => ({ name, priceCents, quantity, unit, evidence })) as SeedItem[]);

export const inventorySeedMigration: Migration = {
    version: '008',
    name: 'seed_default_inventory_cost_profiles',
    async up(db) {
        for (const item of seedItems) {
            const existing = await db.get<{ id: string }>(
                'SELECT id FROM inventory_items WHERE restaurant_id = ? AND name = ?',
                ['default_tenant', item.name],
            );
            const id = existing?.id || `seed-inventory-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
            const unitCostCents = Math.max(1, Math.round(item.priceCents / item.quantity));
            await db.run(
                `INSERT INTO inventory_items (
                    id, restaurant_id, name, unit, current_qty, min_qty, min_stock,
                    cost_cents, purchase_price_cents, purchase_quantity, purchase_unit,
                    yield_percent, cost_evidence_state, cost_updated_at, active
                ) VALUES (?, ?, ?, ?, 0, 0, 0, ?, ?, ?, ?, 100, ?, CURRENT_TIMESTAMP, 1)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    unit = EXCLUDED.unit,
                    cost_cents = EXCLUDED.cost_cents,
                    purchase_price_cents = EXCLUDED.purchase_price_cents,
                    purchase_quantity = EXCLUDED.purchase_quantity,
                    purchase_unit = EXCLUDED.purchase_unit,
                    yield_percent = EXCLUDED.yield_percent,
                    cost_evidence_state = EXCLUDED.cost_evidence_state,
                    cost_updated_at = EXCLUDED.cost_updated_at,
                    active = 1`,
                [id, 'default_tenant', item.name, item.unit, unitCostCents, item.priceCents, item.quantity, item.unit, item.evidence],
            );
        }
    },
};
