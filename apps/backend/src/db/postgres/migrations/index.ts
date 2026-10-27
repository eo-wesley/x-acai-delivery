import type { Migration } from '../migrator';
import { initialSchemaMigration } from './001_initial_schema';
import { deliveryVerificationMigration } from './002_delivery_verification';
import { inventoryPurchaseProfilesMigration } from './003_inventory_purchase_profiles';
import { orderIdempotencyMigration } from './004_order_idempotency';
import { canonicalTropicalMigration } from './005_canonical_tropical';
import { defaultStoreConfigMigration } from './006_default_store_config';
import { ifoodCatalogSyncMigration } from './007_ifood_catalog_sync';
import { inventorySeedMigration } from './008_seed_inventory_costs';
import { receiptCostProfilesMigration } from './009_update_receipt_cost_profiles';
import { currentStockCountsMigration } from './010_seed_current_stock_counts';
import { correctConfeteStockMigration } from './011_correct_confete_stock';

export const postgresMigrations: Migration[] = [
    initialSchemaMigration,
    deliveryVerificationMigration,
    inventoryPurchaseProfilesMigration,
    orderIdempotencyMigration,
    canonicalTropicalMigration,
    defaultStoreConfigMigration,
    ifoodCatalogSyncMigration,
    inventorySeedMigration,
    receiptCostProfilesMigration,
    currentStockCountsMigration,
    correctConfeteStockMigration,
];
