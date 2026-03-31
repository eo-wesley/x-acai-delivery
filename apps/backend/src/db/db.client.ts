import { shouldSeedMinimalData } from './db.config';
import { closeDatabase, getDatabaseDialect, getDb as getDatabaseConnection } from './db.connection';
import { postgresMigrations } from './postgres/migrations';
import { runPostgresMigrations } from './postgres/migrator';
import { ensureMinimalSeed } from './seeds/minimal.seed';
import { bootstrapSqlite } from './sqlite/bootstrap';
import type { DatabaseDialect, IDatabase } from './db.types';

export type { DatabaseDialect, IDatabase } from './db.types';

export async function getDb(): Promise<IDatabase> {
    return getDatabaseConnection();
}

export async function migrateDatabase(): Promise<void> {
    const db = await getDb();

    if (db.dialect === 'postgres') {
        await runPostgresMigrations(db, postgresMigrations);
        console.log('[DB] PostgreSQL migrations ready.');
        return;
    }

    await bootstrapSqlite(db, { seedMinimal: false });
}

export async function seedMinimalData(): Promise<void> {
    const db = await getDb();
    await ensureMinimalSeed(db, { includeMenuItem: true });
}

export async function setupDatabase(options: { seedMinimal?: boolean } = {}): Promise<void> {
    const db = await getDb();

    if (db.dialect === 'postgres') {
        await runPostgresMigrations(db, postgresMigrations);

        const shouldSeed = options.seedMinimal ?? shouldSeedMinimalData('postgres');
        if (shouldSeed) {
            await ensureMinimalSeed(db, { includeMenuItem: true });
        }

        console.log('[DB] PostgreSQL schema ready.');
        return;
    }

    const shouldSeed = options.seedMinimal ?? true;
    await bootstrapSqlite(db, { seedMinimal: shouldSeed });
}

export { closeDatabase, getDatabaseDialect };
