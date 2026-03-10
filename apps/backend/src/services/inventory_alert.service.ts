import { getDb } from '../db/db.client';
import { inventoryRepo } from '../db/repositories/inventory.repo';
import { forecastingService } from './forecasting.service';
import { EvolutionWhatsAppProvider } from '../notifications/providers/evolution.provider';

/**
 * InventoryAlertService
 * Autonomous service to monitor stock levels and trigger alerts.
 */
export class InventoryAlertService {
    private static interval: NodeJS.Timeout | null = null;
    private static waProvider = new EvolutionWhatsAppProvider();

    static start(checkIntervalMs = 1000 * 60 * 60 * 4) { // Default: Every 4 hours for AI alerts
        if (this.interval) return;

        console.log('🚀 Inventory Alert Service (AI-Powered) started.');
        this.interval = setInterval(() => this.checkAllResturants(), checkIntervalMs);

        // Initial check
        this.checkAllResturants();
    }

    private static async checkAllResturants() {
        try {
            const db = await getDb();
            const restaurants = await db.all('SELECT id, name FROM restaurants WHERE status = "active"');

            for (const rest of restaurants) {
                // Combine traditional min-stock alerts with AI predictive alerts
                const minStockAlerts = await inventoryRepo.getAlerts(rest.id);
                const aiAlerts = await forecastingService.getSmartStockAlerts(rest.id);

                if (minStockAlerts.length > 0 || aiAlerts.length > 0) {
                    this.triggerAlert(rest, minStockAlerts, aiAlerts);
                }
            }
        } catch (err) {
            console.error('Error in InventoryAlertService:', err);
        }
    }

    private static async triggerAlert(restaurant: any, minStockItems: any[], aiItems: any[]) {
        const itemNames = [
            ...minStockItems.map(i => `⚠️ ${i.name} (Abaixo do mínimo: ${i.current_qty}${i.unit})`),
            ...aiItems.map(i => `🔮 ${i.name} (Ruptura em ${i.daysRemaining} dias)`)
        ].join('\n');

        console.log(`⚠️ ALERT [${restaurant.name}]:\n${itemNames}`);

        if (this.waProvider.isConfigured()) {
            const message = `*🚨 Alerta de Estoque Inteligente - ${restaurant.name}*\n\nIdentificamos itens que precisam de atenção:\n\n${itemNames}\n\nAcesse o Dashboard de BI para ver detalhes e repor o estoque. 🍇`;

            // Assume we send to a default admin number or the restaurant's configured number
            // For now, using a placeholder logic that would fetch the admin number if needed
            // The EvolutionProvider.send method already handles restaurant-specific config if payload.restaurantId is provided
            await this.waProvider.send({
                orderId: 'STOCK_ALERT',
                customerPhone: process.env.WHATSAPP_ADMIN_NUMBER || '5511999999999', // Placeholder / Env variable
                event: 'stock_alert',
                restaurantId: restaurant.id,
                restaurantName: restaurant.name,
                extra: { body: message }
            });
        }
    }

    static stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
}
