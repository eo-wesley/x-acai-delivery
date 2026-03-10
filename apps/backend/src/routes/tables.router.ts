import { Router } from 'express';
import { adminAuthMiddleware } from '../middlewares/auth.middleware';
import { tenantMiddleware } from '../middlewares/tenant.middleware';
import { tablesRepo } from '../db/repositories/tables.repo';
import { ordersRepo } from '../db/repositories/orders.repo';
import { v4 as uuidv4 } from 'uuid';

export const tablesRouter = Router();

// Listar todas as mesas
tablesRouter.get('/admin/tables', adminAuthMiddleware, tenantMiddleware, async (req: any, res) => {
    try {
        const tables = await tablesRepo.getTables(req.tenantId);
        res.json(tables);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Criar nova mesa
tablesRouter.post('/admin/tables', adminAuthMiddleware, tenantMiddleware, async (req: any, res) => {
    try {
        const table = await tablesRepo.createTable(req.tenantId, req.body);
        res.json(table);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Detalhes da mesa (incluindo pedidos ativos)
tablesRouter.get('/admin/tables/:id', adminAuthMiddleware, tenantMiddleware, async (req: any, res) => {
    try {
        const table = await tablesRepo.getTableWithActiveOrders(req.tenantId, req.params.id);
        if (!table) return res.status(404).json({ error: 'Mesa não encontrada' });
        res.json(table);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Abrir comanda / Adicionar pedido à mesa
tablesRouter.post('/admin/tables/:id/orders', adminAuthMiddleware, tenantMiddleware, async (req: any, res) => {
    try {
        const tableId = req.params.id;
        // Criar o pedido (Order)
        const orderData = {
            ...req.body,
            id: uuidv4(),
            restaurant_id: req.tenantId,
            type: 'dine_in',
            table_id: tableId,
            status: 'pending'
        };

        const order = await ordersRepo.createOrder(orderData);
        await tablesRepo.linkOrderToTable(tableId, order.id);

        res.json(order);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Solicitar fechamento da mesa (Pede a conta)
tablesRouter.post('/admin/tables/:id/request-check', adminAuthMiddleware, tenantMiddleware, async (req: any, res) => {
    try {
        await tablesRepo.updateTableStatus(req.tenantId, req.params.id, 'check_requested');
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});
