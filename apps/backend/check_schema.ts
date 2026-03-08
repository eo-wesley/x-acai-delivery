import { getDb } from './src/db/db.client';

async function check() {
    try {
        const db = await getDb();
        const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
        console.log('Tables:', JSON.stringify(tables, null, 2));

        const orderCols = await db.all("PRAGMA table_info(orders)");
        console.log('Orders Columns:', JSON.stringify(orderCols, null, 2));

        const driverOrdersCols = await db.all("PRAGMA table_info(driver_orders)");
        console.log('Driver Orders Columns:', JSON.stringify(driverOrdersCols, null, 2));

        const driverCols = await db.all("PRAGMA table_info(drivers)");
        console.log('Drivers Columns:', JSON.stringify(driverCols, null, 2));

        const restaurantCols = await db.all("PRAGMA table_info(restaurants)");
        console.log('Restaurant Columns:', JSON.stringify(restaurantCols, null, 2));

    } catch (e) {
        console.error('Error:', e);
    }
}

check();
