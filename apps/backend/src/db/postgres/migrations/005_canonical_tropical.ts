import type { Migration } from '../migrator';

export const canonicalTropicalMigration: Migration = {
    version: '005',
    name: 'canonical_tropical_menu_item',
    async up(db) {
        await db.run(`
            INSERT INTO menu_items (
                id, restaurant_id, name, description, price_cents, category,
                tags, available, image_url, out_of_stock, hidden, sort_order
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                category = EXCLUDED.category,
                available = EXCLUDED.available,
                image_url = EXCLUDED.image_url,
                out_of_stock = EXCLUDED.out_of_stock,
                hidden = EXCLUDED.hidden
        `, [
            '291c81bc-e2e7-4457-ae2f-87f610819cab',
            'default_tenant',
            'Açaí X-Tropical',
            'Este produto não permite substituir os ingredientes da receita ou enviá-los separados.\n\nAçaí em camadas com Creme de Avelã, Leite em Pó, Leite Condensado e Morango. Escolha o tamanho do copo e, se quiser, acrescente os extras disponíveis abaixo.',
            1690,
            'Açaí Copos da Promoção',
            '[]',
            1,
            'https://static.ifood-static.com.br/image/upload/t_high/pratos/79f3b413-0d12-4d26-a46c-42f65af3759b/202405302150_57RF_i.jpg',
            0,
            0,
            6,
        ]);
    },
};
