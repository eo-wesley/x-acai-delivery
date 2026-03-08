
import { getDb } from './src/db/db.client';

async function checkSchema() {
    const db = await getDb();
    console.log('--- option_groups columns ---');
    const cols = await db.all('PRAGMA table_info(option_groups)');
    console.log(cols.map(c => c.name));

    console.log('\n--- restaurants columns ---');
    const resCols = await db.all('PRAGMA table_info(restaurants)');
    console.log(resCols.map(c => c.name));
    process.exit(0);
}
checkSchema();
