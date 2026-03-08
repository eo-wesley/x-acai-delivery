import { setupEventSubscribers } from './core/eventSubscriber';
import { ordersRepo } from './db/repositories/orders.repo';
import { getDb } from './db/db.client';

async function testNotifications() {
    console.log('--- Iniciando Teste de Notificações ---');

    // 1. Setup listeners
    setupEventSubscribers();

    // 2. Localizar um pedido para teste
    const db = await getDb();
    const order = await db.get('SELECT id FROM orders LIMIT 1');
    if (!order) {
        console.error('Nenhum pedido encontrado para teste.');
        return;
    }
    console.log(`Testando com Pedido ID: ${order.id}`);

    // 3. Testar Mudança de Status (Preparing)
    console.log('\n[Teste 1] Atualizando para "preparing"...');
    await ordersRepo.updateOrderStatus(order.id, 'preparing');

    // 4. Testar Mudança de Status (Delivering)
    console.log('\n[Teste 2] Atualizando para "delivering"...');
    await ordersRepo.updateOrderStatus(order.id, 'delivering');

    // 5. Testar Cancelamento
    console.log('\n[Teste 3] Cancelando pedido...');
    await ordersRepo.cancelOrder(order.id, 'Teste de Integração');

    console.log('\n--- Fim do Teste ---');
    process.exit(0);
}

testNotifications().catch(err => {
    console.error('Erro no teste:', err);
    process.exit(1);
});
