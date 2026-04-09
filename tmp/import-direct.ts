import fs from 'fs';
import path from 'path';
import { getDb } from '../apps/backend/src/db/db.client';
import { randomUUID } from 'crypto';

async function importDirect() {
    const normalized = JSON.parse(fs.readFileSync(path.join(__dirname, 'ifood-normalized-augmented.json'), 'utf8'));
    const db = await getDb();

    console.log(`[ImportDB] Limpando menu atual (apenas para default_tenant)...`);
    await db.run('DELETE FROM option_items WHERE restaurant_id = ?', ['default_tenant']);
    await db.run('DELETE FROM option_groups WHERE restaurant_id = ?', ['default_tenant']);
    await db.run('DELETE FROM menu_items WHERE restaurant_id = ?', ['default_tenant']);

    console.log(`[ImportDB] Inserindo ${normalized.length} produtos...`);

    let itemCount = 0;
    for (const item of normalized) {
        const id = randomUUID();
        const tagsJson = JSON.stringify([]);

        await db.run(
            `INSERT INTO menu_items (id, name, description, price_cents, category, tags, available, image_url, sort_order, restaurant_id, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [
                id,
                item.name,
                item.description || null,
                item.price_cents || 0,
                item.category || null,
                tagsJson,
                item.available ? 1 : 0,
                item.image_url || null,
                item.sort_order ?? 0,
                'default_tenant'
            ]
        );

        if (item.option_groups && Array.isArray(item.option_groups)) {
            for (const group of item.option_groups) {
                const groupId = randomUUID();
                await db.run(
                    `INSERT INTO option_groups (id, menu_item_id, name, min_select, max_select, required, sort_order, restaurant_id, created_at) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                    [
                        groupId, 
                        id, 
                        group.name, 
                        group.min_select || 0, 
                        group.max_select || 1, 
                        group.required ? 1 : 0, 
                        group.sort_order || 0,
                        'default_tenant'
                    ]
                );

                if (group.options && Array.isArray(group.options)) {
                    for (const opt of group.options) {
                        const optId = randomUUID();
                        await db.run(
                            `INSERT INTO option_items (id, option_group_id, name, price_cents, available, sort_order, restaurant_id, created_at) 
                             VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                            [
                                optId,
                                groupId,
                                opt.name,
                                opt.price_cents || 0,
                                opt.available !== false ? 1 : 0,
                                opt.sort_order || 0,
                                'default_tenant'
                            ]
                        );
                    }
                }
            }
        }
        itemCount++;
    }

    console.log(`[ImportDB] ✅ Importado com sucesso: ${itemCount} itens no banco local.`);
}

importDirect().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
