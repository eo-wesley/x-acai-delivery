import { closeDatabase, getDb } from '../src/db/db.client';

async function main() {
    const db = await getDb();
    const tables = await db.all<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
    );
    const restaurants = await db.all(
        'SELECT id, name, slug, status, store_status FROM restaurants ORDER BY name'
    );
    const counts: Record<string, number> = {};

    for (const table of ['menu_items', 'inventory_items', 'recipes', 'recipe_items', 'users']) {
        if (tables.some(entry => entry.name === table)) {
            const row = await db.get<{ total: number }>(`SELECT COUNT(*) AS total FROM ${table}`);
            counts[table] = row?.total ?? 0;
        }
    }

    const menu = await db.all(
        'SELECT id, restaurant_id, name, price_cents, available FROM menu_items ORDER BY name LIMIT 20'
    );

    console.log(JSON.stringify({ restaurants, counts, menu }, null, 2));
    await closeDatabase();
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
