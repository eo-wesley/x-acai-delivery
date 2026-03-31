import type { IDatabase } from '../db.types';
import { ensureMinimalSeed } from '../seeds/minimal.seed';
import { schemaAlterations, schemaStatements } from '../schema';

async function runStatements(db: IDatabase, statements: string[], logPrefix: string) {
    for (const sql of statements) {
        try {
            await db.exec(sql);
        } catch (error) {
            console.error(`${logPrefix} Failed statement: ${sql.substring(0, 80)}`, error);
        }
    }
}

export async function bootstrapSqlite(db: IDatabase, options: { seedMinimal?: boolean } = {}): Promise<void> {
    await runStatements(db, schemaStatements, '[SQLite Bootstrap]');

    for (const alter of schemaAlterations) {
        try {
            await db.exec(alter);
        } catch {
            // Existing local databases may already have these columns.
        }
    }

    if (options.seedMinimal !== false) {
        await ensureMinimalSeed(db, { includeMenuItem: true });
    }

    console.log('[SQLite Bootstrap] Schema ready.');
}
