import type { IDatabase } from '../db.types';
import { DEFAULT_STORE_CONFIG, backfillDefaultStoreConfig } from './default-store-config';

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
                whatsapp,
                address,
                city,
                delivery_origin_lat,
                delivery_origin_lng,
                status,
                store_status,
                primary_color,
                secondary_color,
                delivery_fee_cents,
                delivery_included_km,
                delivery_fee_per_km_cents,
                delivery_max_distance_km,
                prep_time_minutes,
                facebook_pixel_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                DEFAULT_TENANT_ID,
                'X-Açaí Delivery',
                'default',
                DEFAULT_STORE_CONFIG.phone,
                DEFAULT_STORE_CONFIG.whatsapp,
                DEFAULT_STORE_CONFIG.address,
                DEFAULT_STORE_CONFIG.city,
                DEFAULT_STORE_CONFIG.delivery_origin_lat,
                DEFAULT_STORE_CONFIG.delivery_origin_lng,
                'active',
                'open',
                '#9333ea',
                '#ffffff',
                500,
                3,
                150,
                8,
                25,
                DEFAULT_STORE_CONFIG.facebook_pixel_id,
            ]
        );
        console.log('[DB Seed] Default restaurant ensured.');
    } else {
        await db.run(
            `UPDATE restaurants
             SET status = COALESCE(status, 'active'),
                 store_status = COALESCE(store_status, 'open'),
                 delivery_fee_cents = COALESCE(delivery_fee_cents, 500),
                 delivery_included_km = COALESCE(delivery_included_km, 3),
                 delivery_fee_per_km_cents = COALESCE(delivery_fee_per_km_cents, 150),
                 delivery_max_distance_km = COALESCE(delivery_max_distance_km, 8)
             WHERE id = ?`,
            [DEFAULT_TENANT_ID]
        );
        await db.transaction(tx => backfillDefaultStoreConfig(tx));
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
