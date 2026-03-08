import { getDb } from '../db.client';
import { randomUUID } from 'crypto';

export interface RecipeItemPayload {
    inventory_item_id: string;
    qty: number;
    unit: string;
}

export class RecipesRepo {
    async createRecipe(restaurantId: string, menuItemId: string, name?: string): Promise<string> {
        const db = await getDb();
        const existing = await db.get(`SELECT id FROM recipes WHERE restaurant_id = ? AND menu_item_id = ?`, [restaurantId, menuItemId]);
        if (existing) return existing.id;

        const id = randomUUID();
        await db.run(
            `INSERT INTO recipes (id, restaurant_id, menu_item_id, name) VALUES (?, ?, ?, ?)`,
            [id, restaurantId, menuItemId, name || null]
        );
        return id;
    }

    async upsertRecipeItems(restaurantId: string, recipeId: string, items: RecipeItemPayload[]): Promise<void> {
        const db = await getDb();

        // Remove existing to replace (simple overwrite pattern for BOM)
        await db.run(`DELETE FROM recipe_items WHERE recipe_id = ? AND restaurant_id = ?`, [recipeId, restaurantId]);

        for (const item of items) {
            const itemId = randomUUID();
            await db.run(
                `INSERT INTO recipe_items (id, restaurant_id, recipe_id, inventory_item_id, qty, unit)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [itemId, restaurantId, recipeId, item.inventory_item_id, item.qty, item.unit]
            );
        }
    }

    async getRecipeForMenuItem(restaurantId: string, menuItemId: string): Promise<any> {
        const db = await getDb();
        const recipe = await db.get(`SELECT * FROM recipes WHERE restaurant_id = ? AND menu_item_id = ?`, [restaurantId, menuItemId]);
        if (!recipe) return null;

        const items = await db.all(
            `SELECT ri.*, i.name as inventory_name 
             FROM recipe_items ri
             JOIN inventory_items i ON ri.inventory_item_id = i.id
             WHERE ri.recipe_id = ? AND ri.restaurant_id = ?`,
            [recipe.id, restaurantId]
        );

        return { ...recipe, items };
    }

    async listRecipes(restaurantId: string): Promise<any[]> {
        const db = await getDb();
        // Return a summary of all menu items and their recipes
        const recipes = await db.all(
            `SELECT m.id as menu_item_id, m.name as menu_name, r.id as recipe_id, r.name as recipe_name
             FROM menu_items m
             LEFT JOIN recipes r ON r.menu_item_id = m.id AND r.restaurant_id = m.restaurant_id
             WHERE m.restaurant_id = ? AND m.available = 1`,
            [restaurantId]
        );
        return recipes;
    }
}

export const recipesRepo = new RecipesRepo();
