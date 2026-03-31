import type { IDatabase } from '../db.types';

const DEFAULT_TENANT_ID = 'default_tenant';
const DEFAULT_MENU_ITEM_ID = 'seed_menu_acai_classico';

export async function ensureMinimalSeed(db: IDatabase, options: { includeMenuItem?: boolean } = {}): Promise<void> {
    const includeMenuItem = options.includeMenuItem !== false;

    const existingRestaurant = await db.get<{ id: string }>(
        'SELECT id FROM restaurants WHERE id = ?',
        [DEFAULT_TENANT_ID]
    );

    if (!existingRestaurant) {
        await db.run(
            `INSERT INTO restaurants (
                id,
                name,
                slug,
                phone,
                status,
                store_status,
                primary_color,
                secondary_color,
                delivery_fee_cents,
                prep_time_minutes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                DEFAULT_TENANT_ID,
                'X-Açaí Delivery',
                'default',
                '11999999999',
                'active',
                'open',
                '#9333ea',
                '#ffffff',
                500,
                25,
            ]
        );
        console.log('[DB Seed] Default restaurant ensured.');
    } else {
        await db.run(
            `UPDATE restaurants
             SET status = COALESCE(status, 'active'),
                 store_status = COALESCE(store_status, 'open')
             WHERE id = ?`,
            [DEFAULT_TENANT_ID]
        );
    }

    if (!includeMenuItem) {
        return;
    }

    const existingMenuItem = await db.get<{ id: string }>(
        'SELECT id FROM menu_items WHERE id = ?',
        [DEFAULT_MENU_ITEM_ID]
    );

    if (!existingMenuItem) {
        await db.run(
            `INSERT INTO menu_items (
                id,
                restaurant_id,
                name,
                description,
                price_cents,
                category,
                tags,
                available,
                sort_order
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                DEFAULT_MENU_ITEM_ID,
                DEFAULT_TENANT_ID,
                'Açaí Clássico 300ml',
                'Item mínimo para smoke test de staging',
                1990,
                'Açaí',
                JSON.stringify(['seed', 'staging']),
                1,
                0,
            ]
        );
        console.log('[DB Seed] Minimal menu item ensured.');
    }
}
