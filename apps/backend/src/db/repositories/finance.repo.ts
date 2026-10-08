import { getDb } from '../db.client';
import { randomUUID } from 'crypto';

export class FinanceRepo {
    async registerExpense(tenantId: string, data: {
        category?: string;
        valueCents?: number;
        value_cents?: number;
        amountCents?: number;
        description?: string;
    }) {
        const valueCents = data.valueCents ?? data.value_cents ?? data.amountCents;
        if (!Number.isInteger(valueCents) || (valueCents as number) <= 0) {
            throw new Error('valueCents must be a positive integer');
        }

        const session = await this.getCurrentSession(tenantId);
        return this.addEntry(tenantId, session?.id || null, {
            type: 'out',
            category: data.category || 'expense',
            valueCents: valueCents as number,
            description: data.description,
        });
    }

    async listExpenses(tenantId: string, fromDate: string, toDate: string) {
        const db = await getDb();
        return db.all(`
            SELECT * FROM financial_entries
            WHERE restaurant_id = ? AND type = 'out'
              AND created_at BETWEEN ? AND ?
            ORDER BY created_at DESC
        `, [tenantId, fromDate, `${toDate} 23:59:59`]);
    }

    async getFinancialOverview(tenantId: string, fromDate: string, toDate: string) {
        const db = await getDb();
        const dre = await this.getDRE(tenantId, fromDate, `${toDate} 23:59:59`);
        const expensesByCategory = await db.all(`
            SELECT category, COALESCE(SUM(value_cents), 0) AS total_cents
            FROM financial_entries
            WHERE restaurant_id = ? AND type = 'out'
              AND created_at BETWEEN ? AND ?
            GROUP BY category
            ORDER BY total_cents DESC
        `, [tenantId, fromDate, `${toDate} 23:59:59`]);

        return { ...dre, expenses_by_category: expensesByCategory };
    }

    async getCurrentSession(tenantId: string) {
        const db = await getDb();
        return db.get(`
            SELECT * FROM cash_sessions 
            WHERE restaurant_id = ? AND status = 'open'
            ORDER BY opened_at DESC
        `, [tenantId]);
    }

    async openCash(tenantId: string, userId: string, initialValueCents: number) {
        const db = await getDb();
        const id = randomUUID();
        await db.run(`
            INSERT INTO cash_sessions (id, restaurant_id, user_id, initial_value_cents, status)
            VALUES (?, ?, ?, ?, 'open')
        `, [id, tenantId, userId, initialValueCents]);
        return id;
    }

    async closeCash(tenantId: string, sessionId: string, finalValueCents: number) {
        const db = await getDb();

        // Calcular valor esperado (inicial + entradas - saídas)
        const entries = await db.all(`
            SELECT type, SUM(value_cents) as total
            FROM financial_entries
            WHERE cash_session_id = ?
            GROUP BY type
        `, [sessionId]);

        const totalIn = entries.find(e => e.type === 'in')?.total || 0;
        const totalOut = entries.find(e => e.type === 'out')?.total || 0;

        const session = await db.get(`SELECT initial_value_cents FROM cash_sessions WHERE id = ?`, [sessionId]);
        const expectedValueCents = (session?.initial_value_cents || 0) + totalIn - totalOut;

        await db.run(`
            UPDATE cash_sessions 
            SET final_value_cents = ?, expected_value_cents = ?, status = 'closed', closed_at = CURRENT_TIMESTAMP
            WHERE id = ? AND restaurant_id = ?
        `, [finalValueCents, expectedValueCents, sessionId, tenantId]);

        return { expectedValueCents };
    }

    async addEntry(tenantId: string, sessionId: string | null, data: { type: 'in' | 'out', category: string, valueCents: number, description?: string }) {
        const db = await getDb();
        const id = randomUUID();
        await db.run(`
            INSERT INTO financial_entries (id, restaurant_id, cash_session_id, type, category, value_cents, description)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [id, tenantId, sessionId, data.type, data.category, data.valueCents, data.description || null]);
        return id;
    }

    async listEntries(tenantId: string, sessionId?: string) {
        const db = await getDb();
        if (sessionId) {
            return db.all(`SELECT * FROM financial_entries WHERE cash_session_id = ? ORDER BY created_at DESC`, [sessionId]);
        }
        return db.all(`SELECT * FROM financial_entries WHERE restaurant_id = ? ORDER BY created_at DESC LIMIT 50`, [tenantId]);
    }

    async getDRE(tenantId: string, startDate: string, endDate: string) {
        const db = await getDb();

        // Receitas (Sales)
        const sales = await db.get(`
            SELECT SUM(total_cents) as total FROM orders 
            WHERE restaurant_id = ? AND status = 'completed' 
            AND created_at BETWEEN ? AND ?
        `, [tenantId, startDate, endDate]);

        // Entradas Manuais
        const manualIn = await db.get(`
            SELECT SUM(value_cents) as total FROM financial_entries 
            WHERE restaurant_id = ? AND type = 'in' AND category != 'sale'
            AND created_at BETWEEN ? AND ?
        `, [tenantId, startDate, endDate]);

        // Saídas (Despesas/Sangrias)
        const totalOut = await db.get(`
            SELECT SUM(value_cents) as total FROM financial_entries 
            WHERE restaurant_id = ? AND type = 'out'
            AND created_at BETWEEN ? AND ?
        `, [tenantId, startDate, endDate]);

        const revenue = (sales?.total || 0) + (manualIn?.total || 0);
        const expenses = totalOut?.total || 0;

        return {
            revenue_cents: revenue,
            expenses_cents: expenses,
            net_profit_cents: revenue - expenses
        };
    }

    async registerPayment(tenantId: string, orderId: string, method: string, amountCents: number) {
        const db = await getDb();
        const id = randomUUID();
        await db.run(`
            INSERT INTO payments (id, restaurant_id, order_id, method, amount, status)
            VALUES (?, ?, ?, ?, ?, 'approved')
        `, [id, tenantId, orderId, method, amountCents]);

        // Também registrar no caixa se houver uma sessão aberta
        const session = await this.getCurrentSession(tenantId);
        if (session) {
            await this.addEntry(tenantId, session.id, {
                type: 'in',
                category: 'sale',
                valueCents: amountCents,
                description: `Pagamento Pedido ${orderId.substring(0, 8)}`
            });
        }
        return id;
    }
}

export const financeRepo = new FinanceRepo();
