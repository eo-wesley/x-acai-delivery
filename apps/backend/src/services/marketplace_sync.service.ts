import { eventBus } from '../core/eventBus';
import { getDb } from '../db/db.client';

export class MarketplaceSyncService {
    async initialize() {
        console.log('[MarketplaceSync] Initializing auto-sync service...');

        eventBus.on('inventory_depleted', async (payload: { restaurantId: string; itemId: string; itemName: string }) => {
            try {
                await this.handleInventoryDepleted(payload.restaurantId, payload.itemId, payload.itemName);
            } catch (err: any) {
                console.error(`[MarketplaceSync] Error handling depletion for ${payload.itemId}:`, err.message);
            }
        });
    }

    private async handleInventoryDepleted(restaurantId: string, itemId: string, itemName: string) {
        const db = await getDb();

        // 1. Encontrar itens do menu que dependem deste insumo (via receitas)
        const dependentMenuItems = await db.all(`
            SELECT DISTINCT m.id, m.name
            FROM menu_items m
            JOIN recipes r ON m.id = r.menu_item_id
            JOIN recipe_items ri ON r.id = ri.recipe_id
            WHERE ri.inventory_item_id = ? AND m.restaurant_id = ?
        `, [itemId, restaurantId]);

        if (dependentMenuItems.length === 0) {
            console.log(`[MarketplaceSync] No menu items affected by depletion of ${itemName}`);
            return;
        }

        console.log(`[MarketplaceSync] ${itemName} depleted. Affects: ${dependentMenuItems.map(m => m.name).join(', ')}`);

        for (const menuItem of dependentMenuItems) {
            // 2. Encontrar mapeamentos para marketplaces (iFood, Rappi, etc)
            const mappings = await db.all(`
                SELECT platform, external_id
                FROM product_mappings
                WHERE internal_id = ? AND restaurant_id = ?
            `, [menuItem.id, restaurantId]);

            for (const mapping of mappings) {
                await this.pauseItemInMarketplace(restaurantId, mapping.platform, mapping.external_id, menuItem.name, itemName);
            }

            // 3. Opcional: Marcar como indisponível internamente também
            await db.run(`UPDATE menu_items SET available = 0 WHERE id = ?`, [menuItem.id]);
        }
    }

    private async pauseItemInMarketplace(restaurantId: string, platform: string, externalId: string, itemName: string, reason: string) {
        // Simulação de chamada de API externa
        console.log(`[MarketplaceSync] [${platform.toUpperCase()}] PAUSING item "${itemName}" (ID: ${externalId}) due to depletion of "${reason}"`);

        // Log da ação para o Admin ver depois
        const db = await getDb();
        await db.run(`
            INSERT INTO marketplace_logs (id, restaurant_id, platform, action, details)
            VALUES (?, ?, ?, ?, ?)
        `, [
            crypto.randomUUID(),
            restaurantId,
            platform,
            'PAUSE_ITEM',
            `Item "${itemName}" pausado automaticamente porque "${reason}" acabou no estoque.`
        ]);

        // Aqui entraria a integração real com iFood API
        // await ifoodClient.pauseItem(externalId);
    }
}

export const marketplaceSyncService = new MarketplaceSyncService();
