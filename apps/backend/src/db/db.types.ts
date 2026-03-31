export type DatabaseDialect = 'sqlite' | 'postgres';

export interface RunResult {
    lastID: number | string | null;
    changes: number;
}

export interface IDatabase {
    dialect: DatabaseDialect;
    exec(sql: string): Promise<void>;
    all<T = any>(sql: string, params?: any[]): Promise<T[]>;
    get<T = any>(sql: string, params?: any[]): Promise<T | undefined>;
    run(sql: string, params?: any[]): Promise<RunResult>;
    transaction<T>(fn: (db: IDatabase) => Promise<T>): Promise<T>;
}
