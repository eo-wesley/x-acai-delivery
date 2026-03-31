import { schemaStatements, toPostgresSql } from '../../schema';
import type { Migration } from '../migrator';

export const initialSchemaMigration: Migration = {
    version: '001',
    name: 'initial_staging_schema',
    async up(db) {
        for (const sql of schemaStatements) {
            await db.exec(toPostgresSql(sql));
        }
    },
};
