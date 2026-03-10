import { driversRepo } from '../db/repositories/drivers.repo';
import { ordersRepo } from '../db/repositories/orders.repo';

export class DispatchService {
    /**
     * Tenta despachar um pedido específico para o melhor entregador disponível
     */
    async dispatchOrder(tenantId: string, orderId: string): Promise<boolean> {
        console.log(`[Dispatch] Tentando despachar pedido ${orderId} para tenant ${tenantId}...`);

        const order = await ordersRepo.getOrderById(orderId);
        if (!order || !['ready', 'ready_for_pickup', 'confirmed'].includes(order.status)) {
            console.log(`[Dispatch] Pedido ${orderId} não está pronto para despacho. Status: ${order?.status}`);
            return false;
        }

        const driver = await driversRepo.findOptimalDriver(tenantId, orderId);
        if (!driver) {
            console.warn(`[Dispatch] Nenhum entregador disponível para o pedido ${orderId} no tenant ${tenantId}.`);
            // Aqui poderíamos enfileirar para tentar novamente mais tarde
            return false;
        }

        console.log(`[Dispatch] Atribuindo pedido ${orderId} ao entregador ${driver.name} (ID: ${driver.id})`);

        // Atribuir o pedido (Taxa fixa de 5.00 para o exemplo, pode ser dinâmica)
        const feeCents = 500;
        await driversRepo.assignOrder(tenantId, driver.id, orderId, feeCents);

        // Atualizar status do pedido
        await ordersRepo.updateOrderStatus(orderId, 'assigned');

        // Registrar o despacho no motorista para controle de carga
        await driversRepo.markDispatched(tenantId, driver.id);

        // TODO: Notificar via WebSocket/Push
        console.log(`[Dispatch] Pedido ${orderId} despachado com sucesso.`);
        return true;
    }

    /**
     * Processa todos os pedidos pendentes de despacho de uma loja
     */
    async processPendingQueue(tenantId: string) {
        const readyOrders = await driversRepo.getOrdersReadyForDispatch(tenantId);
        for (const order of readyOrders) {
            await this.dispatchOrder(tenantId, order.id);
        }
    }
}

export const dispatchService = new DispatchService();
