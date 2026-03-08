import { MenuItem, menuRepo } from '../../db/repositories/menu.repo';
import { getDb } from '../../db/db.client';

export class MenuCacheService {
    // Basic in-memory cache structure: Record<tenantId, { data: any, timestamp: number }>
    private cache: Record<string, { menu: MenuItem[]; timestamp: number }> = {};
    private TTL_MS = 1000 * 60 * 5; // 5 minutos de cache padrão

    async getMenu(tenantId: string, availableOnly: boolean = true): Promise<MenuItem[]> {
        const now = Date.now();
        const cacheKey = `${tenantId}_${availableOnly ? 'avail' : 'all'}`;

        // Retorna do Cache se hit e não expirado
        if (this.cache[cacheKey] && (now - this.cache[cacheKey].timestamp < this.TTL_MS)) {
            console.log(`[Cache Hit] Menu for tenant: ${tenantId}`);
            return this.cache[cacheKey].menu;
        }

        console.log(`[Cache Miss] Loading menu for tenant: ${tenantId}`);
        // Refresh Cache from DB
        const menu = await menuRepo.listMenu(tenantId, availableOnly);

        // Tratar dados completos (Categorias com Itens e Opcionais) - igual o app faz
        // Na verdade, listMenu já traz a lista basica. Pra agilizar, vamos encorpar:
        // Mas a rota list normal já basta pro frontend por hora (que busca getMenuItem pros deets).

        this.cache[cacheKey] = {
            menu,
            timestamp: now
        };

        return menu;
    }

    async getCategories(tenantId: string): Promise<string[]> {
        const cacheKey = `${tenantId}_categories`;
        const now = Date.now();

        if (this.cache[cacheKey] && (now - this.cache[cacheKey].timestamp < this.TTL_MS)) {
            return this.cache[cacheKey].menu as any;
        }

        const db = await getDb();
        const cats = await db.all(
            `SELECT DISTINCT category FROM menu_items WHERE restaurant_id = ? AND available = 1 AND hidden != 1 AND category IS NOT NULL ORDER BY MIN(sort_order) ASC`,
            [tenantId]
        );
        const catMap = cats.map((c: any) => c.category);

        this.cache[cacheKey] = {
            menu: catMap as any,
            timestamp: now
        };

        return catMap;
    }

    // Invalida o cache quando algo muda
    invalidate(tenantId: string) {
        console.log(`[Cache Invalidate] Purging cache for tenant: ${tenantId}`);
        delete this.cache[`${tenantId}_avail`];
        delete this.cache[`${tenantId}_all`];
        delete this.cache[`${tenantId}_categories`];
    }
}

export const menuCacheService = new MenuCacheService();
