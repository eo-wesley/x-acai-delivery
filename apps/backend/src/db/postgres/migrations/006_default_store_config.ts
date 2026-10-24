import type { Migration } from '../migrator';
import { backfillDefaultStoreConfig } from '../../seeds/default-store-config';

export const defaultStoreConfigMigration: Migration = {
    version: '006',
    name: 'backfill_approved_default_store_config',
    async up(db) {
        await backfillDefaultStoreConfig(db);
    },
};
