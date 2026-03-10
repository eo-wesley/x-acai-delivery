import { getDb } from '../db.client';

export const fiscalRepo = {
    async updateCustomerTaxId(customerId: string, taxId: string) {
        const db = await getDb();
        return db.run('UPDATE customers SET tax_id = ? WHERE id = ?', [taxId, customerId]);
    },

    async updateOrderFiscal(orderId: string, data: { status: string, nfe_number?: string, nfe_url?: string, tax_id?: string }) {
        const db = await getDb();
        return db.run(`
            UPDATE orders 
            SET fiscal_status = ?, 
                nfe_number = COALESCE(?, nfe_number), 
                nfe_url = COALESCE(?, nfe_url),
                tax_id = COALESCE(?, tax_id)
            WHERE id = ?
        `, [data.status, data.nfe_number, data.nfe_url, data.tax_id, orderId]);
    },

    async getPendingFiscalOrders(tenantId: string) {
        const db = await getDb();
        return db.all(`
            SELECT id, customer_name, total_cents, created_at, fiscal_status, tax_id
            FROM orders 
            WHERE restaurant_id = ? AND fiscal_status != 'issued'
            ORDER BY created_at DESC
        `, [tenantId]);
    },

    async getFiscalHistory(tenantId: string) {
        const db = await getDb();
        return db.all(`
            SELECT id, customer_name, total_cents, created_at, fiscal_status, nfe_number, nfe_url, tax_id
            FROM orders 
            WHERE restaurant_id = ? AND fiscal_status = 'issued'
            ORDER BY created_at DESC
            LIMIT 100
        `, [tenantId]);
    },

    async getRestaurantFiscalConfig(tenantId: string) {
        const db = await getDb();
        return db.get(`
            SELECT id, name, cnpj, state_registration, focus_nfe_token, fiscal_environment 
            FROM restaurants 
            WHERE id = ?
        `, [tenantId]);
    },

    async updateRestaurantFiscalConfig(tenantId: string, data: { cnpj: string, ie: string, token: string, env: string }) {
        const db = await getDb();
        return db.run(`
            UPDATE restaurants 
            SET cnpj = ?, state_registration = ?, focus_nfe_token = ?, fiscal_environment = ?
            WHERE id = ?
        `, [data.cnpj, data.ie, data.token, data.env, tenantId]);
    }
};
