import type { IDatabase } from '../db.types';

export interface Migration {
    version: string;
    name: string;
    up(db: IDatabase): Promise<void>;
}

async function ensureMigrationsTable(db: IDatabase) {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

export async function runPostgresMigrations(db: IDatabase, migrations: Migration[]): Promise<void> {
    await ensureMigrationsTable(db);

    const appliedRows = await db.all<{ version: string }>(
        'SELECT version FROM schema_migrations ORDER BY version ASC'
    );
    const applied = new Set(appliedRows.map((row) => row.version));

    for (const migration of migrations) {
        if (applied.has(migration.version)) {
            continue;
        }

        await db.transaction(async (tx) => {
            await migration.up(tx);
            await tx.run(
                'INSERT INTO schema_migrations (version, name) VALUES (?, ?)',
                [migration.version, migration.name]
            );
        });

        console.log(`[Postgres Migration] Applied ${migration.version} - ${migration.name}`);
    }
}
