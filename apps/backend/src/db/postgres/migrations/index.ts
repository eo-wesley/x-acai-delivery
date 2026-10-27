import type { Migration } from '../migrator';
import { initialSchemaMigration } from './001_initial_schema';
import { deliveryVerificationMigration } from './002_delivery_verification';
import { inventoryPurchaseProfilesMigration } from './003_inventory_purchase_profiles';
import { orderIdempotencyMigration } from './004_order_idempotency';
import { canonicalTropicalMigration } from './005_canonical_tropical';
import { defaultStoreConfigMigration } from './006_default_store_config';
import { ifoodCatalogSyncMigration } from './007_ifood_catalog_sync';

export const postgresMigrations: Migration[] = [
    initialSchemaMigration,
    deliveryVerificationMigration,
    inventoryPurchaseProfilesMigration,
    orderIdempotencyMigration,
    canonicalTropicalMigration,
    defaultStoreConfigMigration,
    ifoodCatalogSyncMigration,
];
