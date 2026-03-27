import { setupDatabase } from './db.client';
import { logger } from '../core/logger';

async function runMigration() {
    console.log('🚀 Starting production migration...');
    try {
        await setupDatabase();
        console.log('✅ Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
