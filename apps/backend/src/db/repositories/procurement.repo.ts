import { getDb } from '../db.client';
import { v4 as uuidv4 } from 'uuid';

export class ProcurementRepo {
    // ─── Suppliers ────────────────────────────────────────────────────────────
    async getSuppliers(tenantId: string) {
        const db = await getDb();
        return db.all('SELECT * FROM suppliers WHERE restaurant_id = ? ORDER BY name ASC', [tenantId]);
    }

    async createSupplier(tenantId: string, data: any) {
        const db = await getDb();
        const id = uuidv4();
        await db.run(
            `INSERT INTO suppliers (id, restaurant_id, name, contact_name, phone, email, category) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, tenantId, data.name, data.contact_name, data.phone, data.email, data.category]
        );
        return { id, ...data };
    }

    // ─── Purchases ────────────────────────────────────────────────────────────
    async getPurchases(tenantId: string) {
        const db = await getDb();
        return db.all(`
            SELECT p.*, s.name as supplier_name 
            FROM inventory_purchases p
            JOIN suppliers s ON p.supplier_id = s.id
            WHERE p.restaurant_id = ?
            ORDER BY p.purchase_date DESC
        `, [tenantId]);
    }

    async recordPurchase(tenantId: string, data: {
        supplier_id: string;
        total_value_cents: number;
        observation?: string;
        items: Array<{
            inventory_item_id: string;
            quantity: number;
            unit_price_cents: number;
        }>
    }) {
        const db = await getDb();
        const purchaseId = uuidv4();

        // 1. Iniciar Transação Manual (SQLite wrapper asycn friendly)
        await db.run('BEGIN TRANSACTION');

        try {
            // 2. Criar cabeçalho da compra
            await db.run(
                `INSERT INTO inventory_purchases (id, restaurant_id, supplier_id, total_value_cents, observation)
                 VALUES (?, ?, ?, ?, ?)`,
                [purchaseId, tenantId, data.supplier_id, data.total_value_cents, data.observation]
            );

            for (const item of data.items) {
                const totalPrice = item.quantity * item.unit_price_cents;

                // 3. Criar item da compra
                await db.run(
                    `INSERT INTO inventory_purchase_items (id, purchase_id, inventory_item_id, quantity, unit_price_cents, total_price_cents)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [uuidv4(), purchaseId, item.inventory_item_id, item.quantity, item.unit_price_cents, totalPrice]
                );

                // 4. Atualizar estoque (Incrementar)
                await db.run(
                    `UPDATE inventory_items SET current_stock = current_stock + ? 
                     WHERE id = ? AND restaurant_id = ?`,
                    [item.quantity, item.inventory_item_id, tenantId]
                );
            }

            // 5. Gerar lançamento financeiro (Contas a Pagar/Despesa)
            const expenseId = uuidv4();
            const supplier = await db.get('SELECT name FROM suppliers WHERE id = ?', [data.supplier_id]);
            await db.run(
                `INSERT INTO financial_entries (id, restaurant_id, type, category, value_cents, description)
                 VALUES (?, ?, 'out', 'expense', ?, ?)`,
                [expenseId, tenantId, data.total_value_cents, `Compra de Insumo - Fornecedor: ${supplier?.name || 'Desconhecido'}`]
            );

            await db.run('COMMIT');
            return { id: purchaseId };
        } catch (e) {
            await db.run('ROLLBACK');
            throw e;
        }
    }
}

export const procurementRepo = new ProcurementRepo();
