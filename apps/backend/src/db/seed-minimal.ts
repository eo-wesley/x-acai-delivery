import { getDb } from './db.client';
import { ensureMinimalSeed } from './seeds/minimal.seed';

async function runSeed() {
    console.log('🌱 Starting minimal seed...');
    try {
        const db = await getDb();
        await ensureMinimalSeed(db, { includeMenuItem: true });
        console.log('✅ Minimal seed completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Minimal seed failed:', error);
        process.exit(1);
    }
}

runSeed();
