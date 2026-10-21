import { getDb } from '../db.client';
import { randomUUID } from 'crypto';
import { eventBus } from '../../core/eventBus';

export interface InventoryItemPayload {
    name: string;
    sku?: string;
    unit: string; // ml, g, un, etc.
    current_qty: number;
    min_stock: number;
    acquisition_cost_cents: number;
    purchase_price_cents?: number | null;
    purchase_quantity?: number | null;
    purchase_unit?: 'g' | 'kg' | 'ml' | 'l' | 'un' | null;
    yield_percent?: number | null;
    cost_evidence_state?: 'unvalidated' | 'informed' | 'measured' | 'invoice' | null;
    supplier?: string;
    active?: boolean;
}

export class InventoryRepo {
    async createItem(restaurantId: string, payload: InventoryItemPayload): Promise<string> {
        const db = await getDb();
        const id = randomUUID();
        await db.run(
            `INSERT INTO inventory_items 
             (id, restaurant_id, name, sku, unit, current_qty, min_qty, min_stock, cost_cents,
              purchase_price_cents, purchase_quantity, purchase_unit, yield_percent, cost_evidence_state,
              cost_updated_at, supplier, active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id, restaurantId, payload.name, payload.sku || null, payload.unit,
                payload.current_qty || 0, payload.min_stock || 0, payload.min_stock || 0,
                payload.acquisition_cost_cents || 0,
                payload.purchase_price_cents ?? null, payload.purchase_quantity ?? null,
                payload.purchase_unit ?? null, payload.yield_percent ?? 100,
                payload.cost_evidence_state ?? 'unvalidated',
                payload.purchase_price_cents != null ? new Date().toISOString() : null,
                payload.supplier || null, payload.active !== false ? 1 : 0
            ]
        );
        return id;
    }

    async updateItem(restaurantId: string, id: string, patch: Partial<InventoryItemPayload>): Promise<boolean> {
        const db = await getDb();
        const setClauses: string[] = [];
        const params: any[] = [];

        const columnByField: Record<string, string> = {
            name: 'name',
            sku: 'sku',
            unit: 'unit',
            current_qty: 'current_qty',
            min_stock: 'min_stock',
            acquisition_cost_cents: 'cost_cents',
            purchase_price_cents: 'purchase_price_cents',
            purchase_quantity: 'purchase_quantity',
            purchase_unit: 'purchase_unit',
            yield_percent: 'yield_percent',
            cost_evidence_state: 'cost_evidence_state',
            supplier: 'supplier',
            active: 'active'
        };
        let updatesPurchaseProfile = false;

        for (const [key, value] of Object.entries(patch)) {
            const column = columnByField[key];
            if (!column) continue;
            setClauses.push(`${column} = ?`);
            if (key.startsWith('purchase_') || key === 'yield_percent' || key === 'cost_evidence_state') {
                updatesPurchaseProfile = true;
            }
            // Convert boolean to 1/0 for SQLite
            if (typeof value === 'boolean') {
                params.push(value ? 1 : 0);
            } else {
                params.push(value);
            }
        }

        if (updatesPurchaseProfile) {
            setClauses.push('cost_updated_at = ?');
            params.push(new Date().toISOString());
        }

        if (setClauses.length === 0) return false;

        params.push(id, restaurantId);
        const setQuery = setClauses.join(', ');

        const res = await db.run(
            `UPDATE inventory_items SET ${setQuery} WHERE id = ? AND restaurant_id = ?`,
            params
        );
        return res.changes ? res.changes > 0 : false;
    }

    async listItems(restaurantId: string): Promise<any[]> {
        const db = await getDb();
        return db.all(`SELECT *, cost_cents AS acquisition_cost_cents FROM inventory_items WHERE restaurant_id = ? AND active = 1 ORDER BY name ASC`, [restaurantId]);
    }

    async getAlerts(restaurantId: string): Promise<any[]> {
        const db = await getDb();
        return db.all(
            `SELECT * FROM inventory_items 
             WHERE restaurant_id = ? AND active = 1 AND current_qty <= min_stock 
             ORDER BY current_qty ASC`,
            [restaurantId]
        );
    }

    async recordMovement(
        restaurantId: string,
        itemId: string,
        type: 'in' | 'out' | 'adjust',
        qty: number,
        reason: string,
        refOrderId?: string
    ): Promise<void> {
        const db = await getDb();
        const movementId = randomUUID();

        await db.run(
            `INSERT INTO inventory_movements (id, restaurant_id, inventory_item_id, type, qty, reason, ref_order_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [movementId, restaurantId, itemId, type, qty, reason, refOrderId || null]
        );

        // Calculate adjustment relative to current stock based on type
        // Wait, current_qty is absolute, if type is out, subtract. If in, add.
        // Actually, if type=adjust, do we set the qty explicitly or adjust it?
        // Let's treat qty as an absolute delta: out -> subtract qty, in -> add qty. adjust -> add or subtract delta qty.
        // Wait, standard practice: qty in movement is always positive but logic dictates sign.
        let sqlDelta = `current_qty = current_qty + ?`; // Default for 'in'
        let finalQty = Math.abs(qty);

        if (type === 'out') {
            sqlDelta = `current_qty = current_qty - ?`;
        } else if (type === 'adjust') {
            // Assume qty provided is the EXACT delta to add (+ or -)
            // Wait, usually adjust means replacing the qty.
            // Let's just treat standard delta adjusting. If user sends -5 adjust, qty is -5, so `+ -5`.
            finalQty = qty; // can be negative
        }

        await db.run(
            `UPDATE inventory_items SET ${sqlDelta} WHERE id = ? AND restaurant_id = ?`,
            [finalQty, itemId, restaurantId]
        );

        // Check for depletion
        const item = await db.get(`SELECT name, current_qty, min_stock FROM inventory_items WHERE id = ?`, [itemId]);
        if (item && item.current_qty <= 0) {
            eventBus.emit('inventory_depleted', {
                restaurantId,
                itemId,
                itemName: item.name,
                currentQty: item.current_qty
            });
        } else if (item && item.current_qty <= item.min_stock) {
            eventBus.emit('inventory_low', {
                restaurantId,
                itemId,
                itemName: item.name,
                currentQty: item.current_qty,
                minStock: item.min_stock
            });
        }
    }

    async getMovements(restaurantId: string, limit = 50): Promise<any[]> {
        const db = await getDb();
        return db.all(
            `SELECT m.*, i.name as item_name 
             FROM inventory_movements m
             JOIN inventory_items i ON m.inventory_item_id = i.id
             WHERE m.restaurant_id = ? 
             ORDER BY m.created_at DESC LIMIT ?`,
            [restaurantId, limit]
        );
    }

    async getConsumptionByChannel(restaurantId: string): Promise<any[]> {
        const db = await getDb();
        return db.all(`
            SELECT i.name as item_name, o.source, SUM(m.qty) as total_qty
            FROM inventory_movements m
            JOIN inventory_items i ON m.inventory_item_id = i.id
            JOIN orders o ON m.ref_order_id = o.id
            WHERE m.restaurant_id = ? AND m.type = 'out'
            GROUP BY i.id, o.source
            ORDER BY total_qty DESC
        `, [restaurantId]);
    }
}

export const inventoryRepo = new InventoryRepo();
