import { setupDatabase, getDb } from '../src/db/db.client';
import fs from 'fs';
import path from 'path';

async function seed() {
    console.log('🌱 Starting DB seeding process...');

    // 1. Ensure tables exist
    await setupDatabase();
    const db = await getDb();

    // 2. Read JSON Seed
    const seedPath = path.resolve(__dirname, '../data/seed/menu.seed.json');
    if (!fs.existsSync(seedPath)) {
        console.error('❌ menu.seed.json not found!');
        process.exit(1);
    }
    const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

    // 3. Prevent Duplicates (Clean older rows)
    await db.exec('DELETE FROM menu_items');

    // 4. Insert rows
    let count = 0;
    for (const item of seedData) {
        await db.run(
            `INSERT INTO menu_items (id, name, description, price_cents, category, tags, available, image_url)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                item.id,
                item.name,
                item.description || null,
                item.price_cents,
                item.category,
                JSON.stringify(item.tags || []),
                item.available ? 1 : 0,
                item.image_url || null
            ]
        );
        count++;
    }

    console.log(`✅ Seeding complete. Inserted ${count} menu items into 'menu_items' table.`);
}

seed().catch(err => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
});
