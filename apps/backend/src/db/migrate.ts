import { getDatabaseDialect, migrateDatabase } from './db.client';

async function runMigration() {
    console.log(`🚀 Starting database migration (${getDatabaseDialect()})...`);
    try {
        await migrateDatabase();
        console.log('✅ Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
