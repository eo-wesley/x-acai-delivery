import type { Migration } from '../migrator';
import { initialSchemaMigration } from './001_initial_schema';

export const postgresMigrations: Migration[] = [
    initialSchemaMigration,
];
