
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function migrate() {
    const db = await open({
        filename: path.resolve(__dirname, 'apps/backend/src/database.sqlite'),
        driver: sqlite3.Database
    });

    console.log('Migrating database...');

    try {
        await db.exec("ALTER TABLE restaurants ADD COLUMN email TEXT");
        console.log('Added email column');
    } catch (e) {
        console.log('email column already exists or error:', e.message);
    }

    try {
        await db.exec("ALTER TABLE restaurants ADD COLUMN plan TEXT DEFAULT 'trial'");
        console.log('Added plan column');
    } catch (e) {
        console.log('plan column already exists or error:', e.message);
    }

    try {
        await db.exec("ALTER TABLE restaurants ADD COLUMN onboarding_step INTEGER DEFAULT 0");
        console.log('Added onboarding_step column');
    } catch (e) {
        console.log('onboarding_step column already exists or error:', e.message);
    }

    await db.close();
    console.log('Done!');
}

migrate().catch(console.error);
