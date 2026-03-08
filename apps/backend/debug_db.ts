
import { getDb } from './src/db/db.client';

async function listAll() {
    const db = await getDb();
    console.log('--- restaurants ---');
    console.log(JSON.stringify(await db.all('SELECT * FROM restaurants'), null, 2));

    console.log('\n--- option_groups schema ---');
    console.log(JSON.stringify(await db.all('PRAGMA table_info(option_groups)'), null, 2));
    process.exit(0);
}
listAll();
