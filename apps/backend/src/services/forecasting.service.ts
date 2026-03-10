import { getDb } from '../db/db.client';

export interface StockForecast {
    itemId: string;
    name: string;
    currentQty: number;
    avgDailyConsum: number;
    daysRemaining: number | 'inf';
    recommendation: 'buy' | 'ok' | 'critical';
}

export class ForecastingService {
    async getInventoryForecast(restaurantId: string): Promise<StockForecast[]> {
        const db = await getDb();

        // 1. Get recent consumption (last 30 days) from inventory_movements
        // We filter by 'out' movements linked to 'sale'
        const consumptionData = await db.all(`
            SELECT 
                inventory_item_id,
                SUM(quantity) as total_out
            FROM inventory_movements
            WHERE restaurant_id = ? 
            AND type = 'out' 
            AND reason = 'sale'
            AND created_at >= date('now', '-30 days')
            GROUP BY inventory_item_id
        `, [restaurantId]);

        // 2. Get current stock levels
        const items = await db.all(`
            SELECT id, name, current_qty, min_stock
            FROM inventory_items
            WHERE restaurant_id = ?
        `, [restaurantId]);

        const forecasts: StockForecast[] = items.map(item => {
            const consumption = consumptionData.find(c => c.inventory_item_id === item.id);
            const totalOut = consumption ? consumption.total_out : 0;
            const avgDaily = totalOut / 30;

            let daysRemaining: number | 'inf' = 'inf';
            if (avgDaily > 0) {
                daysRemaining = Math.max(0, Math.floor(item.current_qty / avgDaily));
            }

            let recommendation: 'buy' | 'ok' | 'critical' = 'ok';
            if (daysRemaining !== 'inf') {
                if (daysRemaining <= 3 || item.current_qty <= item.min_stock) recommendation = 'critical';
                else if (daysRemaining <= 7) recommendation = 'buy';
            } else if (item.current_qty <= item.min_stock) {
                recommendation = 'critical';
            }

            return {
                itemId: item.id,
                name: item.name,
                currentQty: item.current_qty,
                avgDailyConsum: Number(avgDaily.toFixed(2)),
                daysRemaining,
                recommendation
            };
        });

        return forecasts;
    }

    async getOrderDemandForecast(restaurantId: string): Promise<{ date: string; predictedOrders: number }[]> {
        const db = await getDb();

        // 1. Get daily order counts for the last 21 days to have enough trend data
        const history = await db.all(`
            SELECT date(created_at) as day, COUNT(*) as count
            FROM orders
            WHERE restaurant_id = ? 
            AND status != 'cancelled'
            AND created_at >= date('now', '-21 days')
            GROUP BY day
            ORDER BY day ASC
        `, [restaurantId]);

        if (history.length < 3) {
            // Not enough data, return empty or zeroed forecast
            return [];
        }

        // 2. Simple Linear Regression (y = mx + b)
        // x = index of day, y = order count
        const n = history.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

        for (let i = 0; i < n; i++) {
            sumX += i;
            sumY += history[i].count;
            sumXY += i * history[i].count;
            sumX2 += i * i;
        }

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        // 3. Predict next 7 days
        const forecast = [];
        const lastDate = new Date();

        for (let i = 1; i <= 7; i++) {
            const nextDate = new Date();
            nextDate.setDate(lastDate.getDate() + i);
            const predictedCount = Math.max(0, Math.round(slope * (n + i - 1) + intercept));

            forecast.push({
                date: nextDate.toISOString().split('T')[0],
                predictedOrders: predictedCount
            });
        }

        return forecast;
    }

    async getSmartStockAlerts(restaurantId: string) {
        const db = await getDb();
        const inventory = await this.getInventoryForecast(restaurantId);

        // Items with less than 3 days of stock OR below min_stock
        const criticalItems = inventory.filter(item =>
            item.recommendation === 'critical' ||
            (typeof item.daysRemaining === 'number' && item.daysRemaining <= 2)
        );

        return criticalItems.map(item => ({
            itemId: item.itemId,
            name: item.name,
            currentQty: item.currentQty,
            daysRemaining: item.daysRemaining,
            message: `Risco de ruptura: estoque estimado para apenas ${item.daysRemaining} dias.`
        }));
    }
}

export const forecastingService = new ForecastingService();
