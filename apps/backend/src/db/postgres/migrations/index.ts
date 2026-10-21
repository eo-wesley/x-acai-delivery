import type { Migration } from '../migrator';
import { initialSchemaMigration } from './001_initial_schema';
import { deliveryVerificationMigration } from './002_delivery_verification';
import { inventoryPurchaseProfilesMigration } from './003_inventory_purchase_profiles';
import { orderIdempotencyMigration } from './004_order_idempotency';
import { canonicalTropicalMigration } from './005_canonical_tropical';

export const postgresMigrations: Migration[] = [
    initialSchemaMigration,
    deliveryVerificationMigration,
    inventoryPurchaseProfilesMigration,
    orderIdempotencyMigration,
    canonicalTropicalMigration,
];
