import type { Migration } from '../migrator';
import { initialSchemaMigration } from './001_initial_schema';
import { deliveryVerificationMigration } from './002_delivery_verification';
import { inventoryPurchaseProfilesMigration } from './003_inventory_purchase_profiles';

export const postgresMigrations: Migration[] = [
    initialSchemaMigration,
    deliveryVerificationMigration,
    inventoryPurchaseProfilesMigration,
];
