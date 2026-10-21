import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';

const sqlitePath = path.join(os.tmpdir(), `xacai-order-${randomUUID()}.sqlite`);
process.env.SQLITE_PATH = sqlitePath;
process.env.DATABASE_URL = '';

async function main() {
const { setupDatabase, getDb, closeDatabase } = await import('../src/db/db.client');
const { ordersRepo, OrderIdempotencyConflictError } = await import('../src/db/repositories/orders.repo');
const { approvedBasePrice, approvedOptionPrice } = await import('../src/services/approved-menu-prices');
const { resolveFallbackOption } = await import('../src/services/fallback-menu-options');

try {
    await setupDatabase({ seedMinimal: true });

    assert.equal(approvedBasePrice('Açaí X-Paçokita'), 1290);
    assert.equal(approvedBasePrice('Açaí X-Chocolá'), 1490);
    assert.equal(approvedBasePrice('Açaí 700ml Grátis 4 Complementos'), 3890);
    assert.equal(approvedBasePrice('Açaí Marmitex 700ml Grátis 4 Complementos'), null);
    assert.equal(approvedOptionPrice('Açaí X-Tella', 'Tamanho do Copo', 'Copo de 700ml', 1500), 1900);
    const fallbackGroup = 'fallback-product-1-tamanho';
    assert.equal(resolveFallbackOption(
        { id: 'product-1', name: 'Açaí X-Paçokita' },
        { groupId: fallbackGroup, groupName: 'qualquer', optionId: `${fallbackGroup}-3`, optionName: 'Copo de 700ml' },
    )?.price_cents, 1400);
    assert.equal(resolveFallbackOption(
        { id: 'product-1', name: 'Açaí X-Paçokita' },
        { groupId: fallbackGroup, groupName: 'qualquer', optionId: `${fallbackGroup}-3`, optionName: 'Nutella' },
    ), null);

    const input = {
        customerId: 'customer-test',
        customerName: 'Cliente Teste',
        customerPhone: '62999999999',
        restaurantId: 'default_tenant',
        items: [{ menuItemId: 'seed_menu_acai_classico', qty: 1, unitPriceCents: 1290 }],
        subtotalCents: 1290,
        deliveryFeeCents: 0,
        totalCents: 1290,
        addressText: 'Retirada no Balcão (Loja)',
        paymentMethod: 'cash',
        idempotencyKey: 'checkout-test-001',
        requestFingerprint: 'fingerprint-a',
    };

    const first = await ordersRepo.createOrder(input);
    const repeated = await ordersRepo.createOrder(input);
    assert.equal(repeated.id, first.id);
    assert.equal(repeated.reused, true);

    await assert.rejects(
        () => ordersRepo.createOrder({ ...input, requestFingerprint: 'fingerprint-b' }),
        OrderIdempotencyConflictError,
    );

    const db = await getDb();
    const count = await db.get<{ total: number }>(
        'SELECT COUNT(*) AS total FROM orders WHERE restaurant_id = ? AND idempotency_key = ?',
        ['default_tenant', input.idempotencyKey],
    );
    assert.equal(count?.total, 1);
    console.log('Integração de preços aprovados e idempotência durável: 11 verificações aprovadas.');
} finally {
    await closeDatabase();
    await rm(sqlitePath, { force: true });
}
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
