import type { IDatabase } from '../db.types';

// Approved store settings recorded on 2026-10-24. Apply only to the canonical
// default store; never use these as defaults for another tenant.
export const DEFAULT_STORE_CONFIG = {
    phone: '11987470862',
    whatsapp: '11987470862',
    address: 'Avenida Jornalista Roberto Marinho, 3610',
    city: 'São Paulo',
    delivery_origin_lat: -23.6145544,
    delivery_origin_lng: -46.6924344,
    facebook_pixel_id: '1312828416414575',
} as const;

type StoreConfig = { id: string; slug: string } & {
    [K in keyof typeof DEFAULT_STORE_CONFIG]?: string | number | null;
};

function missing(value: unknown): boolean {
    return value == null || (typeof value === 'string' && value.trim() === '');
}

function normalized(value: unknown): string {
    return String(value ?? '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

// Called inside the migration transaction. Custom values, prices, fees, order
// state and other tenants remain untouched. A partial coordinate pair is left
// for explicit correction instead of mixing two different locations.
export async function backfillDefaultStoreConfig(db: IDatabase): Promise<number> {
    const store = await db.get<StoreConfig>(
        `SELECT id, slug, phone, whatsapp, address, city, delivery_origin_lat,
                delivery_origin_lng, facebook_pixel_id
         FROM restaurants WHERE id = ? AND slug = ?${db.dialect === 'postgres' ? ' FOR UPDATE' : ''}`,
        ['default_tenant', 'default'],
    );
    if (!store) return 0;

    const patch: Partial<Record<keyof typeof DEFAULT_STORE_CONFIG, string | number>> = {};
    for (const field of ['phone', 'whatsapp', 'facebook_pixel_id'] as const) {
        if (missing(store[field]) || (field !== 'facebook_pixel_id' && store[field] === '11999999999')) {
            patch[field] = DEFAULT_STORE_CONFIG[field];
        }
    }

    const canonicalAddress = missing(store.address)
        || normalized(store.address) === normalized(DEFAULT_STORE_CONFIG.address);
    const canonicalCity = missing(store.city)
        || normalized(store.city) === normalized(DEFAULT_STORE_CONFIG.city);
    const noCoordinates = missing(store.delivery_origin_lat) && missing(store.delivery_origin_lng);
    const canonicalCoordinates = !missing(store.delivery_origin_lat) && !missing(store.delivery_origin_lng)
        && Math.abs(Number(store.delivery_origin_lat) - DEFAULT_STORE_CONFIG.delivery_origin_lat) < 0.00001
        && Math.abs(Number(store.delivery_origin_lng) - DEFAULT_STORE_CONFIG.delivery_origin_lng) < 0.00001;

    if (canonicalAddress && canonicalCity && (noCoordinates || canonicalCoordinates)) {
        if (missing(store.address)) patch.address = DEFAULT_STORE_CONFIG.address;
        if (missing(store.city)) patch.city = DEFAULT_STORE_CONFIG.city;
        if (noCoordinates) {
            patch.delivery_origin_lat = DEFAULT_STORE_CONFIG.delivery_origin_lat;
            patch.delivery_origin_lng = DEFAULT_STORE_CONFIG.delivery_origin_lng;
        }
    }

    const fields = Object.keys(patch) as Array<keyof typeof DEFAULT_STORE_CONFIG>;
    if (!fields.length) return 0;
    const result = await db.run(
        `UPDATE restaurants SET ${fields.map(field => `${field} = ?`).join(', ')} WHERE id = ? AND slug = ?`,
        [...fields.map(field => patch[field]), 'default_tenant', 'default'],
    );
    return result.changes;
}
