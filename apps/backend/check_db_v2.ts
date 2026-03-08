import { getDb } from './src/db/db.client';

async function check() {
    try {
        const db = await getDb();
        const tableInfo = await db.all("PRAGMA table_info(orders)");
        console.log('--- ORDERS TABLE SCHEMA ---');
        tableInfo.forEach(c => console.log(`${c.name} | ${c.type} | ${c.notnull ? 'NN' : 'NULL'} | ${c.dflt_value}`));

        const firstCust = await db.get("SELECT id FROM customers LIMIT 1");
        console.log('--- SAMPLE CUSTOMER ---', firstCust);
    } catch (e) {
        console.error(e);
    }
}

check();
