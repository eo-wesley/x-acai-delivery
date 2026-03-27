import { getDb } from './src/db/db.client';

async function main() {
  const db = await getDb();
  
  // Simulate what admin.router.ts does for GET /admin/orders
  const tenantId = 'default_tenant';
  
  const query = `SELECT o.*,
      COALESCE(c.name, o.customer_name) as resolved_customer_name,
      COALESCE(c.phone, o.customer_phone) as resolved_customer_phone
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.restaurant_id = ? ORDER BY o.created_at DESC LIMIT 5`;
  const orders = await db.all(query, [tenantId]);

  // Pre-fetch all menu item names
  const menuItems = await db.all('SELECT id, name FROM menu_items WHERE restaurant_id = ?', [tenantId]);
  const menuNameMap: Record<string, string> = {};
  for (const mi of menuItems) { menuNameMap[mi.id] = mi.name; }

  const parsedOrders = orders.map((o: any) => {
    const items = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
    const enrichedItems = (items || []).map((item: any) => ({
      ...item,
      name: item.name || menuNameMap[item.menuItemId] || 'Item removido',
    }));
    return {
      ...o,
      customer_name: o.resolved_customer_name || o.customer_name || null,
      customer_phone: o.resolved_customer_phone || o.customer_phone || null,
      items: enrichedItems,
    };
  });

  // Print the key fields
  for (const order of parsedOrders) {
    console.log('---');
    console.log('Order ID:', order.id.substring(0, 8));
    console.log('customer_name:', order.customer_name);
    console.log('customer_phone:', order.customer_phone);
    console.log('Items:');
    for (const item of order.items) {
      console.log(`  - ${item.qty}x ${item.name} (menuItemId: ${item.menuItemId})`);
    }
  }
  
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
