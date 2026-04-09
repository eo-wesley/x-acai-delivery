const fs = require('fs');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const { randomUUID } = require('crypto');
const path = require('path');

async function importDirect() {
    const jsonPath = path.resolve(process.cwd(), '../../tmp/ifood-normalized.json');
    const normalized = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    
    // Caminho do banco SQLite do projeto (veja db.connection.ts: process.env.SQLITE_DB_PATH || 'database.sqlite')
    const dbPath = path.resolve(process.cwd(), 'apps', 'backend', 'database.sqlite');
    // It might be in the root or in apps/backend. Let's try both.
    const actualPath = fs.existsSync(dbPath) ? dbPath : path.resolve(process.cwd(), 'database.sqlite');

    const db = await open({
        filename: actualPath,
        driver: sqlite3.Database
    });

    console.log('[ImportDB] Conectado ao bd: ' + actualPath);
    console.log('[ImportDB] Limpando menu atual (apenas para default_tenant)...');
    
    await db.run('DELETE FROM option_items WHERE restaurant_id = ?', ['default_tenant']);
    await db.run('DELETE FROM option_groups WHERE restaurant_id = ?', ['default_tenant']);
    await db.run('DELETE FROM menu_items WHERE restaurant_id = ?', ['default_tenant']);

    console.log('[ImportDB] Inserindo ' + normalized.length + ' produtos...');

    let itemCount = 0;
    
    for (const item of normalized) {
        const id = randomUUID();
        const tagsJson = JSON.stringify([]);

        await db.run(
            `INSERT INTO menu_items (id, name, description, price_cents, category, available, image_url, sort_order, restaurant_id, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [
                id,
                item.name,
                item.description || null,
                item.price_cents || 0,
                item.category || null,
                item.available ? 1 : 0,
                item.image_url || null,
                item.sort_order ?? 0,
                'default_tenant'
            ]
        );
        itemCount++;
    }

    console.log('[ImportDB] ✅ Importado com sucesso: ' + itemCount + ' itens no banco local.');
}

importDirect().catch(console.error);
