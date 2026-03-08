import { getDb } from '../db.client';
import { randomUUID } from 'crypto';

export class FinanceRepo {

    // --- CASH SESSIONS ---
    async getActiveSession(restaurantId: string) {
        const db = await getDb();
        return db.get(`SELECT * FROM cash_sessions WHERE restaurant_id = ? AND status = 'open' LIMIT 1`, [restaurantId]);
    }

    async getOrOpenSession(restaurantId: string) {
        let session = await this.getActiveSession(restaurantId);
        if (!session) {
            const db = await getDb();
            const id = randomUUID();
            await db.run(
                `INSERT INTO cash_sessions (id, restaurant_id, opening_amount, status) VALUES (?, ?, ?, ?)`,
                [id, restaurantId, 0, 'open']
            );
            session = await this.getActiveSession(restaurantId);
        }
        return session;
    }

    async closeSession(restaurantId: string, closingAmount: number) {
        const db = await getDb();
        const active = await this.getActiveSession(restaurantId);
        if (!active) throw new Error('No active cash session found');

        await db.run(
            `UPDATE cash_sessions SET status = 'closed', closed_at = CURRENT_TIMESTAMP, closing_amount = ? WHERE id = ?`,
            [closingAmount, active.id]
        );
        return true;
    }

    // --- CASH MOVEMENTS & PAYMENTS ---
    async registerMovement(restaurantId: string, sessionId: string, type: 'in' | 'out', method: string, amount: number, reason: string, refOrderId?: string) {
        const db = await getDb();
        const id = randomUUID();
        await db.run(
            `INSERT INTO cash_movements (id, restaurant_id, session_id, type, method, amount, reason, ref_order_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, restaurantId, sessionId, type, method, amount, reason, refOrderId || null]
        );
        return id;
    }

    async registerPayment(restaurantId: string, orderId: string, method: string, amount: number) {
        const db = await getDb();
        const id = randomUUID();
        await db.run(
            `INSERT INTO payments (id, restaurant_id, order_id, method, amount, status)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [id, restaurantId, orderId, method, amount, 'approved']
        );
        return id;
    }

    async getDailySummary(restaurantId: string, dateStr: string) {
        // dateStr format: YYYY-MM-DD
        const db = await getDb();
        // sum payments
        const payments = await db.all(
            `SELECT method, SUM(amount) as total FROM payments WHERE restaurant_id = ? AND date(created_at) = ? AND status = 'approved' GROUP BY method`,
            [restaurantId, dateStr]
        );

        const ordersRows = await db.get(
            `SELECT COUNT(*) as qtd FROM orders WHERE restaurant_id = ? AND date(created_at) = ?`,
            [restaurantId, dateStr]
        );

        return {
            date: dateStr,
            payments,
            totalOrders: ordersRows?.qtd || 0
        };
    }

    // --- EXPENSES ---
    async registerExpense(restaurantId: string, payload: { date: string, category: string, description: string, amount: number, method: string }) {
        const db = await getDb();
        const id = randomUUID();
        await db.run(
            `INSERT INTO expenses (id, restaurant_id, date, category, description, amount, method)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, restaurantId, payload.date, payload.category, payload.description || null, payload.amount, payload.method || null]
        );
        return id;
    }

    async listExpenses(restaurantId: string, fromDate: string, toDate: string) {
        const db = await getDb();
        return db.all(
            `SELECT * FROM expenses WHERE restaurant_id = ? AND date >= ? AND date <= ? ORDER BY date DESC, created_at DESC`,
            [restaurantId, fromDate, toDate]
        );
    }

    // --- OVERVIEW (DRE) ---
    async getFinancialOverview(restaurantId: string, fromDate: string, toDate: string) {
        const db = await getDb();
        const incomeRow = await db.get(
            `SELECT SUM(amount) as total_bruto FROM payments WHERE restaurant_id = ? AND date(created_at) >= ? AND date(created_at) <= ? AND status = 'approved'`,
            [restaurantId, fromDate, toDate]
        );

        const expensesRow = await db.get(
            `SELECT SUM(amount) as total_expenses FROM expenses WHERE restaurant_id = ? AND date >= ? AND date <= ?`,
            [restaurantId, fromDate, toDate]
        );

        const totalOrdersRow = await db.get(
            `SELECT COUNT(*) as qtd FROM orders WHERE restaurant_id = ? AND date(created_at) >= ? AND date(created_at) <= ?`,
            [restaurantId, fromDate, toDate]
        );

        const receitaBruta = incomeRow?.total_bruto || 0;
        const totalDespesas = expensesRow?.total_expenses || 0;
        const lucroBruto = receitaBruta - totalDespesas;
        const totalOrders = totalOrdersRow?.qtd || 0;
        const ticketMedio = totalOrders > 0 ? receitaBruta / totalOrders : 0;

        return {
            fromDate,
            toDate,
            receitaBrutaCents: receitaBruta,
            despesasCents: totalDespesas,
            lucroAproximadoCents: lucroBruto,
            ticketMedioCents: ticketMedio,
            totalPedidos: totalOrders
        };
    }
}

export const financeRepo = new FinanceRepo();
