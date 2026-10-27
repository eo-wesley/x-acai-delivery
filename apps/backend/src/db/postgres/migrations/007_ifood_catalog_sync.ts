import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { Migration } from '../migrator';

type CatalogOption = {
    name: string;
    price_cents: number;
    sort_order?: number;
    available?: boolean;
};

type CatalogGroup = {
    name: string;
    min_select: number;
    max_select: number;
    required?: boolean;
    sort_order?: number;
    options: CatalogOption[];
};

type CatalogItem = {
    name: string;
    description?: string | null;
    price_cents: number;
    image_url?: string | null;
    available?: boolean;
    category?: string | null;
    sort_order?: number;
    option_groups?: CatalogGroup[];
};

function readCatalog(): CatalogItem[] {
    const catalogPath = path.resolve(process.cwd(), 'ifood-normalized-augmented.json');
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8')) as unknown;
    if (!Array.isArray(catalog) || catalog.length !== 28) {
        throw new Error(`Catálogo iFood inválido: esperado 28 itens em ${catalogPath}`);
    }
    return catalog as CatalogItem[];
}

export const ifoodCatalogSyncMigration: Migration = {
    version: '007',
    name: 'sync_catalog_from_ifood_snapshot',
    async up(db) {
        const catalog = readCatalog();

        for (let itemIndex = 0; itemIndex < catalog.length; itemIndex += 1) {
            const item = catalog[itemIndex];
            const existing = await db.get<{ id: string }>(
                'SELECT id FROM menu_items WHERE restaurant_id = ? AND name = ?',
                ['default_tenant', item.name],
            );
            const itemId = existing?.id || `ifood-${itemIndex + 1}`;

            await db.run(
                `INSERT INTO menu_items (
                    id, restaurant_id, name, description, price_cents, category,
                    tags, available, image_url, out_of_stock, hidden, sort_order
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    description = EXCLUDED.description,
                    price_cents = EXCLUDED.price_cents,
                    category = EXCLUDED.category,
                    available = EXCLUDED.available,
                    image_url = EXCLUDED.image_url,
                    sort_order = EXCLUDED.sort_order`,
                [
                    itemId,
                    'default_tenant',
                    item.name,
                    item.description || null,
                    item.price_cents,
                    item.category || null,
                    '[]',
                    item.available === false ? 0 : 1,
                    item.image_url || null,
                    0,
                    0,
                    item.sort_order ?? itemIndex,
                ],
            );

            await db.run(
                'DELETE FROM option_items WHERE option_group_id IN (SELECT id FROM option_groups WHERE menu_item_id = ?)',
                [itemId],
            );
            await db.run('DELETE FROM option_groups WHERE menu_item_id = ?', [itemId]);

            for (const [groupIndex, group] of (item.option_groups || []).entries()) {
                const groupId = crypto.randomUUID();
                await db.run(
                    `INSERT INTO option_groups (
                        id, restaurant_id, menu_item_id, name, required,
                        min_select, max_select, sort_order
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        groupId,
                        'default_tenant',
                        itemId,
                        group.name,
                        group.required ? 1 : 0,
                        group.min_select ?? 0,
                        group.max_select ?? 0,
                        group.sort_order ?? groupIndex,
                    ],
                );

                for (const [optionIndex, option] of (group.options || []).entries()) {
                    await db.run(
                        `INSERT INTO option_items (
                            id, restaurant_id, option_group_id,
                            name, price_cents, sort_order, available
                        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [
                            crypto.randomUUID(),
                            'default_tenant',
                            groupId,
                            option.name,
                            option.price_cents,
                            option.sort_order ?? optionIndex,
                            option.available === false ? 0 : 1,
                        ],
                    );
                }
            }
        }
    },
};
