import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { Pool, type PoolClient } from 'pg';
import { getDatabaseConfig } from './db.config';
import type { DatabaseDialect, IDatabase, RunResult } from './db.types';

type SqliteDatabase = Awaited<ReturnType<typeof open>>;
type PostgresQueryable = Pool | PoolClient;

let dbInstance: IDatabase | null = null;
let sqliteInstance: SqliteDatabase | null = null;
let pgPool: Pool | null = null;

function convertParamsToPostgres(sql: string): string {
    let paramIndex = 0;
    return sql.replace(/\?/g, () => `$${++paramIndex}`);
}

function isPoolClient(value: PostgresQueryable): value is PoolClient {
    return typeof (value as PoolClient).release === 'function';
}

function createPostgresAdapter(queryable: PostgresQueryable, pool: Pool): IDatabase {
    const query = async (sql: string, params: any[] = []) => {
        return queryable.query(convertParamsToPostgres(sql), params);
    };

    const adapter: IDatabase = {
        dialect: 'postgres',
        exec: async (sql: string) => {
            await queryable.query(sql);
        },
        all: async <T = any>(sql: string, params: any[] = []) => {
            const result = await query(sql, params);
            return result.rows as T[];
        },
        get: async <T = any>(sql: string, params: any[] = []) => {
            const result = await query(sql, params);
            return result.rows[0] as T | undefined;
        },
        run: async (sql: string, params: any[] = []): Promise<RunResult> => {
            const result = await query(sql, params);
            return { lastID: null, changes: result.rowCount || 0 };
        },
        transaction: async <T>(fn: (db: IDatabase) => Promise<T>) => {
            if (isPoolClient(queryable)) {
                return fn(adapter);
            }

            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                const tx = createPostgresAdapter(client, pool);
                const result = await fn(tx);
                await client.query('COMMIT');
                return result;
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        },
    };

    return adapter;
}

function createSqliteAdapter(database: SqliteDatabase): IDatabase {
    const adapter: IDatabase = {
        dialect: 'sqlite',
        exec: async (sql: string) => {
            await database.exec(sql);
        },
        all: async <T = any>(sql: string, params: any[] = []) => {
            return database.all<T[]>(sql, params) as Promise<T[]>;
        },
        get: async <T = any>(sql: string, params: any[] = []) => {
            return database.get<T>(sql, params) as Promise<T | undefined>;
        },
        run: async (sql: string, params: any[] = []): Promise<RunResult> => {
            const result: any = await database.run(sql, params);
            return {
                lastID: result?.lastID ?? null,
                changes: result?.changes ?? 0,
            };
        },
        transaction: async <T>(fn: (db: IDatabase) => Promise<T>) => {
            await database.exec('BEGIN');
            try {
                const result = await fn(adapter);
                await database.exec('COMMIT');
                return result;
            } catch (error) {
                await database.exec('ROLLBACK');
                throw error;
            }
        },
    };

    return adapter;
}

export async function getDb(): Promise<IDatabase> {
    if (dbInstance) {
        return dbInstance;
    }

    const config = getDatabaseConfig();

    if (config.dialect === 'postgres') {
        if (!pgPool) {
            pgPool = new Pool({
                connectionString: config.connectionString,
                max: 20,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 5000,
            });
        }

        dbInstance = createPostgresAdapter(pgPool, pgPool);
        return dbInstance;
    }

    if (!sqliteInstance) {
        sqliteInstance = await open({
            filename: config.sqlitePath!,
            driver: sqlite3.Database,
        });
    }

    dbInstance = createSqliteAdapter(sqliteInstance);
    return dbInstance;
}

export function getDatabaseDialect(): DatabaseDialect {
    return getDatabaseConfig().dialect;
}

export async function closeDatabase(): Promise<void> {
    if (sqliteInstance) {
        await sqliteInstance.close();
        sqliteInstance = null;
    }

    if (pgPool) {
        await pgPool.end();
        pgPool = null;
    }

    dbInstance = null;
}
