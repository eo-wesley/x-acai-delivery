import { getDb } from '../db/db.client';
import { randomUUID } from 'crypto';

export class SaaSOnboardingService {
    static async createRestaurant(data: { name: string; slug: string; phone: string; email: string }) {
        const db = await getDb();
        const id = randomUUID();

        await db.run(
            `INSERT INTO restaurants (id, name, slug, phone, email, mode, subscription_plan, subscription_status, onboarding_step, primary_color) 
             VALUES (?, ?, ?, ?, ?, 'saas', 'starter', 'active', 1, ?)`,
            [id, data.name, data.slug, data.phone, data.email, '#7c3aed']
        );

        // Inicializar configurações básicas do restaurante
        await db.run(
            `INSERT INTO restaurant_settings (id, restaurant_id, key, value) VALUES (?, ?, ?, ?)`,
            [randomUUID(), id, 'theme_color', '#ff0000']
        );

        return { id, slug: data.slug };
    }

    static async updateOnboardingStep(restaurantId: string, step: number) {
        const db = await getDb();
        await db.run(
            `UPDATE restaurants SET onboarding_step = ? WHERE id = ?`,
            [step, restaurantId]
        );
    }

    static async applyMenuTemplate(restaurantId: string, template: 'acai' | 'pizza' | 'burger') {
        try {
            const db = await getDb();
            const templates = {
                acai: [
                    {
                        category: 'Açaí na Tigela', items: [
                            { name: 'Açaí Tradicional 500ml', price: 1800, description: 'Açaí puro batido com guaraná.' },
                            { name: 'Açaí com Morango 500ml', price: 2200, description: 'Açaí batido com morangos frescos.' }
                        ]
                    },
                    {
                        category: 'Bebidas', items: [
                            { name: 'Suco de Laranja 400ml', price: 1200, description: 'Suco natural feito na hora.' },
                            { name: 'Água Mineral 500ml', price: 500, description: 'Sem gás.' }
                        ]
                    }
                ],
                pizza: [
                    {
                        category: 'Pizzas Salgadas', items: [
                            { name: 'Calabresa G', price: 4500, description: 'Calabresa acompanhada de cebolas.' },
                            { name: 'Mussarela G', price: 4000, description: 'Queijo mussarela premium.' }
                        ]
                    }
                ],
                burger: [
                    {
                        category: 'Hambúrgueres', items: [
                            { name: 'X-Burger Klasikos', price: 2500, description: 'Pão, carne 150g e queijo.' },
                            { name: 'X-Bacon Bravo', price: 3200, description: 'Pão, carne, muito bacon e queijo.' }
                        ]
                    }
                ]
            };

            const data = templates[template] || templates.acai;

            for (const cat of data) {
                for (const item of cat.items) {
                    await db.run(
                        `INSERT INTO menu_items (id, restaurant_id, name, description, price_cents, category, available) 
                         VALUES (?, ?, ?, ?, ?, ?, 1)`,
                        [randomUUID(), restaurantId, item.name, item.description, item.price, cat.category]
                    );
                }
            }

            // Marcar onboarding como avançado
            await this.updateOnboardingStep(restaurantId, 2);
        } catch (error) {
            console.error('CRITICAL: applyMenuTemplate failed:', error);
            throw error;
        }
    }
}
