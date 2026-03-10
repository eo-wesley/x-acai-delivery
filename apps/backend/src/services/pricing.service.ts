import { getDb } from '../db/db.client';
import { forecastingService } from './forecasting.service';

export interface PricingRules {
    surge: {
        enabled: boolean;
        threshold_orders_per_hour: number;
        fee_multiplier: number;
    };
    happy_hour: {
        enabled: boolean;
        start_time: string; // HH:mm
        end_time: string; // HH:mm
        discount_percentage: number;
        categories: string[];
    };
}

export class PricingService {
    static async getRules(tenantId: string): Promise<PricingRules> {
        const db = await getDb();
        const restaurant = await db.get('SELECT pricing_rules FROM restaurants WHERE id = ?', [tenantId]);

        if (!restaurant?.pricing_rules) {
            return {
                surge: { enabled: false, threshold_orders_per_hour: 10, fee_multiplier: 1.2 },
                happy_hour: { enabled: false, start_time: "14:00", end_time: "17:00", discount_percentage: 10, categories: [] }
            };
        }

        return JSON.parse(restaurant.pricing_rules);
    }

    static async isPeakDemand(tenantId: string, rules: PricingRules): Promise<boolean> {
        if (!rules.surge.enabled) return false;

        const db = await getDb();
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

        // 1. Get current actual demand (orders in the last hour)
        const currentResult = await db.get(`
            SELECT COUNT(id) as count 
            FROM orders 
            WHERE restaurant_id = ? AND created_at > ? AND status != 'cancelled'
        `, [tenantId, oneHourAgo]);

        const currentOrders = currentResult?.count || 0;

        // 2. Fallback to static threshold if IA fails or not enough data
        // For advanced IA: compare currentOrders with the 'predictedOrders' for today/now
        // For simplicity in this phase, we use threshold but allow IA to influence it
        const predicted = await forecastingService.getOrderDemandForecast(tenantId);
        const avgPredictedPerHour = predicted.length > 0 ? (predicted[0].predictedOrders / 12) : rules.surge.threshold_orders_per_hour;

        // Surge triggers if current demand is 30% higher than threshold OR predicted avg
        const dynamicThreshold = Math.max(rules.surge.threshold_orders_per_hour, avgPredictedPerHour * 1.3);

        return currentOrders >= dynamicThreshold;
    }

    static isHappyHour(rules: PricingRules): boolean {
        if (!rules.happy_hour.enabled) return false;

        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        return currentTime >= rules.happy_hour.start_time && currentTime <= rules.happy_hour.end_time;
    }

    static async calculateDeliveryFee(tenantId: string, baseFeeCents: number): Promise<{ finalFeeCents: number, isSurge: boolean }> {
        const rules = await this.getRules(tenantId);
        const isSurge = await this.isPeakDemand(tenantId, rules);

        if (isSurge) {
            const finalFee = Math.round(baseFeeCents * rules.surge.fee_multiplier);
            const yieldAmount = finalFee - baseFeeCents;
            if (yieldAmount > 0) {
                await this.trackYield(tenantId, yieldAmount);
            }
            return { finalFeeCents: finalFee, isSurge: true };
        }

        return { finalFeeCents: baseFeeCents, isSurge: false };
    }

    static async calculateItemPrice(tenantId: string, item: { price_cents: number, category: string | null }): Promise<{ finalPriceCents: number, isHappyHour: boolean }> {
        const rules = await this.getRules(tenantId);
        const isHH = this.isHappyHour(rules);

        if (isHH && (rules.happy_hour.categories.length === 0 || (item.category && rules.happy_hour.categories.includes(item.category)))) {
            const discount = Math.round(item.price_cents * (rules.happy_hour.discount_percentage / 100));
            return { finalPriceCents: item.price_cents - discount, isHappyHour: true };
        }

        return { finalPriceCents: item.price_cents, isHappyHour: false };
    }

    private static async trackYield(tenantId: string, amountCents: number) {
        const db = await getDb();
        await db.run('UPDATE restaurants SET yield_balance_cents = yield_balance_cents + ? WHERE id = ?', [amountCents, tenantId]);
    }
}
