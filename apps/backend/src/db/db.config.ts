import path from 'path';
import dotenv from 'dotenv';
import type { DatabaseDialect } from './db.types';

dotenv.config();

const POSTGRES_PROTOCOL = /^postgres(ql)?:\/\//i;

export interface DatabaseConfig {
    dialect: DatabaseDialect;
    connectionString?: string;
    sqlitePath?: string;
}

export function isPostgresUrl(value?: string | null): boolean {
    return !!value && POSTGRES_PROTOCOL.test(value.trim());
}

export function getDatabaseConfig(): DatabaseConfig {
    const databaseUrl = process.env.DATABASE_URL?.trim();

    if (isPostgresUrl(databaseUrl)) {
        return {
            dialect: 'postgres',
            connectionString: databaseUrl,
        };
    }

    const sqlitePath = process.env.SQLITE_PATH?.trim() || databaseUrl || 'database.sqlite';

    return {
        dialect: 'sqlite',
        sqlitePath: path.resolve(process.cwd(), sqlitePath),
    };
}

export function shouldSeedMinimalData(dialect: DatabaseDialect): boolean {
    if (dialect === 'sqlite') {
        return true;
    }

    const value = (process.env.DB_SEED_MINIMAL || '').trim().toLowerCase();
    return ['1', 'true', 'yes', 'on'].includes(value);
}
