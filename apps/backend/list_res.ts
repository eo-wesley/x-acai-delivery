
import { getDb } from './src/db/db.client';

async function listRestaurants() {
    const db = await getDb();
    const rows = await db.all('SELECT id, slug, name FROM restaurants');
    console.log('--- restaurants content ---');
    console.table(rows);
    process.exit(0);
}
listRestaurants();
