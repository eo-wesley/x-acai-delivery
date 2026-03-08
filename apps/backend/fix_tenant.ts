
import { getDb } from './src/db/db.client';

async function fixTenant() {
    const db = await getDb();
    const rows = await db.all('SELECT id FROM restaurants');
    if (rows.length > 0) {
        const id = rows[0].id;
        console.log(`Updating restaurant ${id} to default_tenant/default slug`);
        await db.run('UPDATE restaurants SET id = ?, slug = ? WHERE id = ?', ['default_tenant', 'default', id]);

        // Also need to update foreign keys if any?
        // menu_items, orders, etc.
        await db.run('UPDATE menu_items SET restaurant_id = ? WHERE restaurant_id = ?', ['default_tenant', id]);
        await db.run('UPDATE orders SET restaurant_id = ? WHERE restaurant_id = ?', ['default_tenant', id]);
        await db.run('UPDATE option_groups SET restaurant_id = ? WHERE restaurant_id = ?', ['default_tenant', id]);
        await db.run('UPDATE option_items SET restaurant_id = ? WHERE restaurant_id = ?', ['default_tenant', id]);
    } else {
        console.log('No restaurants found to update.');
    }
    process.exit(0);
}
fixTenant();
